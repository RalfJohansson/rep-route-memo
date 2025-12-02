import React from "react";
import {
  eachDayOfInterval,
  startOfYear,
  endOfYear,
  format,
  isSameDay,
  addDays,
  startOfWeek,
  endOfWeek,
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
  console.log("YearlyWorkoutTimeline component is rendering. (Simplified version)"); // Felsökningslogg
  console.log("Completed workouts received:", completedWorkouts.length);

  // Temporärt förenklad rendering för felsökning
  return (
    <Card className="border-4 border-solid border-blue-700 bg-blue-100 p-6 text-center">
      <CardHeader>
        <CardTitle className="text-blue-900">Årsöversikt (Felsökning)</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-blue-800">Denna komponent renderas!</p>
        <p className="text-blue-800">Antal genomförda pass: {completedWorkouts.length}</p>
      </CardContent>
    </Card>
  );
};

export default YearlyWorkoutTimeline;