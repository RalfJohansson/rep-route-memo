import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Grip } from "lucide-react";
import { format, startOfWeek, addDays, parseISO } from "date-fns";
import { sv } from "date-fns/locale";
import WorkoutDetailDialog from "@/components/WorkoutDetailDialog";

const getCategoryColor = (category: string) => {
  const colors: { [key: string]: string } = {
    'intervallpass': '#BF5E42',
    'distanspass': '#468771',
    'långpass': '#7AA6DB',
    'styrka': '#4E7C8C',
  };
  return colors[category.toLowerCase()] || '#BF5E42';
};

interface WorkoutLibraryItem {
  id: string;
  name: string;
  category: string;
}

interface ScheduledWorkout {
  id: string;
  scheduled_date: string;
  workout_library: {
    id: string;
    name: string;
    category: string;
    duration: number | null;
    effort: number | null;
    description: string | null;
  };
}

const Schedule = () => {
  const [workouts, setWorkouts] = useState<ScheduledWorkout[]>([]);
  const [libraryWorkouts, setLibraryWorkouts] = useState<WorkoutLibraryItem[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedWorkoutId, setSelectedWorkoutId] = useState("");
  const [draggedWorkout, setDraggedWorkout] = useState<string | null>(null);
  const [viewingWorkout, setViewingWorkout] = useState<ScheduledWorkout["workout_library"] | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  useEffect(() => {
    fetchScheduledWorkouts();
    fetchLibraryWorkouts();
  }, []);

  const fetchScheduledWorkouts = async () => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;

    const { data, error } = await supabase
      .from("scheduled_workouts")
      .select(`
        id,
        scheduled_date,
        workout_library (
          id,
          name,
          category,
          duration,
          effort,
          description
        )
      `)
      .eq("user_id", user.id)
      .order("scheduled_date");

    if (error) {
      toast.error("Kunde inte hämta schema");
    } else {
      setWorkouts(data || []);
    }
  };

  const fetchLibraryWorkouts = async () => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;

    const { data, error } = await supabase
      .from("workout_library")
      .select("id, name, category")
      .eq("user_id", user.id);

    if (error) {
      toast.error("Kunde inte hämta bibliotek");
    } else {
      setLibraryWorkouts(data || []);
    }
  };

  const handleAddWorkout = async () => {
    if (!selectedWorkoutId || !selectedDate) {
      toast.error("Välj pass och datum");
      return;
    }

    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;

    const { error } = await supabase.from("scheduled_workouts").insert({
      user_id: user.id,
      workout_id: selectedWorkoutId,
      scheduled_date: selectedDate,
    });

    if (error) {
      toast.error("Kunde inte lägga till pass");
    } else {
      toast.success("Pass tillagt!");
      setShowAddDialog(false);
      setSelectedWorkoutId("");
      setSelectedDate("");
      fetchScheduledWorkouts();
    }
  };

  const handleDragStart = (workoutId: string) => {
    setDraggedWorkout(workoutId);
  };

  const handleDrop = async (targetDate: string) => {
    if (!draggedWorkout) return;

    const { error } = await supabase
      .from("scheduled_workouts")
      .update({ scheduled_date: targetDate })
      .eq("id", draggedWorkout);

    if (error) {
      toast.error("Kunde inte flytta pass");
    } else {
      toast.success("Pass flyttat!");
      fetchScheduledWorkouts();
    }
    setDraggedWorkout(null);
  };

  const handleDeleteWorkout = async (id: string) => {
    const { error } = await supabase
      .from("scheduled_workouts")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Kunde inte ta bort pass");
    } else {
      toast.success("Pass borttaget");
      fetchScheduledWorkouts();
    }
  };

  // Group workouts by week
  const workoutsByWeek = workouts.reduce((acc, workout) => {
    const workoutDate = parseISO(workout.scheduled_date);
    const weekStart = startOfWeek(workoutDate, { weekStartsOn: 1 });
    const weekKey = format(weekStart, "yyyy-MM-dd");
    
    if (!acc[weekKey]) {
      acc[weekKey] = [];
    }
    acc[weekKey].push(workout);
    return acc;
  }, {} as Record<string, ScheduledWorkout[]>);

  const sortedWeeks = Object.keys(workoutsByWeek).sort();

  const getWorkoutsForDate = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return workouts.filter((w) => w.scheduled_date === dateStr);
  };

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Schema</h1>
        <Button
          size="sm"
          onClick={() => setShowAddDialog(true)}
          className="bg-gradient-to-r from-primary to-secondary"
        >
          <Plus className="h-4 w-4 mr-1" />
          Lägg till
        </Button>
      </div>

      {sortedWeeks.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">
              Inga schemalagda pass. Lägg till ditt första pass!
            </p>
          </CardContent>
        </Card>
      ) : (
        sortedWeeks.map((weekKey) => {
          const weekStart = parseISO(weekKey);
          const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
          
          return (
            <div key={weekKey} className="space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">
                  Vecka {format(weekStart, "w", { locale: sv })}
                </h2>
                <span className="text-sm text-muted-foreground">
                  {format(weekStart, "d MMM", { locale: sv })} - {format(addDays(weekStart, 6), "d MMM yyyy", { locale: sv })}
                </span>
              </div>

              <div className="space-y-2">
                {weekDays.map((day) => {
                  const dayWorkouts = getWorkoutsForDate(day);
                  const dateStr = format(day, "yyyy-MM-dd");
                  const isToday = format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");

                  return (
                    <Card
                      key={dateStr}
                      className={isToday ? "border-primary" : ""}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => handleDrop(dateStr)}
                    >
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex justify-between items-center">
                          <span>
                            {format(day, "EEEE", { locale: sv })}
                          </span>
                          <span className="text-sm font-normal text-muted-foreground">
                            {format(day, "d MMM", { locale: sv })}
                          </span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {dayWorkouts.length === 0 ? (
                          <div className="py-4">
                            <p className="text-sm text-muted-foreground text-center">Dra och släpp pass här</p>
                          </div>
                        ) : (
                          dayWorkouts.map((workout) => (
                            <div
                              key={workout.id}
                              draggable
                              onDragStart={() => handleDragStart(workout.id)}
                              onClick={() => {
                                setViewingWorkout(workout.workout_library);
                                setShowDetailDialog(true);
                              }}
                              className="flex items-center gap-0 rounded-lg border bg-card cursor-pointer hover:bg-accent/5 transition-colors overflow-hidden"
                            >
                              <div 
                                className="w-12 flex items-center justify-center text-white font-medium flex-shrink-0"
                                style={{ backgroundColor: getCategoryColor(workout.workout_library.category) }}
                              >
                                <span className="writing-mode-vertical-rl rotate-180 text-[8px]">
                                  {workout.workout_library.category === 'intervallpass' ? 'Intervallpass' : 
                                   workout.workout_library.category === 'distanspass' ? 'Distanspass' : 
                                   workout.workout_library.category === 'långpass' ? 'Långpass' : 
                                   workout.workout_library.category === 'styrka' ? 'Styrka' : 
                                   workout.workout_library.category}
                                </span>
                              </div>
                              <Grip 
                                className="h-4 w-4 text-muted-foreground cursor-move mx-2" 
                                onMouseDown={(e) => e.stopPropagation()}
                                onClick={(e) => e.stopPropagation()}
                              />
                              <div className="flex-1 py-2 flex items-center">
                                <p className="text-sm font-medium">{workout.workout_library.name}</p>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteWorkout(workout.id);
                                }}
                                className="h-8 text-destructive hover:text-destructive mr-2"
                              >
                                Ta bort
                              </Button>
                            </div>
                          ))
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })
      )}

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lägg till pass i schema</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Välj pass</label>
              <Select value={selectedWorkoutId} onValueChange={setSelectedWorkoutId}>
                <SelectTrigger>
                  <SelectValue placeholder="Välj ett pass" />
                </SelectTrigger>
                <SelectContent>
                  {libraryWorkouts.map((workout) => (
                    <SelectItem key={workout.id} value={workout.id}>
                      {workout.name} - {workout.category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Välj datum</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <Button onClick={handleAddWorkout} className="w-full">
              Lägg till
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <WorkoutDetailDialog
        workout={viewingWorkout ? {
          ...viewingWorkout,
          category: viewingWorkout.category
        } : null}
        open={showDetailDialog}
        onOpenChange={setShowDetailDialog}
      />
    </div>
  );
};

export default Schedule;