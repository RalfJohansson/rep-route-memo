import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { CheckCircle2, Clock, MapPin, TrendingUp, Smile } from "lucide-react";
import { format, startOfWeek, endOfWeek, addDays } from "date-fns";
import { sv } from "date-fns/locale";
import WorkoutDetailDialog from "@/components/WorkoutDetailDialog";
import heroImage from "@/assets/hero-running.jpg";

interface ScheduledWorkout {
  id: string;
  completed: boolean;
  trained_time: number | null;
  distance: number | null;
  pace: string | null;
  notes: string | null;
  joy_rating: number | null;
  scheduled_date: string;
  workout_library: {
    name: string;
    category: string;
    duration: string | null;
    effort: number;
    description: string | null;
    pace?: string | null;
  };
}

const Home = () => {
  const [workouts, setWorkouts] = useState<ScheduledWorkout[]>([]);
  const [selectedWorkout, setSelectedWorkout] = useState<ScheduledWorkout | null>(null);
  const [viewingWorkout, setViewingWorkout] = useState<ScheduledWorkout | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    completed: 0,
    totalTime: 0,
    totalDistance: 0,
  });

  // Form state
  const [trainedTime, setTrainedTime] = useState("");
  const [distance, setDistance] = useState("");
  const [calculatedPace, setCalculatedPace] = useState("");
  const [notes, setNotes] = useState("");
  const [joyRating, setJoyRating] = useState(3);

  // Calculate pace when time or distance changes
  useEffect(() => {
    if (trainedTime && distance) {
      const time = parseFloat(trainedTime);
      const dist = parseFloat(distance);
      if (time > 0 && dist > 0) {
        const totalSeconds = time * 60;
        const secondsPerKm = totalSeconds / dist;
        let minutes = Math.floor(secondsPerKm / 60);
        let seconds = Math.floor(secondsPerKm % 60);
        
        // Handle edge case where seconds might be 60
        if (seconds >= 60) {
          minutes += 1;
          seconds = 0;
        }
        
        setCalculatedPace(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      } else {
        setCalculatedPace("");
      }
    } else {
      setCalculatedPace("");
    }
  }, [trainedTime, distance]);

  useEffect(() => {
    fetchWeekWorkouts();
  }, []);

  const fetchWeekWorkouts = async () => {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) return;

      const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
      const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });

      const { data, error } = await supabase
        .from("scheduled_workouts")
        .select(`
          *,
          workout_library (
            name,
            category,
            duration,
            effort,
            description,
            pace
          )
        `)
        .eq("user_id", user.id)
        .gte("scheduled_date", format(weekStart, "yyyy-MM-dd"))
        .lte("scheduled_date", format(weekEnd, "yyyy-MM-dd"))
        .order("scheduled_date");

      if (error) throw error;

      setWorkouts(data || []);
      
      // Calculate stats
      const completed = data?.filter(w => w.completed).length || 0;
      const totalTime = data?.reduce((sum, w) => sum + (w.trained_time || 0), 0) || 0;
      const totalDistance = data?.reduce((sum, w) => sum + (Number(w.distance) || 0), 0) || 0;
      
      setStats({ completed, totalTime, totalDistance });
    } catch (error: any) {
      toast.error("Kunde inte hämta pass");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleComplete = async (workout: ScheduledWorkout) => {
    if (!workout.completed) {
      setSelectedWorkout(workout);
      setTrainedTime("");
      setDistance("");
      setCalculatedPace("");
      setNotes("");
      setJoyRating(3);
    } else {
      // Uncheck - clear data
      const { error } = await supabase
        .from("scheduled_workouts")
        .update({
          completed: false,
          trained_time: null,
          distance: null,
          pace: null,
          notes: null,
          joy_rating: null,
        })
        .eq("id", workout.id);

      if (error) {
        toast.error("Kunde inte uppdatera");
      } else {
        toast.success("Pass omarkerat");
        fetchWeekWorkouts();
      }
    }
  };

  const handleSubmitWorkout = async () => {
    if (!selectedWorkout) return;

    const { error } = await supabase
      .from("scheduled_workouts")
      .update({
        completed: true,
        trained_time: trainedTime ? parseInt(trainedTime) : null,
        distance: distance ? parseFloat(distance) : null,
        pace: calculatedPace ? `${calculatedPace} min/km` : null,
        notes: notes || null,
        joy_rating: joyRating,
      })
      .eq("id", selectedWorkout.id);

    if (error) {
      toast.error("Kunde inte spara");
    } else {
      toast.success("Pass markerat som genomfört!");
      setSelectedWorkout(null);
      fetchWeekWorkouts();
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      'intervallpass': '#BF5E42',
      'distanspass': '#468771',
      'långpass': '#7AA6DB',
      'styrka': '#4E7C8C',
      'tävling': '#000000',
    };
    return colors[category.toLowerCase()] || '#BF5E42';
  };

  const getJoyColor = (rating: number) => {
    if (rating === 1) return '#FF0000';
    if (rating === 2) return '#FF9900';
    return '#00A000'; // 3-5
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <div className="relative rounded-2xl p-6 text-white shadow-md overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
        <div className="absolute inset-0 bg-[#d4c4b0]/70" />
        <div className="relative z-10">
          <h1 className="text-2xl font-bold mb-2">Denna vecka</h1>
          <p className="text-white/90">
            {format(startOfWeek(new Date(), { weekStartsOn: 1 }), "d MMM", { locale: sv })} -{" "}
            {format(endOfWeek(new Date(), { weekStartsOn: 1 }), "d MMM", { locale: sv })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-2 pb-2 text-center">
            <CheckCircle2 className="h-5 w-5 mx-auto mb-1 text-accent" />
            <p className="text-xl font-bold">{stats.completed}</p>
            <p className="text-xs text-muted-foreground">Genomförda</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-2 pb-2 text-center">
            <Clock className="h-5 w-5 mx-auto mb-1 text-primary" />
            <p className="text-xl font-bold">{stats.totalTime}</p>
            <p className="text-xs text-muted-foreground">Minuter</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-2 pb-2 text-center">
            <MapPin className="h-5 w-5 mx-auto mb-1 text-secondary" />
            <p className="text-xl font-bold">{stats.totalDistance.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">Km</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Veckans pass</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 7 }, (_, i) => {
            const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
            const currentDay = addDays(weekStart, i);
            const dateStr = format(currentDay, "yyyy-MM-dd");
            const dayWorkouts = workouts.filter(w => w.scheduled_date === dateStr);
            
            return (
              <div key={dateStr} className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">
                  {format(currentDay, "EEEE d MMM", { locale: sv })}
                </h3>
                {dayWorkouts.length === 0 ? (
                  <div className="rounded-lg border bg-card p-3">
                    <p className="text-sm text-muted-foreground text-center">Vila</p>
                  </div>
                ) : (
                  dayWorkouts.map((workout) => (
                    <div
                      key={workout.id}
                      className="flex items-center gap-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors cursor-pointer overflow-hidden min-h-[52px]"
                      onClick={(e) => {
                        if ((e.target as HTMLElement).closest('button')) return;
                        setViewingWorkout(workout);
                      }}
                    >
                      <div 
                        className="w-6 flex items-center justify-center text-white font-medium flex-shrink-0 self-stretch outline-none"
                        style={{ backgroundColor: getCategoryColor(workout.workout_library.category) }}
                      >
                        <span className="writing-mode-vertical-rl rotate-180 text-[8px]">
                          {workout.workout_library.category === 'intervallpass' ? 'Intervall' : 
                           workout.workout_library.category === 'distanspass' ? 'Distans' : 
                           workout.workout_library.category === 'långpass' ? 'Långpass' : 
                           workout.workout_library.category === 'styrka' ? 'Styrka' : 
                           workout.workout_library.category === 'tävling' ? 'Tävling' :
                           workout.workout_library.category}
                        </span>
                      </div>
                      <Checkbox
                        checked={workout.completed}
                        onCheckedChange={() => handleToggleComplete(workout)}
                        className="h-5 w-5"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1 py-3">
                        <p className="font-medium">{workout.workout_library.name}</p>
                      </div>
                      {workout.completed && workout.joy_rating && (
                        <div className="flex items-center pr-3">
                          <Smile 
                            className="h-5 w-5" 
                            style={{ color: getJoyColor(workout.joy_rating) }}
                          />
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Dialog open={!!selectedWorkout} onOpenChange={(open) => !open && setSelectedWorkout(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Markera pass som genomfört</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="trainedTime">Tränad tid (minuter)</Label>
              <Input
                id="trainedTime"
                type="number"
                value={trainedTime}
                onChange={(e) => setTrainedTime(e.target.value)}
                placeholder="45"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="distance">Distans (km)</Label>
              <Input
                id="distance"
                type="number"
                step="0.1"
                value={distance}
                onChange={(e) => setDistance(e.target.value)}
                placeholder="10.5"
              />
            </div>
            {calculatedPace && (
              <div className="space-y-2">
                <Label>Tempo</Label>
                <div className="px-3 py-2 rounded-md bg-muted text-sm">
                  {calculatedPace} min/km
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="notes">Anteckningar</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Hur kändes passet?"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Hur mycket glädje? (1-5)</Label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <Button
                    key={rating}
                    type="button"
                    variant={joyRating === rating ? "default" : "outline"}
                    size="sm"
                    onClick={() => setJoyRating(rating)}
                    className="flex-1"
                  >
                    {rating}
                  </Button>
                ))}
              </div>
            </div>
            <Button onClick={handleSubmitWorkout} className="w-full">
              Spara
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <WorkoutDetailDialog
        workout={viewingWorkout ? {
          name: viewingWorkout.workout_library.name,
          duration: viewingWorkout.workout_library.duration,
          effort: viewingWorkout.workout_library.effort,
          description: viewingWorkout.workout_library.description,
          category: viewingWorkout.workout_library.category,
          pace: viewingWorkout.workout_library.pace,
          completed: viewingWorkout.completed,
          trained_time: viewingWorkout.trained_time,
          distance: viewingWorkout.distance,
          actual_pace: viewingWorkout.pace,
          notes: viewingWorkout.notes,
          joy_rating: viewingWorkout.joy_rating,
        } : null}
        open={!!viewingWorkout}
        onOpenChange={(open) => !open && setViewingWorkout(null)}
      />
    </div>
  );
};

export default Home;