import { Dialog, DialogContent } from "@/components/ui/dialog";

interface WorkoutDetailDialogProps {
  workout: {
    name: string;
    duration: number | null;
    effort: number | null;
    description: string | null;
    category: string;
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
          className="text-white px-4 py-3 rounded-t-2xl flex-shrink-0"
          style={{ backgroundColor: getCategoryColor(workout.category) }}
        >
          <h2 className="text-lg font-semibold">{workout.name}</h2>
        </div>
        
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold mb-1 text-sm">Tid</h3>
              <p className="text-muted-foreground text-sm">
                {workout.duration ? `${workout.duration} min` : "-"}
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-1 text-sm">Fart</h3>
              <p className="text-muted-foreground text-sm">-</p>
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
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WorkoutDetailDialog;
