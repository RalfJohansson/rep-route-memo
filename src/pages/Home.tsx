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
import { CheckCircle2, Clock, MapPin, TrendingUp, Smile, Download } from "lucide-react";
import { format, startOfWeek, endOfWeek, addDays, startOfYear, endOfYear } from "date-fns";
import { sv } from "date-fns/locale";
import WorkoutDetailDialog from "@/components/WorkoutDetailDialog";
import heroImage from "@/assets/hero-running.jpg";
import { getCategoryColor } from "@/lib/utils"; // Importera getCategoryColor

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
  
  // Activity fetching states
  const [stravaActivities, setStravaActivities] = useState<any[]>([]);
  const [garminActivities, setGarminActivities] = useState<any[]>([]);
  const [showStravaActivities, setShowStravaActivities] = useState(false);
  const [showGarminActivities, setShowGarminActivities] = useState(false);
  const [loadingStrava, setLoadingStrava] = useState(false);
  const [loadingGarmin, setLoadingGarmin] = useState(false);
  
  // Connection status
  const [stravaConnected, setStravaConnected] = useState(false);
  const [garminConnected, setGarminConnected] = useState(false);

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

  // Check connection statuses via auth state change
      useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (_event, session) => {
            if (session?.user) {
              // Check Strava via secure edge function
              const { data: stravaData, error: stravaError } = await supabase.functions.invoke('strava-status', {
                headers: { Authorization: `Bearer ${session.access_token}` },\n              });
              if (!stravaError && stravaData) {
                setStravaConnected(stravaData.connected);
              } else {
                console.error('Error fetching Strava status:', stravaError);
                setStravaConnected(false);
              }

              // Check Garmin (unchanged, direct query)
              const { data: garminData } = await supabase
                .from('user_integrations')
                .select('id, provider, provider_user_id, expires_at')
                .eq('user_id', session.user.id)
                .eq('provider', 'garmin')
                .maybeSingle();
              setGarminConnected(!!garminData);
            } else {
              setStravaConnected(false);
              setGarminConnected(false);
            }
          }
        );

        return () => {
          subscription.unsubscribe();
        };
      }, []);

  useEffect(() => {
    fetchWeekWorkouts();
  }, []);

  const fetchWeekWorkouts = async () => {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) return;

      const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
      const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });

      // Hämta veckans pass för att visa
      const { data, error } = await supabase
        .from(\"scheduled_workouts\")
        .select(`\n          *,\n          workout_library (\n            name,\n            category,\n            duration,\n            effort,\n            description,\n            pace\n          )\n        `)
        .eq(\"user_id\", user.id)
        .gte(\"scheduled_date\", format(weekStart, \"yyyy-MM-dd\"))
        .lte(\"scheduled_date\", format(weekEnd, \"yyyy-MM-dd\"))
        .order(\"scheduled_date\");

      if (error) throw error;

      setWorkouts(data || []);
      \n      // Hämta alla genomförda pass för statistik (totalt från början)\n      const { data: allCompletedData, error: statsError } = await supabase\n        .from(\"scheduled_workouts\")\n        .select(\"completed, trained_time, distance\")\n        .eq(\"user_id\", user.id)\n        .eq(\"completed\", true);\n\n      if (statsError) throw statsError;\n\n      // Beräkna total statistik\n      const completed = allCompletedData?.length || 0;\n      const totalTime = allCompletedData?.reduce((sum, w) => sum + (w.trained_time || 0), 0) || 0;\n      const totalDistance = allCompletedData?.reduce((sum, w) => sum + (Number(w.distance) || 0), 0) || 0;\n      \n      setStats({ completed, totalTime, totalDistance });
    } catch (error: any) {
      toast.error(\"Kunde inte hämta pass\");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleComplete = async (workout: ScheduledWorkout) => {
    if (!workout.completed) {
      setSelectedWorkout(workout);
      setTrainedTime(\"\");
      setDistance(\"\");
      setCalculatedPace(\"\");
      setNotes(\"\");
      setJoyRating(3);
      setStravaActivities([]);
      setGarminActivities([]);
      setShowStravaActivities(false);
      setShowGarminActivities(false);
    } else {
      // Uncheck - behåll all data, ändra bara completed status\n      const { error } = await supabase\n        .from(\"scheduled_workouts\")\n        .update({\n          completed: false,\n          updated_at: new Date().toISOString(), // Uppdatera updated_at\n        })\n        .eq(\"id\", workout.id);\n\n      if (error) {\n        toast.error(\"Kunde inte uppdatera\");\n      } else {\n        toast.success(\"Pass omarkerat\");\n        fetchWeekWorkouts();\n      }\n    }\n  };

  const handleFetchActivities = async () => {
    if (!selectedWorkout) return;

    // Reset activity states
    setStravaActivities([]);
    setShowStravaActivities(false);

    // Determine activity type based on workout category
    const workoutCategory = selectedWorkout.workout_library.category;
    let stravaActivityType: string | null = null;

    if (workoutCategory === 'styrka') {
      stravaActivityType = 'WeightTraining';
    } else if (['intervallpass', 'distanspass', 'långpass', 'tävling'].includes(workoutCategory)) {
      stravaActivityType = 'Run';
    } else {
      toast.info(\"Denna passkategori stöds inte för automatisk hämtning från externa tjänster.\");
      return;
    }

    // Try Strava if connected
    if (stravaConnected) {
      setLoadingStrava(true);
      try {
        const { data, error } = await supabase.functions.invoke('strava-fetch-activities', {
          body: {
            date: selectedWorkout.scheduled_date,
            activityType: stravaActivityType
          }
        });

        if (error) throw error;

        if (data.activities && data.activities.length > 0) {
          setStravaActivities(data.activities);
          setShowStravaActivities(true);
          
          // Try to auto-select the best match
          const bestMatch = findBestActivityMatch(data.activities, selectedWorkout);
          if (bestMatch) {
            selectActivity(bestMatch, 'strava');
            return;
          }
        } else {
          toast.info(`Inga ${stravaActivityType === 'Run' ? 'löppass' : 'styrkepass'} hittades på Strava för detta datum`);
        }
      } catch (error: any) {
        toast.error(error.message || \"Kunde inte hämta från Strava\");
      } finally {
        setLoadingStrava(false);
      }
    }

    // If we haven't found anything and are connected, show message
    if (stravaConnected && 
        (!showStravaActivities || stravaActivities.length === 0)) {
      toast.info(\"Inga aktiviteter hittades från Strava\");
    }
  };

  const findBestActivityMatch = (activities: any[], workout: ScheduledWorkout) => {
    // We'll implement a simple matching algorithm based on date and type
    // For now, we'll just return the first activity if there's only one
    // In a more advanced version, we could match by time, distance, etc.
    if (activities.length === 1) {
      return activities[0];
    }
    
    // TODO: Implement more sophisticated matching
    // For now, we'll return null to let the user choose
    return null;
  };

  const selectActivity = (activity: any, source: 'strava' | 'garmin') => {
    // Map the activity to the form fields
    setTrainedTime(Math.round(activity.moving_time / 60).toString());
    setDistance(activity.distance);
    
    // Calculate pace if we have time and distance
    if (activity.moving_time && activity.distance) {
      const totalSeconds = activity.moving_time;
      const distanceKm = parseFloat(activity.distance);
      if (distanceKm > 0) {
        const secondsPerKm = totalSeconds / distanceKm;
        let minutes = Math.floor(secondsPerKm / 60);
        let seconds = Math.floor(secondsPerKm % 60);
        if (seconds >= 60) {
          minutes += 1;
          seconds = 0;
        }
        setCalculatedPace(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      }
    }
    
    // Set notes to indicate source
    setNotes(`Importerat från ${source === 'strava' ? 'Strava' : 'Garmin'}: ${activity.name}`);
    
    // Close the activity selectors
    setShowStravaActivities(false);
    setShowGarminActivities(false);
    
    toast.success(`Data från ${source === 'strava' ? 'Strava' : 'Garmin'} inläst!`);
  };

  const handleSelectStravaActivity = (activity: any) => {
    selectActivity(activity, 'strava');
  };

  const handleSelectGarminActivity = (activity: any) => {
    selectActivity(activity, 'garmin');
  };

  const handleSubmitWorkout = async () => {
    if (!selectedWorkout) return;

    const { error } = await supabase
      .from(\"scheduled_workouts\")
      .update({\n        completed: true,\n        trained_time: trainedTime ? parseInt(trainedTime) : null,\n        distance: distance ? parseFloat(distance) : null,\n        pace: calculatedPace ? `${calculatedPace} min/km` : null,\n        notes: notes || null,\n        joy_rating: joyRating,\n        updated_at: new Date().toISOString(), // Uppdatera updated_at\n      })\n      .eq(\"id\", selectedWorkout.id);\n\n    if (error) {\n      toast.error(\"Kunde inte spara\");\n    } else {\n      toast.success(\"Pass markerat som genomfört!\");\n      setSelectedWorkout(null);\n      fetchWeekWorkouts();\n    }\n  };

  const getJoyColor = (rating: number) => {
    if (rating === 1) return '#FF0000';
    if (rating === 2) return '#FF9900';
    return '#00A000'; // 3-5
  };

  if (loading) {
    return (
      <div className=\"flex items-center justify-center min-h-screen\">
        <div className=\"animate-spin rounded-full h-12 w-12 border-b-2 border-primary\"></div>
      </div>
    );
  }

  return (
    <div className=\"p-4 space-y-6\">\n      <div className=\"relative rounded-2xl p-6 text-white shadow-md overflow-hidden\">\n        <div \n          className=\"absolute inset-0 bg-cover bg-center\"\n          style={{ backgroundImage: `url(${heroImage})` }}\n        />\n        <div className=\"absolute inset-0 bg-[#d4c4b0]/70\" />\n        <div className=\"relative z-10\">\n          <h1 className=\"text-2xl font-bold mb-2\">Denna vecka</h1>\n          <p className=\"text-white/90\">\n            {format(startOfWeek(new Date(), { weekStartsOn: 1 }), \"d MMM\", { locale: sv })} -{\" \"}\n            {format(endOfWeek(new Date(), { weekStartsOn: 1 }), \"d MMM\", { locale: sv })}\n          </p>\n        </div>\n      </div>\n\n      <div className=\"grid grid-cols-3 gap-3\">\n        <Card>\n          <CardContent className=\"pt-2 pb-2 text-center\">\n            <CheckCircle2 className=\"h-5 w-5 mx-auto mb-1 text-accent\" />\n            <p className=\"text-xl font-bold\">{stats.completed}</p>\n            <p className=\"text-xs text-muted-foreground\">Genomförda</p>\n          </CardContent>\n        </Card>\n        <Card>\n          <CardContent className=\"pt-2 pb-2 text-center\">\n            <Clock className=\"h-5 w-5 mx-auto mb-1 text-primary\" />\n            <p className=\"text-xl font-bold\">{stats.totalTime}</p>\n            <p className=\"text-xs text-muted-foreground\">Minuter</p>\n          </CardContent>\n        </Card>\n        <Card>\n          <CardContent className=\"pt-2 pb-2 text-center\">\n            <MapPin className=\"h-5 w-5 mx-auto mb-1 text-secondary\" />\n            <p className=\"text-xl font-bold\">{stats.totalDistance.toFixed(1)}</p>\n            <p className=\"text-xs text-muted-foreground\">Km</p>\n          </CardContent>\n        </Card>\n      </div>\n\n      <Card>\n        <CardHeader>\n          <CardTitle>Veckans pass</CardTitle>\n        </CardHeader>\n        <CardContent className=\"space-y-4\">\n          {Array.from({ length: 7 }, (_, i) => {\n            const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });\n            const currentDay = addDays(weekStart, i);\n            const dateStr = format(currentDay, \"yyyy-MM-dd\");\n            const dayWorkouts = workouts.filter(w => w.scheduled_date === dateStr);\n            \n            return (\n              <div key={dateStr} className=\"space-y-2\">\n                <h3 className=\"text-sm font-medium text-muted-foreground\">\n                  {format(currentDay, \"EEEE d MMM\", { locale: sv })}\n                </h3>\n                {dayWorkouts.length === 0 ? (\n                  <div className=\"rounded-lg border bg-card p-3\">\n                    <p className=\"text-sm text-muted-foreground text-center\">Vila</p>\n                  </div>\n                ) : (\n                  dayWorkouts.map((workout) => (\n                    <div\n                      key={workout.id}\n                      className=\"flex items-center gap-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors cursor-pointer overflow-hidden min-h-[52px]\"\n                      onClick={(e) => {\n                        if ((e.target as HTMLElement).closest('button')) return;\n                        setViewingWorkout(workout);\n                      }}\n                    >\n                      <div\n                        className=\"w-6 flex items-center justify-center text-white font-medium flex-shrink-0 self-stretch outline-none\"\n                        style={{ backgroundColor: getCategoryColor(workout.workout_library.category) }}\n                      >\n                        <span className=\"writing-mode-vertical-rl rotate-180 text-[8px]\">\n                          {workout.workout_library.category === 'intervallpass' ? 'Intervall' :\n                           workout.workout_library.category === 'distanspass' ? 'Distans' :\n                           workout.workout_library.category === 'långpass' ? 'Långpass' :\n                           workout.workout_library.category === 'styrka' ? 'Styrka' :\n                           workout.workout_library.category === 'tävling' ? 'Tävling' :\n                           workout.workout_library.category === 'simning' ? 'Simning' :\n                           workout.workout_library.category === 'cykling' ? 'Cykling' :\n                           workout.workout_library.category}\n                        </span>\n                      </div>\n                      <Checkbox\n                        checked={workout.completed}\n                        onCheckedChange={() => handleToggleComplete(workout)}\n                        className=\"h-5 w-5\"\n                        onClick={(e) => e.stopPropagation()}\n                      />\n                      <div className=\"flex-1 py-3\">\n                        <p className=\"font-medium\">{workout.workout_library.name}</p>\n                      </div>\n                      {workout.completed && workout.joy_rating && (\n                        <div className=\"flex items-center pr-3\">\n                          <Smile\n                            className=\"h-5 w-5\"\n                            style={{ color: getJoyColor(workout.joy_rating) }}\n                          />\n                        </div>\n                      )}\n                    </div>\n                  ))\n                )}\n              </div>\n            );\n          })}\n        </CardContent>\n      </Card>\n\n      <Dialog open={!!selectedWorkout} onOpenChange={(open) => !open && setSelectedWorkout(null)}>\n        <DialogContent className=\"max-w-md\">\n          <DialogHeader>\n            <DialogTitle>Markera pass som genomfört</DialogTitle>\n          </DialogHeader>\n          <div className=\"space-y-4\">\n            {/* Activity source buttons */}\n            <div className=\"space-y-2\">\n              {stravaConnected && (\n                <Button\n                  onClick={handleFetchActivities}\n                  variant=\"outline\"\n                  className=\"w-full flex items-center justify-center gap-1 text-orange-600 border-orange-600 hover:bg-orange-50 hover:text-orange-700\"\n                  disabled={loadingStrava}\n                >\n                  {loadingStrava ? (\n                    <span>Hämtar från Strava...</span>\n                  ) : (\n                    <span>Hämta genomfört pass från Strava</span>\n                  )}\n                </Button>\n              )}\n              {!stravaConnected && (\n                <p className=\"text-sm text-muted-foreground\">\n                  Ingen extern tjänst ansluten. Anslut Strava i Verktyg för att hämta aktiviteter automatiskt.\n                </p>\n              )}\n            </div>\n\n            {/* Strava activities */}\n            {showStravaActivities && stravaActivities.length > 0 && (\n              <div className=\"space-y-2 border rounded-lg p-3 bg-muted/50\">\n                <Label>Välj aktivitet från Strava:</Label>\n                {stravaActivities.map((activity) => (\n                  <Button\n                    key={activity.id}\n                    onClick={() => handleSelectStravaActivity(activity)}\n                    variant=\"outline\"\n                    className=\"w-full justify-start text-left h-auto py-2\"\n                  >\n                    <div className=\"flex flex-col items-start w-full\">\n                      <span className=\"font-medium\">{activity.name}</span>\n                      <span className=\"text-xs text-muted-foreground\">\n                        {activity.distance} km • {Math.round(activity.moving_time / 60)} min\n                      </span>\n                    </div>\n                  </Button>\n                ))}\n              </div>\n            )}\n\n            {/* Manual input fields */}\n            <div className=\"space-y-2\">\n              <Label htmlFor=\"trainedTime\">Tränad tid (minuter)</Label>\n              <Input\n                id=\"trainedTime\"\n                type=\"number\"\n                value={trainedTime}\n                onChange={(e) => setTrainedTime(e.target.value)}\n                placeholder=\"45\"\n              />\n            </div>\n            <div className=\"space-y-2\">\n              <Label htmlFor=\"distance\">Distans (km)</Label>\n              <Input\n                id=\"distance\"\n                type=\"number\"\n                step=\"0.1\"\n                value={distance}\n                onChange={(e) => setDistance(e.target.value)}\n                placeholder=\"10.5\"\n              />\n            </div>\n            {calculatedPace && (\n              <div className=\"space-y-2\">\n                <Label>Tempo</Label>\n                <div className=\"px-3 py-2 rounded-md bg-muted text-sm\">\n                  {calculatedPace} min/km\n                </div>\n              </div>\n            )}\n            <div className=\"space-y-2\">\n              <Label htmlFor=\"notes\">Anteckningar</Label>\n              <Textarea\n                id=\"notes\"\n                value={notes}\n                onChange={(e) => setNotes(e.target.value)}\n                placeholder=\"Hur kändes passet?\"\n                rows={3}\n              />\n            </div>\n            <div className=\"space-y-2\">\n              <Label>Hur mycket glädje? (1-5)</Label>\n              <div className=\"flex gap-2\">\n                {[1, 2, 3, 4, 5].map((rating) => (\n                  <Button\n                    key={rating}\n                    type=\"button\"\n                    variant={joyRating === rating ? \"default\" : \"outline\"}\n                    size=\"sm\"\n                    onClick={() => setJoyRating(rating)}\n                    className=\"flex-1\"\n                  >\n                    {rating}\n                  </Button>\n                ))}\n              </div>\n            </div>\n            <Button onClick={handleSubmitWorkout} className=\"w-full\">\n              Spara\n            </Button>\n          </div>\n        </DialogContent>\n      </Dialog>\n\n      <WorkoutDetailDialog\n        workout={viewingWorkout ? {\n          name: viewingWorkout.workout_library.name,\n          duration: viewingWorkout.workout_library.duration,\n          effort: viewingWorkout.workout_library.effort,\n          description: viewingWorkout.workout_library.description,\n          category: viewingWorkout.workout_library.category,\n          completed: viewingWorkout.completed,\n          trained_time: viewingWorkout.trained_time,\n          distance: viewingWorkout.distance,\n          actual_pace: viewingWorkout.pace,\n          notes: viewingWorkout.notes,\n          joy_rating: viewingWorkout.joy_rating,\n        } : null}\n        open={!!viewingWorkout}\n        onOpenChange={(open) => !open && setViewingWorkout(null)}\n      />\n    </div>\n  );
};

export default Home;