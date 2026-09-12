import { useEffect, useState, useRef } from "react";
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
import { Plus, Edit, Trash2 } from "lucide-react";
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
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importRows, setImportRows] = useState<any[]>([]);
  const [importErrors, setImportErrors] = useState<any[]>([]);
  const [importValid, setImportValid] = useState<any[]>([]);
  const [importDuplicates, setImportDuplicates] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("valid");
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // CSV Import handlers
    const handleImportClick = () => {
      setShowImportDialog(true);
      fileInputRef.current?.click();
    };
  
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    setImportLoading(true);
    try {
          let text = await file.text();
          // Strip UTF-8 BOM if present
          if (text.startsWith('\uFEFF')) {
            text = text.slice(1);
          }
      const rows = parseCSV(text);
      setImportRows(rows);
      toast.info(`Läste ${rows.length} rader från CSV-filen`);
      await validateAndPrepareImport(rows);
    } catch (err) {
      console.error("Error reading CSV:", err);
      toast.error("Kunde inte läsa filen");
    } finally {
      setImportLoading(false);
    }
  };

  const parseCSV = (text: string): any[] => {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length === 0) return [];
    const headers = lines[0].split(",").map((h) => h.trim());
    const rows: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line === "") continue;
      const values = line.split(",").map((v) => v.trim());
      const row: any = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx] !== undefined ? values[idx] : "";
      });
      rows.push(row);
    }
    return rows;
  };

  const validateAndPrepareImport = async (rows: any[]) => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) {
      toast.error("Ingen användare inloggad");
      return;
    }
    // Fetch latest workouts for duplicate check
    const { data: existingWorkouts, error: fetchError } = await supabase
      .from("workout_library")
      .select("name, category")
      .eq("user_id", user.id);
    if (fetchError) {
      console.error("Error fetching workouts for duplicate check:", fetchError);
      toast.error("Kunde inte hämta befintliga pass för dubbelkontroll");
      return;
    }
    const existingSet = new Set(
      existingWorkouts?.map((w: any) => `${w.name}|${w.category}`) || []
    );

    const activityMap: Record<string, string> = {
      Löpning: "lopning",
      Cykling: "cykling",
      Simning: "simning",
      Styrka: "styrka",
      Tävling: "tävling",
    };
    const passCategoryMap: Record<string, string> = {
      Intervallpass: "intervallpass",
      Distanspass: "distanspass",
      Långpass: "långpass",
    };

    const valid: any[] = [];
    const errors: any[] = [];
    const duplicates: any[] = [];

    rows.forEach((row, index) => {
      const rowNum = index + 1; // 1-based for display
      const name = row.namn?.trim() ?? "";
      const activity = row.aktivitet?.trim() ?? "";
      const passCategory = row.passkategori?.trim() ?? "";
      const tid = row.tid?.trim() ?? "";
      const fart = row.fart?.trim() ?? "";
      const anstrangningStr = row.anstrangning?.trim() ?? "";
      const beskrivning = row.beskrivning?.trim() ?? "";

      // Validate required fields
      if (!name) {
        errors.push({ row: rowNum, message: "Namn saknas" });
        return;
      }
      if (!activity) {
        errors.push({ row: rowNum, message: "Aktivitet saknas" });
        return;
      }
      if (!activityMap[activity]) {
        errors.push({ row: rowNum, message: `Ogiltig aktivitet: ${activity}` });
        return;
      }
      const effortNum = parseInt(anstrangningStr, 10);
      if (isNaN(effortNum) || effortNum < 1 || effortNum > 10) {
        errors.push({ row: rowNum, message: "Ansträngning måste vara ett heltal mellan 1 och 10" });
        return;
      }

      // Determine category to store
      let storedCategory: string;
      if (activity === "Löpning") {
        if (!passCategory) {
          errors.push({ row: rowNum, message: "Passkategori saknas för Löpning" });
          return;
        }
        if (!passCategoryMap[passCategory]) {
          errors.push({ row: rowNum, message: `Ogiltig passkategori för Löpning: ${passCategory}` });
          return;
        }
        storedCategory = passCategoryMap[passCategory];
      } else {
        // For other activities, ignore passkategori column (even if present)
        storedCategory = activityMap[activity];
      }

      // Check duplicate
      const duplicateKey = `${name}|${storedCategory}`;
      if (existingSet.has(duplicateKey)) {
        duplicates.push({ row: rowNum, name, activity: activityMap[activity], passCategory, message: "Passet finns redan (namn + aktivitet)" });
        return;
      }

      // Build workout object
      const workout: any = {
        name,
        category: storedCategory,
        duration: tid || null,
        effort: effortNum,
        pace: fart || null,
        description: beskrivning || null,
        user_id: user.id,
      };
      valid.push({ row: rowNum, workout, original: row });
    });

    setImportValid(valid);
    setImportErrors(errors);
    setImportDuplicates(duplicates);
    toast.info(`Validering klar: ${valid.length} giltiga, ${errors.length} fel, ${duplicates.length} dubbletter`);
  };

  const handleImportConfirm = async () => {
    if (importValid.length === 0 && importDuplicates.length === 0) {
      toast.warning("Inga pass att importera");
      return;
    }
    setImportLoading(true);
    try {
      // Insert valid workouts
      const toInsert = importValid.map((v) => v.workout);
      const { error: insertError } = await supabase
        .from("workout_library")
        .insert(toInsert);
      if (insertError) {
        console.error("Error inserting workouts:", insertError);
        toast.error("Kunde inte importera pass");
        return;
      }
      // Success
      toast.success(`Importerade ${toInsert.length} pass`);
      // Refresh workouts
      await fetchWorkouts();
    } catch (err) {
      console.error("Error during import:", err);
      toast.error("Något gick fel vid import");
    } finally {
      setImportLoading(false);
      setShowImportDialog(false);
      // Reset import state
      setImportFile(null);
      setImportRows([]);
      setImportErrors([]);
      setImportValid([]);
      setImportDuplicates([]);
      setActiveTab("valid");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Bibliotek</h1>
        <div className="flex gap-2">
          <Button onClick={() => handleOpenDialog()} className="h-8 px-3 text-xs">
                    <Plus className="h-3 w-3 mr-1" />
                    Nytt pass
                  </Button>
          <Button onClick={handleImportClick} disabled={importLoading} className="h-8 px-3 text-xs">
                      {importLoading ? (
                        <span>Importerar...</span>
                      ) : (
                        <>
                          <span>Importera träningspass</span>
                        </>
                      )}
                    </Button>
          <input
            type="file"
            accept=".csv"
            ref={fileInputRef}
            style={{ display: "none" }}
            onChange={handleFileChange}
          />
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
              <>
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
                                    <Edit className="h-4 w-4" style={{ color: "#c99a3e" }} />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteWorkout(workout.id)}
                                    className="text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4" style={{ color: "#c4574a" }} />
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
              </>
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
                            <Edit className="h-4 w-4" style={{ color: "#c99a3e" }} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteWorkout(workout.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" style={{ color: "#c4574a" }} />
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

      {/* Import Dialog */}
            <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Importera träningspass</DialogTitle>
                </DialogHeader>
          <div className="space-y-4">
            {importLoading ? (
              <div className="flex items-center justify-center py-8">
                <span>Läser in och validerar...</span>
              </div>
            ) : (
              <>
                <Tabs value={importErrors.length > 0 ? "errors" : "valid"} onValueChange={(v) => setActiveTab(v)}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="valid" className="text-[11px]">
                      Giltiga pass ({importValid.length})
                    </TabsTrigger>
                    <TabsTrigger value="errors" className="text-[11px]">
                      Fel ({importErrors.length + importDuplicates.length})
                    </TabsTrigger>
                  </TabsList>

                  {importErrors.length > 0 || importDuplicates.length > 0 ? (
                    <TabsContent key="errors" value="errors" className="space-y-4">
                      <div className="space-y-2">
                        <h3 className="text-lg font-medium">Felaktiga rader</h3>
                        {importErrors.map((err) => (
                          <div key={err.row} className="p-3 bg-red-50 border border-red-200 rounded-md">
                            <p className="font-medium text-red-600">Rad {err.row}: {err.message}</p>
                          </div>
                        ))}
                        {importDuplicates.map((dup) => (
                          <div key={dup.row} className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                            <p className="font-medium text-yellow-600">Rad {dup.row}: {dup.message}</p>
                            <p className="text-sm text-muted-foreground">
                              Namn: {dup.name}, Aktivitet: {dup.activity}, Passkategori: {dup.passCategory || "-"}
                            </p>
                          </div>
                        ))}
                      </div>
                    </TabsContent>
                  ) : null}

                  <TabsContent key="valid" value="valid" className="space-y-4">
                    {importValid.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">Inga giltiga pass att importera</p>
                    ) : (
                      <div className="space-y-2">
                        <h3 className="text-lg font-medium">Pass som kommer att importeras</h3>
                        <div className="space-y-2">
                          {importValid.map((v) => (
                            <div key={v.row} className="p-3 bg-green-50 border border-green-200 rounded-md">
                              <p className="font-medium">{v.workout.name}</p>
                  <p className="text-sm text-muted-foreground">
                                      Aktivitet: {v.original.aktivitet}
                                      {v.original.passkategori ? `, Passkategori: ${v.original.passkategori}` : ""}
                                    </p>
                  {v.workout.duration && (
                    <p className="text-sm text-muted-foreground">Tid: {v.workout.duration}</p>
                  )}
                  {v.workout.pace && (
                    <p className="text-sm text-muted-foreground">Fart: {v.workout.pace}</p>
                  )}
                  {v.workout.description && (
                    <p className="text-sm text-muted-foreground">Beskrivning: {v.workout.description}</p>
                  )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
                <div className="mt-4 flex justify-end space-x-2">
                  <Button onClick={() => setShowImportDialog(false)} variant="outline">
                    Avbryt
                  </Button>
                  <Button
                    onClick={handleImportConfirm}
                    disabled={importLoading || (importValid.length === 0 && importDuplicates.length === 0)}
                    className="w-auto"
                  >
                    {importLoading ? "Importerar..." : "Importera"}
                  </Button>
                </div>
              </>
            )}
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