import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Upload } from "lucide-react";
import WorkoutDetailDialog from "@/components/WorkoutDetailDialog";

interface WorkoutLibraryItem {
  id: string;
  name: string;
  category: string;
  duration: string | null;
  effort: number | null;
  description: string | null;
  pace?: string | null;
}

const topCategories = [
  { value: "lopning", label: "Löpning" },
  { value: "cykling", label: "Cykling" },
  { value: "simning", label: "Simning" },
  { value: "styrka", label: "Stryka" },
  { value: "tävling", label: "Tävling" },
];

const subCategoryMap: Record<string, Array<{ value: string; label: string }>> = {
  lopning: [
    { value: "intervallpass", label: "Intervallpass" },
    { value: "distanspass", label: "Distanspass" },
    { value: "långpass", label: "Långpass" },
  ],
  // andra toppkategorier har inga underkategorier
};

const Library = () => {
  const [workouts, setWorkouts] = useState<WorkoutLibraryItem[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editingWorkout, setEditingWorkout] = useState<WorkoutLibraryItem | null>(null);
  const [activeTopCategory, setActiveTopCategory] = useState<string>("lopning");
  const [activeSubCategory, setActiveSubCategory] = useState<string | null>(null);
  const [viewingWorkout, setViewingWorkout] = useState<WorkoutLibraryItem | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [formTopCategory, setFormTopCategory] = useState("lopning");
  const [formSubCategory, setFormSubCategory] = useState<string | null>(null);
  const [category, setCategory] = useState("intervallpass");
  const [duration, setDuration] = useState("");
  const [effort, setEffort] = useState(5);
  const [description, setDescription] = useState("");
  const [pace, setPace] = useState("");

  // Import state
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [validRows, setValidRows] = useState<any[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [duplicates, setDuplicates] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  // När toppkategorin ändras, uppdatera kategori
  useEffect(() => {
    if (formTopCategory === "lopning") {
      // Om underkategori är vald, använd den, annars sätt till första underkategorin
      if (formSubCategory && subCategoryMap.lopning.some(s => s.value === formSubCategory)) {
        setCategory(formSubCategory);
      } else {
        const firstSub = subCategoryMap.lopning[0].value;
        setCategory(firstSub);
        setFormSubCategory(firstSub);
      }
    } else {
      setCategory(formTopCategory);
      setFormSubCategory(null);
    }
  }, [formTopCategory, formSubCategory]);

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
      console.error("Error fetching workouts:", error.message, error.details);
      toast.error("Kunde inte hämta pass");
    } else {
      setWorkouts(data || []);
    }
  };

  const resetForm = () => {
    setName("");
    setFormTopCategory("lopning");
    setFormSubCategory("intervallpass");
    setCategory("intervallpass");
    setDuration("");
    setEffort(5);
    setDescription("");
    setPace("");
    setEditingWorkout(null);
  };

  const handleOpenDialog = (workout?: WorkoutLibraryItem) => {
    if (workout) {
      setEditingWorkout(workout);
      setName(workout.name);
      setCategory(workout.category);
      // Avgör om kategorin är en underkategori till löpning
      if (subCategoryMap.lopning.some(s => s.value === workout.category)) {
        setFormTopCategory("lopning");
        setFormSubCategory(workout.category);
      } else {
        setFormTopCategory(workout.category);
        setFormSubCategory(null);
      }
      setDuration(workout.duration || "");
      setEffort(workout.effort || 5);
      setDescription(workout.description || "");
      setPace(workout.pace || "");
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
      category: category as "intervallpass" | "distanspass" | "långpass" | "styrka" | "tävling",
      duration: duration || null,
      effort,
      description: description || null,
      pace: pace || null,
      user_id: user.id,
    };

    if (editingWorkout) {
      const { error } = await supabase
        .from("workout_library")
        .update(workoutData)
        .eq("id", editingWorkout.id);

      if (error) {
        console.error("Error updating workout:", error.message, error.details);
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
        console.error("Error creating workout:", error.message, error.details);
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
      console.error("Error deleting workout:", error.message, error.details);
      toast.error("Kunde inte ta bort pass");
    } else {
      toast.success("Pass borttaget");
      fetchWorkouts();
    }
  };

  // Import helpers
  const resetImportState = () => {
    setShowImportDialog(false);
    setCsvData([]);
    setValidRows([]);
    setErrors([]);
    setDuplicates([]);
    setIsImporting(false);
  };

  const parseCSV = (text: string) => {
    const lines = text.trim().split("\n");
    if (lines.length === 0) return [];
    const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
    const result: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map(v => v.trim());
      const row: any = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx] !== undefined ? values[idx] : "";
      });
      result.push(row);
    }
    return result;
  };

  const validateRows = (rows: any[]) => {
    const valid: any[] = [];
    const errs: string[] = [];
    const validActivities = ["Löpning", "Cykling", "Simning", "Styrka", "Tävling"];
    const validPassCategories = ["Intervallpass", "Distanspass", "Långpass"];
    rows.forEach((row, index) => {
      const rowNum = index + 1;
      const name = row.namn || row.name || "";
      const activity = row.aktivitet || row.activity || "";
      const passCategory = row.passkategori || row.passCategory || "";
      const time = row.tid || row.time || "";
      const pace = row.fart || row.pace || "";
      const effortStr = row.anstrangning || row.effort || "";
      const description = row.beskrivning || row.description || "";

      if (!name) {
        errs.push(`Rad ${rowNum}: Namn saknas`);
        return;
      }
      if (!activity) {
        errs.push(`Rad ${rowNum}: Aktivitet saknas`);
        return;
      }
      if (!validActivities.includes(activity)) {
        errs.push(`Rad ${rowNum}: Ogiltig aktivitet "${activity}"`);
        return;
      }
      if (activity === "Löpning") {
        if (!passCategory) {
          errs.push(`Rad ${rowNum}: Passkategori saknas för Löpning`);
          return;
        }
        if (!validPassCategories.includes(passCategory)) {
          errs.push(`Rad ${rowNum}: Ogiltig passkategori "${passCategory}" för Löpning`);
          return;
        }
      }
      const effortNum = parseInt(effortStr, 10);
      if (isNaN(effortNum) || effortNum < 1 || effortNum > 10) {
        errs.push(`Rad ${rowNum}: Ansträngning måste vara ett heltal mellan 1 och 10`);
        return;
      }
      valid.push({
        name,
        activity,
        passCategory: activity === "Löpning" ? passCategory : undefined,
        time,
        pace,
        effort: effortNum,
        description,
      });
    });
    return { valid, errors: errs };
  };

  const checkDuplicates = async (rows: any[]) => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return rows;
    const existing = await supabase
      .from("workout_library")
      .select("name, category")
      .eq("user_id", user.id);
    const existingMap = new Set();
    existing.data?.forEach((w: any) => {
      existingMap.add(`${w.name.toLowerCase()}|${w.category}`);
    });
    const unique: any[] = [];
    const dups: string[] = [];
    rows.forEach((row) => {
      const key = `${row.name.toLowerCase()}|${row.activity.toLowerCase() === "lopning" ? row.activity : (row.activity === "Löpning" ? (row.passCategory || "").toLowerCase() : row.activity.toLowerCase())}`;
      // Simplify: we'll just check name and activity (top category)
      const activityKey = row.activity.toLowerCase();
      let categoryKey = "";
      if (activityKey === "löpning") {
        categoryKey = (row.passCategory || "").toLowerCase();
      } else {
        categoryKey = activityKey;
      }
      const dupKey = `${row.name.toLowerCase()}|${categoryKey}`;
      if (existingMap.has(dupKey)) {
        dups.push(row.name);
      } else {
        unique.push(row);
        existingMap.add(dupKey);
      }
    });
    return { unique, duplicates: dups };
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const rows = parseCSV(text);
      const { valid, errors } = validateRows(rows);
      setCsvData(rows);
      setValidRows(valid);
      setErrors(errors);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    setIsImporting(true);
    try {
      const { unique, duplicates } = await checkDuplicates(validRows);
      setDuplicates(duplicates);
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error("Ingen användare");
      const toInsert = unique.map((row) => {
        let categoryValue: string;
        if (row.activity.toLowerCase() === "löpning") {
          categoryValue = "lopning";
        } else if (row.activity.toLowerCase() === "cykling") {
          categoryValue = "cykling";
        } else if (row.activity.toLowerCase() === "simning") {
          categoryValue = "simning";
        } else if (row.activity.toLowerCase() === "styrka") {
          categoryValue = "styrka";
        } else if (row.activity.toLowerCase() === "tävling") {
          categoryValue = "tävling";
        } else {
          categoryValue = "lopning"; // fallback
        }
        // For löpning, we need to store the subcategory as category
        if (row.activity.toLowerCase() === "löpning") {
          categoryValue = row.passCategory?.toLowerCase() === "intervallpass" ? "intervallpass"
            : row.passCategory?.toLowerCase() === "distanspass" ? "distanspass"
            : row.passCategory?.toLowerCase() === "långpass" ? "långpass"
            : "intervallpass"; // fallback
        }
        return {
          name: row.name,
          category: categoryValue as "intervallpass" | "distanspass" | "långpass" | "styrka" | "tävling",
          duration: row.time || null,
          effort: row.effort,
          description: row.description || null,
          pace: row.pace || null,
          user_id: user.id,
        };
      });
      // Insert in batches
      const batchSize = 20;
      for (let i = 0; i < toInsert.length; i += batchSize) {
        const batch = toInsert.slice(i, i + batchSize);
        await supabase.from("workout_library").insert(batch);
      }
      toast.success(`Importerade ${toInsert.length} pass`);
      fetchWorkouts();
      resetImportState();
    } catch (err: any) {
      console.error("Import error:", err);
      toast.error("Misslyckades med import");
    } finally {
      setIsImporting(false);
    }
  };

  const getWorkoutsByCategory = (cat: string) => {
    return workouts.filter((w) => w.category === cat);
  };

  // Determine which workouts to display based on selected categories
  const getDisplayedWorkouts = () => {
    if (activeSubCategory) {
      return getWorkoutsByCategory(activeSubCategory);
    }

    const subcategories = subCategoryMap[activeTopCategory] || [];
    if (subcategories.length > 0) {
      // Om toppkategorin har underkategorier men ingen är vald, visa inga pass
      return [];
    }

    // Ingen underkategori, filtrera på toppkategorin direkt
    return getWorkoutsByCategory(activeTopCategory);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Bibliotek</h1>
        <div className="flex gap-2">
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-1" />
            Nytt pass
          </Button>
          <Button onClick={() => {
            resetImportState();
            setShowImportDialog(true);
          }}>
            <Upload className="h-4 w-4 mr-1" />
            Importera träningspass
          </Button>
        </div>
      </div>

      {/* Topp-kategorier */}
      <Tabs value={activeTopCategory} onValueChange={setActiveTopCategory}>
        <TabsList className="grid w-full grid-cols-5">
          {topCategories.map((cat) => (
            <TabsTrigger key={cat.value} value={cat.value} className="text-[11px]">
              {cat.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {topCategories.map((cat) => (
          <TabsContent key={cat.value} value={cat.value} className="space-y-4">
            {/* Om kategorin har underkategorier, visa dessa som flikar */}
            {subCategoryMap[cat.value] && subCategoryMap[cat.value].length > 0 ? (
              <Tabs value={activeSubCategory || ""} onValueChange={(val) => setActiveSubCategory(val === "" ? null : val)}>
                <TabsList className="grid w-full grid-cols-3">
                  {subCategoryMap[cat.value].map((sub) => (
                    <TabsTrigger key={sub.value} value={sub.value} className="text-[11px]">
                      {sub.label}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {subCategoryMap[cat.value].map((sub) => (
                  <TabsContent key={sub.value} value={sub.value} className="space-y-3">
                    {getWorkoutsByCategory(sub.value).length === 0 ? (
                      <Card>
                        <CardContent className="py-8">
                          <p className="text-center text-muted-foreground">
                            Inga pass i denna underkategori
                          </p>
                        </CardContent>
                      </Card>
                    ) : (
                      getWorkoutsByCategory(sub.value).map((workout) => (
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
                                  <Edit className="h-4 w-4" style={{ color: '#c99a3e' }} />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteWorkout(workout.id)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" style={{ color: '#c4574a' }} />
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
            ) : (
              // Ingen underkategori, visa pass direkt
              getWorkoutsByCategory(cat.value).length === 0 ? (
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
                            <Edit className="h-4 w-4" style={{ color: '#c99a3e' }} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteWorkout(workout.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" style={{ color: '#c4574a' }} />
                          </Button>
                        </div>
                      </CardTitle>
                    </CardHeader>
                  </Card>
                ))
              )
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
              <Label htmlFor="topCategory">Aktivitet</Label>
              <Select value={formTopCategory} onValueChange={setFormTopCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {topCategories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {formTopCategory === "lopning" && (
              <div className="space-y-2">
                <Label>Passkategori</Label>
                <RadioGroup
                  value={formSubCategory || ""}
                  onValueChange={setFormSubCategory}
                  className="flex flex-col space-y-1"
                >
                  {subCategoryMap.lopning.map((sub) => (
                    <div key={sub.value} className="flex items-center space-x-2">
                      <RadioGroupItem value={sub.value} id={sub.value} />
                      <Label htmlFor={sub.value} className="font-normal cursor-pointer">
                        {sub.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="duration">Tid</Label>
              <Input
                id="duration"
                type="text"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="T.ex. 45 eller 1:30"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pace">Fart</Label>
              <Input
                id="pace"
                type="text"
                value={pace}
                onChange={(e) => setPace(e.target.value)}
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

      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Importera träningspass</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Välj CSV-fil</Label>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            {isImporting ? (
              <div className="flex items-center space-x-2">
                <div className="h-4 w-4 border border-primary rounded-full animate-spin"></div>
                <span>Importerar...</span>
              </div>
            ) : (
              <>
                {csvData.length > 0 && (
                  <>
                    <div className="space-y-2">
                      <Label>Förhandsgranskning</Label>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Namn</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aktivitet</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Passkategori</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tid</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fart</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ansträngning</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Beskrivning</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {validRows.map((row, index) => (
                              <tr key={index}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.activity}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.passCategory || '-'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.time || '-'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.pace || '-'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.effort}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.description || '-'}</td>
                              </tr>
                            ))}
                            {errors.map((err, index) => (
                              <tr key={`err-${index}`}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600" colSpan="7">
                                  {err}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-sm text-gray-500">
                          {validRows.length} pass redo att importera, {errors.length} fel
                        </span>
                        <Button
                          onClick={handleImport}
                          disabled={validRows.length === 0 || isImporting}
                          className="px-4 py-2"
                        >
                          Importera
                        </Button>
                      </div>
                    </>
                  )}
                )}
                {csvData.length === 0 && (
                  <p className="text-center text-gray-500">Ingen fil vald</p>
                )}
              </>
            )}
          </div>
          <Button onClick={() => setShowImportDialog(false)} className="mt-4 w-full">
            Avbryt
          </Button>
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