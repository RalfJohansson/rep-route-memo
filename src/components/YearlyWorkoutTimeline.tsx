import React from "react";
import {
  eachDayOfInterval,
  startOfYear,
  endOfYear,
  format,
  isSameDay,
  getDay,
  addDays,
  startOfWeek,
  isFirstDayOfMonth,
} from "date-fns";
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

  // Map workouts to a more accessible structure for quick lookup
  const workoutsByDate: { [key: string]: CompletedWorkout[] } = completedWorkouts.reduce((acc, workout) => {
    const dateKey = format(new Date(workout.scheduled_date), "yyyy-MM-dd");
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(workout);
    return acc;
  }, {});

  // Weekday labels (Mon, Tue, ..., Sun)
  const weekDaysLabels = Array.from({ length: 7 }, (_, i) => format(addDays(new Date(2023, 0, 2), i), "EEEEEE", { locale: sv }));

  // Generate all days from the first Monday of the year (or previous year) to the last Sunday of the year
  const firstDayOfCalendar = startOfWeek(yearStart, { weekStartsOn: 1 });
  const lastDayOfCalendar = endOfWeek(yearEnd, { weekStartsOn: 1 });
  const allDaysInCalendar = eachDayOfInterval({ start: firstDayOfCalendar, end: lastDayOfCalendar });

  // Group days into weeks
  const weeks: (Date | null)[][] = [];
  let currentWeek: (Date | null)[] = [];

  allDaysInCalendar.forEach((day) => {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });
  // Add any remaining days in the last week, padding with nulls
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push(null);
    }
    weeks.push(currentWeek);
  }

  // Calculate month headers positions
  const monthHeaders: { month: string; weekIndex: number }[] = [];
  let lastMonth = -1; // To track when a new month starts

  weeks.forEach((week, weekIndex) => {
    const firstDayOfWeek = week.find(day => day !== null); // Find the first actual day in the week
    if (firstDayOfWeek) {
      const currentMonth = firstDayOfWeek.getMonth();
      if (currentMonth !== lastMonth && firstDayOfWeek.getFullYear() === currentYear) {
        monthHeaders.push({ month: format(firstDayOfWeek, "MMM", { locale: sv }), weekIndex });
        lastMonth = currentMonth;
      }
    }
  });

  // Calculate the total width of the timeline for the month headers to position correctly
  const weekColumnWidth = 20; // Each day cell is w-4 (16px) + gap-1 (4px) = 20px for a week column
  const totalTimelineWidth = weeks.length * weekColumnWidth;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Årsöversikt {currentYear}</CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="flex">
          {/* Weekday labels on the left */}
          <div className="flex flex-col gap-1 text-xs text-muted-foreground mr-2 pt-6"> {/* pt-6 to align with first day row */}
            {weekDaysLabels.map((day, index) => (
              <div key={index} className="h-4 flex items-center justify-end">
                {day}
              </div>
            ))}
          </div>

          {/* Scrollable timeline content */}
          <div className="flex-1 overflow-x-auto pb-2"> {/* pb-2 for scrollbar */}
            <div className="relative flex h-full" style={{ width: `${totalTimelineWidth}px` }}>
              {/* Month headers - positioned absolutely */}
              {monthHeaders.map(({ month, weekIndex }) => (
                <div
                  key={month}
                  className="absolute text-xs text-muted-foreground"
                  style={{ left: `${weekIndex * weekColumnWidth}px`, top: 0 }}
                >
                  {month}
                </div>
              ))}

              {/* Weeks container */}
              <div className="flex mt-6"> {/* mt-6 to make space for month headers */}
                {weeks.map((week, weekIndex) => (
                  <div key={weekIndex} className="flex flex-col gap-1 flex-shrink-0 w-5"> {/* w-5 for 4px cell + 1px gap */}
                    {week.map((day, dayIndex) => {
                      if (!day || day.getFullYear() !== currentYear) { // Only show days within the current year
                        return <div key={`empty-${weekIndex}-${dayIndex}`} className="w-4 h-4" />; // Empty cell for padding
                      }
                      const dateKey = format(day, "yyyy-MM-dd");
                      const workoutsOnDay = workoutsByDate[dateKey] || [];
                      const hasWorkout = workoutsOnDay.length > 0;
                      const isToday = isSameDay(day, new Date());

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
                ))}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default YearlyWorkoutTimeline;