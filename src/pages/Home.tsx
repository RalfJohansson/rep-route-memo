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
import { format, startOfWeek, endOfWeek } from "date-fns";
import { sv } from "date-fns/locale";

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
    duration: number | null;
    effort: number;
    description: string | null;
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
  const [pace, setPace] = useState("");
  const [notes, setNotes] = useState("");
  const [joyRating, setJoyRating] = useState(3);

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
            description
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
      setPace("");
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
        pace: pace || null,
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

  const getEffortColor = (effort: number) => {
    if (effort <= 3) return "hsl(var(--chart-2))"; // Green
    if (effort <= 5) return "hsl(var(--chart-3))"; // Yellow-green
    if (effort <= 7) return "hsl(var(--chart-4))"; // Orange
    return "hsl(var(--chart-5))"; // Red
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
      <div className="bg-gradient-to-br from-primary to-secondary rounded-2xl p-6 text-white shadow-md">
        <h1 className="text-2xl font-bold mb-2">Denna vecka</h1>
        <p className="text-white/90">
          {format(startOfWeek(new Date(), { weekStartsOn: 1 }), "d MMM", { locale: sv })} -{" "}
          {format(endOfWeek(new Date(), { weekStartsOn: 1 }), "d MMM", { locale: sv })}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4 text-center">
            <CheckCircle2 className="h-6 w-6 mx-auto mb-2 text-accent" />
            <p className="text-2xl font-bold">{stats.completed}</p>
            <p className="text-xs text-muted-foreground">Genomförda</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <Clock className="h-6 w-6 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{stats.totalTime}</p>
            <p className="text-xs text-muted-foreground">Minuter</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <MapPin className="h-6 w-6 mx-auto mb-2 text-secondary" />
            <p className="text-2xl font-bold">{stats.totalDistance.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">Km</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Veckans pass</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {workouts.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              Inga pass schemalagda denna vecka
            </p>
          ) : (
            workouts.map((workout) => (
              <div
                key={workout.id}
                className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors cursor-pointer"
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest('button')) return;
                  setViewingWorkout(workout);
                }}
              >
                <Checkbox
                  checked={workout.completed}
                  onCheckedChange={() => handleToggleComplete(workout)}
                  className="h-5 w-5"
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{workout.workout_library.name}</p>
                    <div 
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: getEffortColor(workout.workout_library.effort) }}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(workout.scheduled_date), "EEEE d MMM", { locale: sv })}
                  </p>
                </div>
                {workout.completed && workout.joy_rating && (
                  <div className="flex items-center gap-1">
                    <Smile className="h-4 w-4 text-accent" />
                    <span className="text-sm">{workout.joy_rating}</span>
                  </div>
                )}
              </div>
            ))
          )}
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
            <div className="space-y-2">
              <Label htmlFor="pace">Tempo (t.ex. 5:30/km)</Label>
              <Input
                id="pace"
                value={pace}
                onChange={(e) => setPace(e.target.value)}
                placeholder="5:30/km"
              />
            </div>
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

      <Dialog open={!!viewingWorkout} onOpenChange={(open) => !open && setViewingWorkout(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{viewingWorkout?.workout_library.name}</DialogTitle>
          </DialogHeader>
          {viewingWorkout && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Kategori</p>
                  <p className="font-medium capitalize">{viewingWorkout.workout_library.category}</p>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Datum</p>
                  <p className="font-medium">
                    {format(new Date(viewingWorkout.scheduled_date), "d MMM yyyy", { locale: sv })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Planerad tid</p>
                  <p className="font-medium">{viewingWorkout.workout_library.duration || "-"} min</p>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Ansträngning</p>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: getEffortColor(viewingWorkout.workout_library.effort) }}
                    />
                    <p className="font-medium">{viewingWorkout.workout_library.effort}/10</p>
                  </div>
                </div>
              </div>

              {viewingWorkout.workout_library.description && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Beskrivning</p>
                  <p className="text-sm">{viewingWorkout.workout_library.description}</p>
                </div>
              )}

              {viewingWorkout.completed && (
                <div className="border-t pt-4 space-y-3">
                  <h4 className="font-semibold">Genomfört pass</h4>
                  {viewingWorkout.trained_time && (
                    <div>
                      <p className="text-sm text-muted-foreground">Tränad tid</p>
                      <p className="font-medium">{viewingWorkout.trained_time} min</p>
                    </div>
                  )}
                  {viewingWorkout.distance && (
                    <div>
                      <p className="text-sm text-muted-foreground">Distans</p>
                      <p className="font-medium">{viewingWorkout.distance} km</p>
                    </div>
                  )}
                  {viewingWorkout.pace && (
                    <div>
                      <p className="text-sm text-muted-foreground">Tempo</p>
                      <p className="font-medium">{viewingWorkout.pace}</p>
                    </div>
                  )}
                  {viewingWorkout.notes && (
                    <div>
                      <p className="text-sm text-muted-foreground">Anteckningar</p>
                      <p className="text-sm">{viewingWorkout.notes}</p>
                    </div>
                  )}
                  {viewingWorkout.joy_rating && (
                    <div className="flex items-center gap-2">
                      <Smile className="h-4 w-4 text-accent" />
                      <p className="font-medium">Glädje: {viewingWorkout.joy_rating}/5</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Home;