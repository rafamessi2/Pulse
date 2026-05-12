// Workout / Musculacao

export interface Exercise {
  id?: number;
  name: string;
  muscleGroup: string;
  sets: number;
  reps: string;
  restSeconds: number;
  notes?: string;
  order: number;
  // Cardio fields (optional -- only present when modalidade === 'cardio')
  modalidade?: 'forca' | 'cardio';
  tipoCardio?: string;
  tempoMinutos?: string;
  ritmoEsforco?: string;
}

export interface WorkoutTemplate {
  id?: number;
  name: string;
  letter: string;
  description?: string;
  exercises: Exercise[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SetLog {
  setNumber: number;
  targetReps: string;
  completedReps: number | null;
  weight: number | null;
  completed: boolean;
  notes?: string;
  // Cardio-only fields
  tempoRealizado?: number | null;
  distanciaKm?: number | null;
}

export interface ExerciseLog {
  exerciseId: number;
  exerciseName: string;
  muscleGroup: string;
  sets: SetLog[];
  notes?: string;
  previousBest?: { weight: number; reps: number };
  // Cardio snapshot fields (preserved from template at session start)
  modalidade?: 'forca' | 'cardio';
  tipoCardio?: string;
  tempoMinutos?: string;
  ritmoEsforco?: string;
}

export interface WorkoutSession {
  id?: number;
  templateId: number;
  templateName: string;
  templateLetter: string;
  date: Date;
  startTime: Date;
  endTime?: Date;
  durationMinutes?: number;
  exercises: ExerciseLog[];
  totalVolume?: number;
  completedExercises: number;
  totalExercises: number;
  notes?: string;
  rating?: number;
  /** Origem do registro: 'treino_rotina' = via aba Treino, 'cardio_avulso' = via aba Cardio */
  origem?: 'treino_rotina' | 'cardio_avulso';
}

// Cardio / Corrida

export type CardioType = 'leve' | 'intervalado' | 'tempo' | 'longao';

export interface CardioTemplate {
  id?: number;
  name: string;
  type: CardioType;
  targetDistance?: number;
  targetPaceMin?: number;
  targetPaceSec?: number;
  targetDurationMinutes?: number;
  description?: string;
  createdAt: Date;
}

export interface CardioSession {
  id?: number;
  templateId?: number;
  templateName?: string;
  type: CardioType;
  date: Date;
  distance: number;
  durationMinutes: number;
  durationSeconds: number;
  avgPaceMin: number;
  avgPaceSec: number;
  avgHeartRate?: number;
  perceivedEffort: number;
  notes?: string;
  calories?: number;
  /** Origem do registro: 'treino_rotina' = via aba Treino, 'cardio_avulso' = via aba Cardio */
  origem?: 'treino_rotina' | 'cardio_avulso';
}

// Stats

export interface PersonalRecord {
  exerciseName: string;
  weight: number;
  reps: number;
  date: Date;
}

export interface WeeklyStats {
  weekStart: Date;
  workoutCount: number;
  cardioCount: number;
  totalVolume: number;
  totalKm: number;
  totalMinutes: number;
}

// Settings

export interface AppSettings {
  id?: number;
  userName: string;
  defaultRestSeconds: number;
  weightUnit: 'kg' | 'lb';
  distanceUnit: 'km' | 'mi';
  theme: 'dark';
  createdAt: Date;
  updatedAt: Date;
}

// Draft (treino em andamento persistido)

export interface WorkoutDraft {
  id: number;
  templateId: number;
  templateLetter: string;
  templateName: string;
  startTime: string;
  elapsedSeconds: number;
  exerciseLogs: ExerciseLog[];
  savedAt: string;
}

// Peso corporal

export interface WeightEntry {
  id?: number;
  weight: number;
  date: Date;
  notes?: string;
}

// UI helpers

export type TabPage = 'dashboard' | 'treino' | 'cardio' | 'historico' | 'configuracoes';
