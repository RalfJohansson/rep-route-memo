import { Dialog, DialogContent } from "@/components/ui/dialog";

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
          className="text-white px-6 py-4 rounded-t-2xl flex-shrink-0"
          style={{ backgroundColor: getCategoryColor(workout.category) }}
        >
          <h2 className="text-xl font-semibold">{workout.name}</h2>
        </div>
        
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {workout.completed && (
            <div className="bg-accent/10 rounded-xl p-4 space-y-3 border border-accent/20">
              <h3 className="font-semibold text-base">Genomförd träning</h3>
              <div className="grid grid-cols-2 gap-4">
                {workout.trained_time && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Tränad tid</p>
                    <p className="font-semibold text-base">{workout.trained_time} min</p>
                  </div>
                )}
                {workout.distance && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Distans</p>
                    <p className="font-semibold text-base">{workout.distance} km</p>
                  </div>
                )}
                {workout.actual_pace && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Tempo</p>
                    <p className="font-semibold text-base">{workout.actual_pace}</p>
                  </div>
                )}
                {workout.joy_rating && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Glädje</p>
                    <p className="font-semibold text-base">{workout.joy_rating}/5</p>
                  </div>
                )}
              </div>
              {workout.notes && (
                <div className="pt-2 border-t border-accent/20">
                  <p className="text-xs text-muted-foreground mb-1">Anteckningar</p>
                  <p className="text-sm whitespace-pre-wrap">{workout.notes}</p>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2 text-base">Planerad tid</h3>
              <p className="text-foreground/80 text-lg font-medium">
                {workout.duration || "-"}
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2 text-base">Planerad fart</h3>
              <p className="text-foreground/80 text-lg font-medium">{workout.pace || "-"}</p>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-3 text-base">Ansträngning</h3>
            <div className="space-y-2">
              <div className="flex gap-1.5">
                {[...Array(10)].map((_, i) => {
                  const color = getEffortColor(i + 1, workout.effort || 0);
                  return (
                    <div
                      key={i}
                      className={`flex-1 h-6 rounded-full ${typeof color === 'string' && color.startsWith('#') ? '' : color}`}
                      style={typeof color === 'string' && color.startsWith('#') ? { backgroundColor: color } : undefined}
                    />
                  );
                })}
              </div>
              <div className="flex justify-end">
                <p className="text-sm text-muted-foreground font-medium">
                  {workout.effort || 0} - {workout.effort && workout.effort > 7 ? "hög" : workout.effort && workout.effort > 4 ? "medel" : "låg"}
                </p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-3 text-base">Beskrivning</h3>
            <div className="bg-muted/30 rounded-lg p-4 max-h-[30vh] overflow-y-auto">
              <p className="text-foreground/80 text-sm whitespace-pre-wrap leading-relaxed">
                {workout.description || "Ingen beskrivning tillgänglig"}
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WorkoutDetailDialog;
