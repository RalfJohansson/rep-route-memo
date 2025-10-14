import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Grip } from "lucide-react";
import { format, startOfWeek, addDays } from "date-fns";
import { sv } from "date-fns/locale";

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
  };
}

const Schedule = () => {
  const [workouts, setWorkouts] = useState<ScheduledWorkout[]>([]);
  const [libraryWorkouts, setLibraryWorkouts] = useState<WorkoutLibraryItem[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedWorkoutId, setSelectedWorkoutId] = useState("");
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [draggedWorkout, setDraggedWorkout] = useState<string | null>(null);

  useEffect(() => {
    fetchScheduledWorkouts();
    fetchLibraryWorkouts();
  }, [currentWeekStart]);

  const fetchScheduledWorkouts = async () => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;

    const weekEnd = addDays(currentWeekStart, 6);

    const { data, error } = await supabase
      .from("scheduled_workouts")
      .select(`
        id,
        scheduled_date,
        workout_library (
          id,
          name,
          category
        )
      `)
      .eq("user_id", user.id)
      .gte("scheduled_date", format(currentWeekStart, "yyyy-MM-dd"))
      .lte("scheduled_date", format(weekEnd, "yyyy-MM-dd"))
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

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  const getWorkoutsForDate = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return workouts.filter((w) => w.scheduled_date === dateStr);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Schema</h1>
          <p className="text-sm text-muted-foreground">
            Vecka {format(currentWeekStart, "w", { locale: sv })}
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setShowAddDialog(true)}
          className="bg-gradient-to-r from-primary to-secondary"
        >
          <Plus className="h-4 w-4 mr-1" />
          Lägg till
        </Button>
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
                  <p className="text-sm text-muted-foreground text-center py-2">
                    Inga pass
                  </p>
                ) : (
                  dayWorkouts.map((workout) => (
                    <div
                      key={workout.id}
                      draggable
                      onDragStart={() => handleDragStart(workout.id)}
                      className="flex items-center gap-2 p-2 rounded bg-muted cursor-move hover:bg-muted/80 transition-colors"
                    >
                      <Grip className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{workout.workout_library.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {workout.workout_library.category}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteWorkout(workout.id)}
                        className="h-8 text-destructive hover:text-destructive"
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
    </div>
  );
};

export default Schedule;