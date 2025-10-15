import { Dialog, DialogContent } from "@/components/ui/dialog";

interface WorkoutDetailDialogProps {
  workout: {
    name: string;
    duration: number | null;
    effort: number | null;
    description: string | null;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

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
      <DialogContent className="max-w-lg p-0 gap-0">
        <div className="bg-orange-500/90 text-white px-6 py-4 rounded-t-lg">
          <h2 className="text-xl font-semibold">{workout.name}</h2>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2">Tid</h3>
              <p className="text-muted-foreground">
                {workout.duration ? `${workout.duration} min` : "-"}
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Fart</h3>
              <p className="text-muted-foreground">-</p>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-3">Ansträngning</h3>
            <div className="flex gap-2 mb-2">
              {[...Array(10)].map((_, i) => {
                const color = getEffortColor(i + 1, workout.effort || 0);
                return (
                  <div
                    key={i}
                    className={`flex-1 h-8 rounded-full ${typeof color === 'string' && color.startsWith('#') ? '' : color}`}
                    style={typeof color === 'string' && color.startsWith('#') ? { backgroundColor: color } : undefined}
                  />
                );
              })}
            </div>
            <p className="text-right text-sm text-muted-foreground">
              {workout.effort || 0} - {workout.effort && workout.effort > 7 ? "hög" : workout.effort && workout.effort > 4 ? "medel" : "låg"}
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Beskrivning</h3>
            <p className="text-muted-foreground">
              {workout.description || "Ingen beskrivning tillgänglig"}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WorkoutDetailDialog;
