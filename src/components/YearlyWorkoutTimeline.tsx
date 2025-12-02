import React from "react";
import { eachDayOfInterval, startOfYear, endOfYear, format, isSameDay, getDay } from "date-fns";
import { sv } from "date-fns/locale";
import { cn, getCategoryColor } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CompletedWorkout {
  scheduled_date: string;
  workout_library: {
    category: string;
  };
}

interface YearlyWorkoutTimelineProps {
  completedWorkouts: CompletedWorkout[];
}

const YearlyWorkoutTimeline = ({ completedWorkouts }: YearlyWorkoutTimelineProps) => {
  const currentYear = new Date().getFullYear();
  const yearStart = startOfYear(new Date(currentYear, 0, 1));
  const yearEnd = endOfYear(new Date(currentYear, 0, 1));
  const allDaysInYear = eachDayOfInterval({ start: yearStart, end: yearEnd });

  // Map workouts to a more accessible structure for quick lookup
  const workoutsByDate: { [key: string]: CompletedWorkout[] } = completedWorkouts.reduce((acc, workout) => {
    const dateKey = format(new Date(workout.scheduled_date), "yyyy-MM-dd");
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(workout);
    return acc;
  }, {});

  const months = Array.from({ length: 12 }, (_, i) => format(new Date(currentYear, i, 1), "MMM", { locale: sv }));
  const weekDays = Array.from({ length: 7 }, (_, i) => format(addDays(new Date(2023, 0, 2), i), "EEEEEE", { locale: sv })); // Mon-Sun

  // Determine the first day of the year's week (0 for Sunday, 1 for Monday, etc.)
  const firstDayOfWeekOfYear = getDay(yearStart); // 0 = Sunday, 1 = Monday

  // Create a grid for the year, padding the start to align with the first day of the week
  const dayGrid: (Date | null)[] = [];
  for (let i = 0; i < firstDayOfWeekOfYear; i++) {
    dayGrid.push(null); // Pad with nulls for days before Jan 1st
  }
  dayGrid.push(...allDaysInYear);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Årsöversikt {currentYear}</CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="flex flex-col items-start">
          {/* Month labels */}
          <div className="grid grid-cols-13 gap-1 w-full text-xs text-muted-foreground mb-2">
            <div className="col-span-1"></div> {/* Empty space for weekday labels */}
            {months.map((month, index) => (
              <div key={month} className="text-center col-span-1">
                {month}
              </div>
            ))}
          </div>

          <div className="flex w-full">
            {/* Weekday labels */}
            <div className="flex flex-col gap-1 text-xs text-muted-foreground mr-2">
              {weekDays.map((day, index) => (
                <div key={index} className="h-4 flex items-center justify-end">
                  {day}
                </div>
              ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-53 gap-1 flex-1"> {/* Roughly 53 weeks in a year */}
              {dayGrid.map((day, index) => {
                if (!day) {
                  return <div key={`pad-${index}`} className="w-4 h-4" />; // Empty cell for padding
                }
                const dateKey = format(day, "yyyy-MM-dd");
                const workoutsOnDay = workoutsByDate[dateKey] || [];
                const hasWorkout = workoutsOnDay.length > 0;
                const isToday = isSameDay(day, new Date());

                // Use the color of the first workout if multiple exist
                const dotColor = hasWorkout ? getCategoryColor(workoutsOnDay[0].workout_library.category) : "transparent";

                return (
                  <div
                    key={dateKey}
                    className={cn(
                      "w-4 h-4 rounded-full flex items-center justify-center relative",
                      isToday && "border border-primary" // Highlight today
                    )}
                    title={hasWorkout ? `${format(day, "d MMM", { locale: sv })}: ${workoutsOnDay.map(w => w.workout_library.category).join(', ')}` : format(day, "d MMM", { locale: sv })}
                  >
                    {hasWorkout && (
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: dotColor }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default YearlyWorkoutTimeline;