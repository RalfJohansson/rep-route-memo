import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, FileText, AlertCircle, CheckCircle, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CsvRow {
  namn: string;
  aktivitet: string;
  passkategori: string;
  tid: string;
  fart: string;
  anstrangning: string;
  beskrivning: string;
}

interface ValidatedWorkout {
  row: number;
  data: CsvRow;
  isValid: boolean;
  errors: string[];
  workout?: {
    name: string;
    category: string;
    duration: string | null;
    effort: number;
    description: string | null;
    pace: string | null;
  };
}

interface CsvImportDialogProps {
  trigger?: React.ReactNode;
  onImportComplete?: () => void;
}

const validActivities = ["Löpning", "Cykling", "Simning", "Styrka", "Tävling"];
const validSubCategories = ["Intervallpass", "Distanspass", "Långpass"];

const activityToCategory: Record<string, string> = {
  "Löpning": "lopning",
  "Cykling": "cykling",
  "Simning": "simning",
  "Styrka": "styrka",
  "Tävling": "tävling",
};

const subCategoryToCategory: Record<string, string> = {
  "Intervallpass": "intervallpass",
  "Distanspass": "distanspass",
  "Långpass": "långpass",
};

const CsvImportDialog = ({ trigger, onImportComplete }: CsvImportDialogProps) => {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ValidatedWorkout[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [existingWorkouts, setExistingWorkouts] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadExistingWorkouts = async () => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;

    const { data } = await supabase
      .from("workout_library")
      .select("name, category")
      .eq("user_id", user.id);

    if (data) {
      const workoutKeys = new Set<string>();
      data.forEach((w) => {
        workoutKeys.add(`${w.name.toLowerCase()}|${w.category}`);
      });
      setExistingWorkouts(workoutKeys);
    }
  };

  const parseCSV = (text: string): CsvRow[] => {
    const lines = text.split("\n").filter((line) => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(";").map((h) => h.trim().toLowerCase());
    const rows: CsvRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(";").map((v) => v.trim());
      const row: Partial<CsvRow> = {};

      headers.forEach((header, index) => {
        const value = values[index] || "";
        if (header === "namn") row.namn = value;
        else if (header === "aktivitet") row.aktivitet = value;
        else if (header === "passkategori") row.paskategori = value;
        else if (header === "tid") row.tid = value;
        else if (header === "fart") row.fart = value;
        else if (header === "anstrangning") row.anstrangning = value;
        else if (header === "beskrivning") row.beskrivning = value;
      });

      rows.push(row as CsvRow);
    }

    return rows;
  };

  const validateRow = (row: CsvRow, rowIndex: number, existingKeys: Set<string>): ValidatedWorkout => {
    const errors: string[] = [];
    let category = "";

    // Validate required fields
    if (!row.namn?.trim()) {
      errors.push("Saknar namn");
    }

    if (!row.aktivitet?.trim()) {
      errors.push("Saknar aktivitet");
    } else if (!validActivities.includes(row.aktivitet)) {
      errors.push(`Ogiltig aktivitet: ${row.aktivitet}`);
    }

    if (!row.anstrangning?.trim()) {
      errors.push("Saknar ansträngning");
    } else {
      const effort = parseInt(row.anstrangning);
      if (isNaN(effort) || effort < 1 || effort > 10) {
        errors.push("Ansträngning måste vara mellan 1-10");
      }
    }

    // Handle category and subcategory
    if (row.aktivitet === "Löpning") {
      if (!row.paskategori?.trim()) {
        errors.push("Saknar passkategori för löpning");
      } else if (!validSubCategories.includes(row.paskategori)) {
        errors.push(`Ogiltig passkategori: ${row.paskategori}`);
      } else {
        category = subCategoryToCategory[row.paskategori] || "";
      }
    } else {
      category = activityToCategory[row.aktivitet] || "";
    }

    // Check for duplicates
    if (row.namn?.trim() && category && errors.length === 0) {
      const key = `${row.namn.toLowerCase().trim()}|${category}`;
      if (existingKeys.has(key)) {
        errors.push("Passet finns redan (dubblett)");
      }
    }

    const isValid = errors.length === 0;

    return {
      row: rowIndex + 1,
      data: row,
      isValid,
      errors,
      workout: isValid
        ? {
            name: row.namn.trim(),
            category,
            duration: row.tid?.trim() || null,
            effort: parseInt(row.anstrangning) || 5,
            description: row.beskrivning?.trim() || null,
            pace: row.fart?.trim() || null,
          }
        : undefined,
    };
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setIsProcessing(true);

    try {
      await loadExistingWorkouts();
      const text = await selectedFile.text();
      const rows = parseCSV(text);

      if (rows.length === 0) {
        toast.error("CSV-filen är tom eller har fel format");
        setIsProcessing(false);
        return;
      }

      const validated = rows.map((row, index) => validateRow(row, index, existingWorkouts));
      setParsedData(validated);
    } catch (error) {
      toast.error("Kunde inte läsa CSV-filen");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = async () => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;

    const validWorkouts = parsedData.filter((w) => w.isValid && w.workout);
    if (validWorkouts.length === 0) {
      toast.error("Inga giltiga pass att importera");
      return;
    }

    setIsImporting(true);

    try {
      const workoutsToInsert = validWorkouts.map((w) => ({
        name: w.workout!.name,
        category: w.workout!.category as any,
        duration: w.workout!.duration,
        effort: w.workout!.effort,
        description: w.workout!.description,
        pace: w.workout!.pace,
        user_id: user.id,
      }));

      const { error } = await supabase.from("workout_library").insert(workoutsToInsert);

      if (error) {
        toast.error("Kunde inte importera pass: " + error.message);
      } else {
        toast.success(`${workoutsToInsert.length} pass importerade!`);
        setOpen(false);
        setFile(null);
        setParsedData([]);
        onImportComplete?.();
      }
    } catch (error) {
      toast.error("Ett fel uppstod vid import");
    } finally {
      setIsImporting(false);
    }
  };

  const resetAndClose = () => {
    setOpen(false);
    setFile(null);
    setParsedData([]);
  };

  const validCount = parsedData.filter((w) => w.isValid).length;
  const invalidCount = parsedData.filter((w) => !w.isValid).length;
  const duplicateCount = parsedData.filter((w) => w.errors.includes("Passet finns redan (dubblett)")).length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild onClick={() => { setFile(null); setParsedData([]); }}>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Importera träningspass</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {!file ? (
            <div
              className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-muted-foreground/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-2">
                Klicka för att välja en CSV-fil
              </p>
              <p className="text-xs text-muted-foreground">
                Format: namn;aktivitet;passkategori;tid;fart;anstrangning;beskrivning
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          ) : isProcessing ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-sm text-muted-foreground">Läser in CSV-fil...</p>
            </div>
          ) : (
            <>
              {/* File info */}
              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{parsedData.length} rader</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFile(null);
                    setParsedData([]);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Summary */}
              <div className="flex gap-2">
                <div className="flex-1 p-3 bg-green-50 border border-green-200 rounded-lg text-center">
                  <p className="text-2xl font-bold text-green-600">{validCount}</p>
                  <p className="text-xs text-green-600">Klara</p>
                </div>
                <div className="flex-1 p-3 bg-red-50 border border-red-200 rounded-lg text-center">
                  <p className="text-2xl font-bold text-red-600">{invalidCount}</p>
                  <p className="text-xs text-red-600">Fel</p>
                </div>
                {duplicateCount > 0 && (
                  <div className="flex-1 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
                    <p className="text-2xl font-bold text-yellow-600">{duplicateCount}</p>
                    <p className="text-xs text-yellow-600">Dubbletter</p>
                  </div>
                )}
              </div>

              {/* Errors list */}
              {invalidCount > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-1">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    Fel ({invalidCount})
                  </Label>
                  <div className="max-h-40 overflow-y-auto space-y-1 bg-red-50/50 rounded-lg p-2">
                    {parsedData
                      .filter((w) => !w.isValid)
                      .map((w) => (
                        <div key={w.row} className="text-xs p-2 bg-white rounded border">
                          <span className="font-medium">Rad {w.row}:</span>{" "}
                          {w.data.namn || "(tom rad)"} - {w.errors.join(", ")}
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter className="flex-shrink-0">
          <Button variant="outline" onClick={resetAndClose}>
            Avbryt
          </Button>
          {file && parsedData.length > 0 && (
            <Button onClick={handleImport} disabled={isImporting || validCount === 0}>
              {isImporting ? "Importerar..." : `Importera ${validCount} pass`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CsvImportDialog;