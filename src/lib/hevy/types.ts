export type HevySetType = "warmup" | "normal" | "failure" | "dropset";

export interface HevySet {
  index?: number;
  type: HevySetType;
  weight_kg: number | null;
  reps: number | null;
  distance_meters?: number | null;
  duration_seconds?: number | null;
  rpe?: number | null;
  custom_metric?: number | null;
}

export interface HevyWorkoutExercise {
  index: number;
  title: string;
  notes?: string | null;
  exercise_template_id: string;
  superset_id?: number | null;
  sets: HevySet[];
}

export interface HevyWorkout {
  id: string;
  title: string;
  routine_id?: string | null;
  description?: string | null;
  start_time: string;
  end_time: string;
  updated_at: string;
  created_at: string;
  exercises: HevyWorkoutExercise[];
}

export interface HevyRoutineSet {
  index?: number;
  type: HevySetType;
  weight_kg: number | null;
  reps: number | null;
  distance_meters?: number | null;
  duration_seconds?: number | null;
  rpe?: number | null;
}

export interface HevyRoutineExercise {
  index?: number;
  title?: string;
  exercise_template_id: string;
  superset_id: number | null;
  rest_seconds: number | null;
  notes?: string | null;
  sets: HevyRoutineSet[];
}

export interface HevyRoutine {
  id: string;
  title: string;
  folder_id?: number | null;
  notes?: string | null;
  updated_at: string;
  created_at: string;
  exercises: HevyRoutineExercise[];
}

export interface HevyExerciseTemplate {
  id: string;
  title: string;
  type: string;
  primary_muscle_group: string;
  secondary_muscle_groups: string[];
  is_custom: boolean;
}

export interface HevyWorkoutEvent {
  type: "updated" | "deleted";
  workout?: HevyWorkout;
  id?: string;
  deleted_at?: string;
}

export interface HevyRoutinePayload {
  routine: {
    title: string;
    folder_id?: number | null;
    notes?: string;
    exercises: Array<{
      exercise_template_id: string;
      superset_id: number | null;
      rest_seconds: number;
      notes?: string;
      sets: Array<{
        type: HevySetType;
        weight_kg: number | null;
        reps: number | null;
        distance_meters?: number | null;
        duration_seconds?: number | null;
      }>;
    }>;
  };
}
