import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface WorkoutDetailDialogProps {
  workout: {
    name: string;
    duration: string | null;
    effort: number | null;
    description: string | null;
    category: string;
    pace?: string | null;
    completed?: boolean;
    trained_time?: number | null;
    distance?: number | null;
    actual_pace?: string | null;
    notes?: string | null;
    joy_rating?: number | null;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

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

const WorkoutDetailDialog = ({ workout, open, onOpenChange }: WorkoutDetailDialogProps) => {
  const [paceZones, setPaceZones] = useState<any>(null);
  const [showPaceZones, setShowPaceZones] = useState(false);

  useEffect(() => {
    if (open) {
      fetchPaceZones();
    }
  }, [open]);

  const fetchPaceZones = async () => {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) return;

      const { data, error } = await supabase
        .from("pace_zones")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setPaceZones(data);
      }
    } catch (error: any) {
      console.error("Error fetching pace zones:", error);
    }
  };

  if (!workout) return null;

  const effortColors = [
    "#00A000", // 1
    "#33B300", // 2
    "#66C600", // 3
    "#99D900", // 4
    "#CCCC00", // 5
    "#FFBF00", // 6
    "#FF9900", // 7
    "#FF6600", // 8
    "#FF3300", // 9
    "#FF0000", // 10
  ];

  const getEffortColor = (index: number, effort: number) => {
    if (index > effort) return "bg-muted";
    return effortColors[index - 1];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] sm:max-w-md p-0 gap-0 rounded-2xl max-h-[90vh] flex flex-col">
        <div 
          className="text-white px-4 py-3 rounded-t-2xl flex-shrink-0"
          style={{ backgroundColor: getCategoryColor(workout.category) }}
        >
          <h2 className="text-lg font-semibold">{workout.name}</h2>
        </div>
        
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {workout.completed && (
            <div className="bg-accent/10 rounded-lg p-3 space-y-3 mb-4">
              <h3 className="font-semibold text-sm">Genomförd träning</h3>
              <div className="grid grid-cols-2 gap-4">
                {workout.trained_time && (
                  <div>
                    <p className="text-xs text-muted-foreground">Tränad tid</p>
                    <p className="font-medium">{workout.trained_time} min</p>
                  </div>
                )}
                {workout.distance && (
                  <div>
                    <p className="text-xs text-muted-foreground">Distans</p>
                    <p className="font-medium">{workout.distance} km</p>
                  </div>
                )}
                {workout.actual_pace && (
                  <div>
                    <p className="text-xs text-muted-foreground">Tempo</p>
                    <p className="font-medium">{workout.actual_pace}</p>
                  </div>
                )}
                {workout.joy_rating && (
                  <div>
                    <p className="text-xs text-muted-foreground">Glädje</p>
                    <p className="font-medium">{workout.joy_rating}/5</p>
                  </div>
                )}
              </div>
              {workout.notes && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Anteckningar</p>
                  <p className="text-sm whitespace-pre-wrap">{workout.notes}</p>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold mb-1 text-sm">Planerad tid</h3>
              <p className="text-muted-foreground text-sm">
                {workout.duration || "-"}
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-1 text-sm">Planerad fart</h3>
              <p className="text-muted-foreground text-sm">{workout.pace || "-"}</p>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2 text-sm">Ansträngning</h3>
            <div className="flex gap-1 mb-1">
              {[...Array(10)].map((_, i) => {
                const color = getEffortColor(i + 1, workout.effort || 0);
                return (
                  <div
                    key={i}
                    className={`flex-1 h-4 rounded-full ${typeof color === 'string' && color.startsWith('#') ? '' : color}`}
                    style={typeof color === 'string' && color.startsWith('#') ? { backgroundColor: color } : undefined}
                  />
                );
              })}
            </div>
            <p className="text-right text-xs text-muted-foreground">
              {workout.effort || 0} - {workout.effort && workout.effort > 7 ? "hög" : workout.effort && workout.effort > 4 ? "medel" : "låg"}
            </p>
          </div>

          <div className="flex flex-col max-h-[30vh]">
            <h3 className="font-semibold mb-1 text-sm">Beskrivning</h3>
            <div className="overflow-y-auto flex-1">
              <p className="text-muted-foreground text-sm whitespace-pre-wrap">
                {workout.description || "Ingen beskrivning tillgänglig"}
              </p>
            </div>
          </div>

          {paceZones && (
            <Collapsible open={showPaceZones} onOpenChange={setShowPaceZones}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full">
                  <span>Visa tempozoner</span>
                  <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${showPaceZones ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 mt-2">
                <div className="grid grid-cols-2 gap-3 p-3 bg-muted rounded-lg">
                  <div>
                    <p className="text-xs font-medium">1k</p>
                    <p className="text-sm text-muted-foreground">{paceZones.pace_1k}/km</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium">5k</p>
                    <p className="text-sm text-muted-foreground">{paceZones.pace_5k}/km</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium">10k</p>
                    <p className="text-sm text-muted-foreground">{paceZones.pace_10k}/km</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium">Halvmara</p>
                    <p className="text-sm text-muted-foreground">{paceZones.pace_half_marathon}/km</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium">Marathon</p>
                    <p className="text-sm text-muted-foreground">{paceZones.pace_marathon}/km</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium">Distansfart</p>
                    <p className="text-sm text-muted-foreground">{paceZones.pace_easy}/km</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium">Intervall</p>
                    <p className="text-sm text-muted-foreground">{paceZones.pace_interval}/km</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium">Tröskel</p>
                    <p className="text-sm text-muted-foreground">{paceZones.pace_threshold}/km</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium">Tempo</p>
                    <p className="text-sm text-muted-foreground">{paceZones.pace_tempo}/km</p>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WorkoutDetailDialog;
