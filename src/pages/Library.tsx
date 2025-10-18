import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Edit, Trash2 } from "lucide-react";
import WorkoutDetailDialog from "@/components/WorkoutDetailDialog";

interface WorkoutLibraryItem {
  id: string;
  name: string;
  category: string;
  duration: number | null;
  effort: number | null;
  description: string | null;
}

const categories = [
  { value: "intervallpass", label: "Intervallpass" },
  { value: "distanspass", label: "Distanspass" },
  { value: "långpass", label: "Långpass" },
  { value: "styrka", label: "Styrka" },
  { value: "tävling", label: "Tävling" },
];

const Library = () => {
  const [workouts, setWorkouts] = useState<WorkoutLibraryItem[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editingWorkout, setEditingWorkout] = useState<WorkoutLibraryItem | null>(null);
  const [activeTab, setActiveTab] = useState("intervallpass");
  const [viewingWorkout, setViewingWorkout] = useState<WorkoutLibraryItem | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [category, setCategory] = useState("intervallpass");
  const [duration, setDuration] = useState("");
  const [effort, setEffort] = useState(5);
  const [description, setDescription] = useState("");

  useEffect(() => {
    fetchWorkouts();
  }, []);

  const fetchWorkouts = async () => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;

    const { data, error } = await supabase
      .from("workout_library")
      .select("*")
      .eq("user_id", user.id)
      .order("name");

    if (error) {
      toast.error("Kunde inte hämta pass");
    } else {
      setWorkouts(data || []);
    }
  };

  const resetForm = () => {
    setName("");
    setCategory("intervallpass");
    setDuration("");
    setEffort(5);
    setDescription("");
    setEditingWorkout(null);
  };

  const handleOpenDialog = (workout?: WorkoutLibraryItem) => {
    if (workout) {
      setEditingWorkout(workout);
      setName(workout.name);
      setCategory(workout.category);
      setDuration(workout.duration?.toString() || "");
      setEffort(workout.effort || 5);
      setDescription(workout.description || "");
    } else {
      resetForm();
    }
    setShowDialog(true);
  };

  const handleSaveWorkout = async () => {
    if (!name || !category) {
      toast.error("Fyll i namn och kategori");
      return;
    }

    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;

    const workoutData = {
      name,
      category: category as "intervallpass" | "distanspass" | "långpass" | "styrka",
      duration: duration ? parseInt(duration) : null,
      effort,
      description: description || null,
      user_id: user.id,
    };

    if (editingWorkout) {
      const { error } = await supabase
        .from("workout_library")
        .update(workoutData)
        .eq("id", editingWorkout.id);

      if (error) {
        toast.error("Kunde inte uppdatera pass");
      } else {
        toast.success("Pass uppdaterat!");
        setShowDialog(false);
        resetForm();
        fetchWorkouts();
      }
    } else {
      const { error } = await supabase
        .from("workout_library")
        .insert(workoutData);

      if (error) {
        toast.error("Kunde inte skapa pass");
      } else {
        toast.success("Pass skapat!");
        setShowDialog(false);
        resetForm();
        fetchWorkouts();
      }
    }
  };

  const handleDeleteWorkout = async (id: string) => {
    const { error } = await supabase
      .from("workout_library")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Kunde inte ta bort pass");
    } else {
      toast.success("Pass borttaget");
      fetchWorkouts();
    }
  };

  const getWorkoutsByCategory = (cat: string) => {
    return workouts.filter((w) => w.category === cat);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Bibliotek</h1>
        <Button
          onClick={() => handleOpenDialog()}
          className="bg-gradient-to-r from-primary to-secondary"
        >
          <Plus className="h-4 w-4 mr-1" />
          Nytt pass
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          {categories.map((cat) => (
            <TabsTrigger key={cat.value} value={cat.value} className="text-[11px]">
              {cat.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {categories.map((cat) => (
          <TabsContent key={cat.value} value={cat.value} className="space-y-3">
            {getWorkoutsByCategory(cat.value).length === 0 ? (
              <Card>
                <CardContent className="py-8">
                  <p className="text-center text-muted-foreground">
                    Inga pass i denna kategori
                  </p>
                </CardContent>
              </Card>
            ) : (
              getWorkoutsByCategory(cat.value).map((workout) => (
                <Card 
                  key={workout.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => {
                    setViewingWorkout(workout);
                    setShowDetailDialog(true);
                  }}
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex justify-between items-start">
                      <span>{workout.name}</span>
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDialog(workout)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteWorkout(workout.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                </Card>
              ))
            )}
          </TabsContent>
        ))}
      </Tabs>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingWorkout ? "Redigera pass" : "Skapa nytt pass"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Namn på pass</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="T.ex. 5x1000m"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Typ av pass</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">Tid (minuter)</Label>
              <Input
                id="duration"
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="45"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pace">Fart</Label>
              <Input
                id="pace"
                type="text"
                placeholder="T.ex. 5:00/km"
              />
            </div>
            <div className="space-y-2">
              <Label>Ansträngning (1-10)</Label>
              <div className="flex gap-1">
                {[...Array(10)].map((_, i) => (
                  <Button
                    key={i + 1}
                    type="button"
                    variant={effort === i + 1 ? "default" : "outline"}
                    size="sm"
                    onClick={() => setEffort(i + 1)}
                    className="flex-1 p-0 h-9"
                  >
                    {i + 1}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Beskrivning</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Beskrivning av passet..."
                rows={3}
              />
            </div>
            <Button onClick={handleSaveWorkout} className="w-full">
              {editingWorkout ? "Uppdatera" : "Skapa"} pass
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <WorkoutDetailDialog
        workout={viewingWorkout}
        open={showDetailDialog}
        onOpenChange={setShowDetailDialog}
      />
    </div>
  );
};

export default Library;
