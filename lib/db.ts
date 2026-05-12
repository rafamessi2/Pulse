import Dexie, { type EntityTable } from 'dexie';
import type {
  WorkoutTemplate,
  WorkoutSession,
  CardioTemplate,
  CardioSession,
  AppSettings,
  WorkoutDraft,
  WeightEntry,
} from '@/types';

class PulseDatabase extends Dexie {
  workoutTemplates!: EntityTable<WorkoutTemplate, 'id'>;
  workoutSessions!: EntityTable<WorkoutSession, 'id'>;
  cardioTemplates!: EntityTable<CardioTemplate, 'id'>;
  cardioSessions!: EntityTable<CardioSession, 'id'>;
  settings!: EntityTable<AppSettings, 'id'>;
  workoutDraft!: EntityTable<WorkoutDraft, 'id'>;
  weightEntries!: EntityTable<WeightEntry, 'id'>;

  constructor() {
    super('PulseDB');

    this.version(1).stores({
      workoutTemplates: '++id, letter, name, createdAt',
      workoutSessions: '++id, templateId, templateLetter, date, startTime',
      cardioTemplates: '++id, type, name, createdAt',
      cardioSessions: '++id, templateId, type, date',
      settings: '++id',
    });

    this.version(2).stores({
      workoutTemplates: '++id, letter, name, createdAt',
      workoutSessions: '++id, templateId, templateLetter, date, startTime',
      cardioTemplates: '++id, type, name, createdAt',
      cardioSessions: '++id, templateId, type, date',
      settings: '++id',
      workoutDraft: 'id',
    });

    // Versao 3: adiciona tabela de historico de peso corporal
    this.version(3).stores({
      workoutTemplates: '++id, letter, name, createdAt',
      workoutSessions: '++id, templateId, templateLetter, date, startTime',
      cardioTemplates: '++id, type, name, createdAt',
      cardioSessions: '++id, templateId, type, date',
      settings: '++id',
      workoutDraft: 'id',
      weightEntries: '++id, date',
    });

    // Versao 4: adiciona campo 'origem' nas sessoes para distinguir treino_rotina vs cardio_avulso
    this.version(4).stores({
      workoutTemplates: '++id, letter, name, createdAt',
      workoutSessions: '++id, templateId, templateLetter, date, startTime, origem',
      cardioTemplates: '++id, type, name, createdAt',
      cardioSessions: '++id, templateId, type, date, origem',
      settings: '++id',
      workoutDraft: 'id',
      weightEntries: '++id, date',
    });
  }
}

export const db = new PulseDatabase();

// Draft helpers
const DRAFT_ID = 1;

export async function saveDraft(draft: Omit<WorkoutDraft, 'id'>): Promise<void> {
  await db.workoutDraft.put({ ...draft, id: DRAFT_ID });
}

export async function loadDraft(): Promise<WorkoutDraft | undefined> {
  return db.workoutDraft.get(DRAFT_ID);
}

export async function clearDraft(): Promise<void> {
  await db.workoutDraft.delete(DRAFT_ID);
}

export async function hasDraft(): Promise<boolean> {
  const count = await db.workoutDraft.count();
  return count > 0;
}

// Weight helpers
export async function addWeightEntry(weight: number, notes?: string): Promise<number> {
  const id = await db.weightEntries.add({
    weight,
    date: new Date(),
    notes,
  } as WeightEntry);
  return id as number;
}

export async function getLatestWeight(): Promise<WeightEntry | undefined> {
  return db.weightEntries.orderBy('date').reverse().first();
}

export async function getWeightHistory(): Promise<WeightEntry[]> {
  return db.weightEntries.orderBy('date').toArray();
}

export async function deleteWeightEntry(id: number): Promise<void> {
  await db.weightEntries.delete(id);
}

// Seed data
export async function seedDefaultData() {
  const count = await db.workoutTemplates.count();
  if (count > 0) return;

  const now = new Date();

  const templates: Omit<WorkoutTemplate, 'id'>[] = [
    {
      name: 'Treino A - Peito & Triceps',
      letter: 'A',
      description: 'Foco em empurrar: peito, triceps e ombro anterior',
      createdAt: now,
      updatedAt: now,
      exercises: [
        { name: 'Supino Reto com Barra', muscleGroup: 'Peito', sets: 4, reps: '8-12', restSeconds: 90, order: 1 },
        { name: 'Supino Inclinado com Halteres', muscleGroup: 'Peito', sets: 3, reps: '10-12', restSeconds: 75, order: 2 },
        { name: 'Crucifixo com Halteres', muscleGroup: 'Peito', sets: 3, reps: '12-15', restSeconds: 60, order: 3 },
        { name: 'Triceps Pulley', muscleGroup: 'Triceps', sets: 4, reps: '12-15', restSeconds: 60, order: 4 },
        { name: 'Triceps Frances', muscleGroup: 'Triceps', sets: 3, reps: '10-12', restSeconds: 60, order: 5 },
        { name: 'Mergulho no Banco', muscleGroup: 'Triceps', sets: 3, reps: '12-15', restSeconds: 60, order: 6 },
      ],
    },
    {
      name: 'Treino B - Costas & Biceps',
      letter: 'B',
      description: 'Foco em puxar: costas largas, biceps e posterior',
      createdAt: now,
      updatedAt: now,
      exercises: [
        { name: 'Barra Fixa (ou Puxada)', muscleGroup: 'Costas', sets: 4, reps: '6-10', restSeconds: 90, order: 1 },
        { name: 'Remada Curvada com Barra', muscleGroup: 'Costas', sets: 4, reps: '8-12', restSeconds: 90, order: 2 },
        { name: 'Puxada Frontal na Polia', muscleGroup: 'Costas', sets: 3, reps: '10-12', restSeconds: 75, order: 3 },
        { name: 'Remada Unilateral com Halter', muscleGroup: 'Costas', sets: 3, reps: '10-12', restSeconds: 75, order: 4 },
        { name: 'Rosca Direta com Barra', muscleGroup: 'Biceps', sets: 4, reps: '10-12', restSeconds: 60, order: 5 },
        { name: 'Rosca Alternada com Halteres', muscleGroup: 'Biceps', sets: 3, reps: '10-12', restSeconds: 60, order: 6 },
      ],
    },
    {
      name: 'Treino C - Ombros & Abdomen',
      letter: 'C',
      description: 'Deltoides, trapezio e core completo',
      createdAt: now,
      updatedAt: now,
      exercises: [
        { name: 'Desenvolvimento com Halteres', muscleGroup: 'Ombros', sets: 4, reps: '10-12', restSeconds: 75, order: 1 },
        { name: 'Elevacao Lateral', muscleGroup: 'Ombros', sets: 4, reps: '12-15', restSeconds: 60, order: 2 },
        { name: 'Elevacao Frontal', muscleGroup: 'Ombros', sets: 3, reps: '12-15', restSeconds: 60, order: 3 },
        { name: 'Encolhimento com Halteres', muscleGroup: 'Trapezio', sets: 4, reps: '15-20', restSeconds: 60, order: 4 },
        { name: 'Prancha Abdominal', muscleGroup: 'Abdomen', sets: 3, reps: '45s', restSeconds: 45, order: 5 },
        { name: 'Abdominal Crunch', muscleGroup: 'Abdomen', sets: 3, reps: '20', restSeconds: 45, order: 6 },
        { name: 'Elevacao de Pernas', muscleGroup: 'Abdomen', sets: 3, reps: '15', restSeconds: 45, order: 7 },
      ],
    },
    {
      name: 'Treino D - Pernas (Quad Focus)',
      letter: 'D',
      description: 'Quadriceps, gluteos e panturrilha',
      createdAt: now,
      updatedAt: now,
      exercises: [
        { name: 'Agachamento Livre', muscleGroup: 'Quadriceps', sets: 4, reps: '8-12', restSeconds: 120, order: 1 },
        { name: 'Leg Press 45', muscleGroup: 'Quadriceps', sets: 4, reps: '12-15', restSeconds: 90, order: 2 },
        { name: 'Extensora', muscleGroup: 'Quadriceps', sets: 3, reps: '12-15', restSeconds: 60, order: 3 },
        { name: 'Afundo com Halteres', muscleGroup: 'Gluteos', sets: 3, reps: '12/lado', restSeconds: 75, order: 4 },
        { name: 'Elevacao Pelvica (Hip Thrust)', muscleGroup: 'Gluteos', sets: 4, reps: '12-15', restSeconds: 75, order: 5 },
        { name: 'Panturrilha na Maquina', muscleGroup: 'Panturrilha', sets: 4, reps: '15-20', restSeconds: 45, order: 6 },
      ],
    },
    {
      name: 'Treino E - Pernas (Post Focus)',
      letter: 'E',
      description: 'Posterior de coxa, gluteos e lombar',
      createdAt: now,
      updatedAt: now,
      exercises: [
        { name: 'Levantamento Terra Romeno', muscleGroup: 'Posterior', sets: 4, reps: '8-12', restSeconds: 120, order: 1 },
        { name: 'Mesa Flexora', muscleGroup: 'Posterior', sets: 4, reps: '10-12', restSeconds: 90, order: 2 },
        { name: 'Cadeira Abdutora', muscleGroup: 'Gluteos', sets: 3, reps: '15-20', restSeconds: 60, order: 3 },
        { name: 'Gluteo no Cabo (Kickback)', muscleGroup: 'Gluteos', sets: 4, reps: '15/lado', restSeconds: 60, order: 4 },
        { name: 'Agachamento Sumo', muscleGroup: 'Gluteos', sets: 3, reps: '12-15', restSeconds: 75, order: 5 },
        { name: 'Hiperextensao Lombar', muscleGroup: 'Lombar', sets: 3, reps: '12-15', restSeconds: 60, order: 6 },
      ],
    },
  ];

  await db.workoutTemplates.bulkAdd(templates as WorkoutTemplate[]);

  const cardioTemplates: Omit<CardioTemplate, 'id'>[] = [
    {
      name: 'Corrida Leve',
      type: 'leve',
      targetDistance: 5,
      targetPaceMin: 6,
      targetPaceSec: 30,
      targetDurationMinutes: 30,
      description: 'Ritmo confortavel, pode manter conversa',
      createdAt: now,
    },
    {
      name: 'Intervalado HIIT',
      type: 'intervalado',
      targetDistance: 4,
      targetPaceMin: 5,
      targetPaceSec: 0,
      targetDurationMinutes: 25,
      description: '8x 400m forte + 200m recuperacao',
      createdAt: now,
    },
    {
      name: 'Tempo Run',
      type: 'tempo',
      targetDistance: 6,
      targetPaceMin: 5,
      targetPaceSec: 30,
      targetDurationMinutes: 35,
      description: 'Ritmo de limiar anaerobico por tempo sustentado',
      createdAt: now,
    },
    {
      name: 'Longao de Domingo',
      type: 'longao',
      targetDistance: 12,
      targetPaceMin: 7,
      targetPaceSec: 0,
      targetDurationMinutes: 84,
      description: 'Corrida longa para construir base aerobica',
      createdAt: now,
    },
  ];

  await db.cardioTemplates.bulkAdd(cardioTemplates as CardioTemplate[]);

  const settings: Omit<AppSettings, 'id'> = {
    userName: 'Minha linda',
    defaultRestSeconds: 60,
    weightUnit: 'kg',
    distanceUnit: 'km',
    theme: 'dark',
    createdAt: now,
    updatedAt: now,
  };

  await db.settings.add(settings as AppSettings);
}

// Helper queries
export async function getSettings(): Promise<AppSettings | undefined> {
  return db.settings.toCollection().first();
}

export async function getLastWorkoutSession(templateId: number): Promise<WorkoutSession | undefined> {
  return db.workoutSessions
    .where('templateId')
    .equals(templateId)
    .reverse()
    .sortBy('date')
    .then((sessions) => sessions[0]);
}

// Snapshot-safe rename
export async function renameExercise(
  templateId: number,
  exerciseOrder: number,
  newName: string
): Promise<void> {
  const template = await db.workoutTemplates.get(templateId);
  if (!template) throw new Error('Template nao encontrado');

  const trimmed = newName.trim();
  if (!trimmed) throw new Error('Nome nao pode ser vazio');

  const updatedExercises = template.exercises.map((ex) =>
    ex.order === exerciseOrder ? { ...ex, name: trimmed } : ex
  );

  await db.workoutTemplates.update(templateId, {
    exercises: updatedExercises,
    updatedAt: new Date(),
  });
}

export async function renameWorkoutTemplate(
  templateId: number,
  newSubtitle: string
): Promise<void> {
  const template = await db.workoutTemplates.get(templateId);
  if (!template) throw new Error('Template nao encontrado');

  const trimmed = newSubtitle.trim();
  if (!trimmed) throw new Error('Titulo nao pode ser vazio');

  const newFullName = `Treino ${template.letter} - ${trimmed}`;

  await db.workoutTemplates.update(templateId, {
    name: newFullName,
    updatedAt: new Date(),
  });
}

// CRUD de templates
export async function addWorkoutTemplate(
  letter: string,
  subtitle: string
): Promise<number> {
  const existing = await db.workoutTemplates.where('letter').equals(letter).count();
  if (existing > 0) throw new Error(`Treino ${letter} ja existe`);

  const now = new Date();
  const id = await db.workoutTemplates.add({
    letter: letter.toUpperCase(),
    name: `Treino ${letter.toUpperCase()} - ${subtitle.trim()}`,
    description: '',
    exercises: [],
    createdAt: now,
    updatedAt: now,
  } as WorkoutTemplate);
  return id as number;
}

export async function deleteWorkoutTemplate(templateId: number): Promise<void> {
  await db.workoutTemplates.delete(templateId);
}

// CRUD de exercicios
export async function addExerciseToTemplate(
  templateId: number,
  exercise: {
    name: string;
    muscleGroup: string;
    sets: number;
    reps: string;
    restSeconds: number;
    notes?: string;
    modalidade?: 'forca' | 'cardio';
    tipoCardio?: string;
    tempoMinutos?: string;
    ritmoEsforco?: string;
  }
): Promise<void> {
  const template = await db.workoutTemplates.get(templateId);
  if (!template) throw new Error('Template nao encontrado');

  const maxOrder = template.exercises.reduce((m, e) => Math.max(m, e.order), 0);
  const newExercise = {
    ...exercise,
    name: exercise.name.trim(),
    order: maxOrder + 1,
  };

  await db.workoutTemplates.update(templateId, {
    exercises: [...template.exercises, newExercise],
    updatedAt: new Date(),
  });
}

export async function removeExerciseFromTemplate(
  templateId: number,
  exerciseOrder: number
): Promise<void> {
  const template = await db.workoutTemplates.get(templateId);
  if (!template) throw new Error('Template nao encontrado');

  const filtered = template.exercises
    .filter((e) => e.order !== exerciseOrder)
    .map((e, idx) => ({ ...e, order: idx + 1 }));

  await db.workoutTemplates.update(templateId, {
    exercises: filtered,
    updatedAt: new Date(),
  });
}

export async function updateExerciseSets(
  templateId: number,
  exerciseOrder: number,
  newSets: number
): Promise<void> {
  if (newSets < 1) throw new Error('Minimo de 1 serie');
  const template = await db.workoutTemplates.get(templateId);
  if (!template) throw new Error('Template nao encontrado');

  await db.workoutTemplates.update(templateId, {
    exercises: template.exercises.map((e) =>
      e.order === exerciseOrder ? { ...e, sets: newSets } : e
    ),
    updatedAt: new Date(),
  });
}

export async function updateExerciseReps(
  templateId: number,
  exerciseOrder: number,
  newReps: string
): Promise<void> {
  const template = await db.workoutTemplates.get(templateId);
  if (!template) throw new Error('Template nao encontrado');

  await db.workoutTemplates.update(templateId, {
    exercises: template.exercises.map((e) =>
      e.order === exerciseOrder ? { ...e, reps: newReps.trim() } : e
    ),
    updatedAt: new Date(),
  });
}

export async function getPersonalRecords(): Promise<Record<string, { weight: number; reps: number; date: Date }>> {
  const sessions = await db.workoutSessions.toArray();
  const records: Record<string, { weight: number; reps: number; date: Date }> = {};

  for (const session of sessions) {
    for (const exercise of session.exercises) {
      for (const set of exercise.sets) {
        if (set.completed && set.weight && set.completedReps) {
          const key = exercise.exerciseName;
          const current = records[key];
          if (!current || set.weight > current.weight || (set.weight === current.weight && set.completedReps > current.reps)) {
            records[key] = { weight: set.weight, reps: set.completedReps, date: session.date };
          }
        }
      }
    }
  }

  return records;
}

export async function getWeeklyStats(weekStart: Date): Promise<{ workouts: number; workoutsRotina: number; cardios: number; volume: number; km: number }> {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const [workouts, cardios] = await Promise.all([
    db.workoutSessions.where('date').between(weekStart, weekEnd).toArray(),
    db.cardioSessions.where('date').between(weekStart, weekEnd).toArray(),
  ]);

  // workoutsRotina: treinos finalizados via aba Treino (forca + cardio de rotina)
  // Registros antigos (sem origem) sao tratados como treino_rotina por retrocompatibilidade
  const workoutsRotina =
    workouts.filter((s) => !s.origem || s.origem === 'treino_rotina').length +
    cardios.filter((s) => s.origem === 'treino_rotina').length;

  const volume = workouts.reduce((acc, s) => acc + (s.totalVolume ?? 0), 0);
  const km = cardios.reduce((acc, s) => acc + s.distance, 0);

  return {
    workouts: workouts.length,
    workoutsRotina,
    cardios: cardios.filter((s) => !s.origem || s.origem === 'cardio_avulso').length,
    volume,
    km,
  };
}

export async function getBestPace(): Promise<{ paceMin: number; paceSec: number; date: Date } | null> {
  const sessions = await db.cardioSessions.toArray();
  if (sessions.length === 0) return null;

  let best: CardioSession | null = null;
  for (const s of sessions) {
    if (!best) { best = s; continue; }
    const bestTotal = best.avgPaceMin * 60 + best.avgPaceSec;
    const currTotal = s.avgPaceMin * 60 + s.avgPaceSec;
    if (currTotal < bestTotal) best = s;
  }

  if (!best) return null;
  return { paceMin: best.avgPaceMin, paceSec: best.avgPaceSec, date: best.date };
}

export async function exportAllData() {
  const [workoutTemplates, workoutSessions, cardioTemplates, cardioSessions, settings, weightEntries] = await Promise.all([
    db.workoutTemplates.toArray(),
    db.workoutSessions.toArray(),
    db.cardioTemplates.toArray(),
    db.cardioSessions.toArray(),
    db.settings.toArray(),
    db.weightEntries.toArray(),
  ]);

  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    data: { workoutTemplates, workoutSessions, cardioTemplates, cardioSessions, settings, weightEntries },
  };
}

export async function importAllData(backup: ReturnType<typeof exportAllData> extends Promise<infer T> ? T : never) {
  await db.transaction('rw', [db.workoutTemplates, db.workoutSessions, db.cardioTemplates, db.cardioSessions, db.settings, db.weightEntries], async () => {
    await Promise.all([
      db.workoutTemplates.clear(),
      db.workoutSessions.clear(),
      db.cardioTemplates.clear(),
      db.cardioSessions.clear(),
      db.settings.clear(),
      db.weightEntries.clear(),
    ]);

    const { workoutTemplates, workoutSessions, cardioTemplates, cardioSessions, settings, weightEntries } = backup.data as any;
    await Promise.all([
      db.workoutTemplates.bulkAdd(workoutTemplates),
      db.workoutSessions.bulkAdd(workoutSessions),
      db.cardioTemplates.bulkAdd(cardioTemplates),
      db.cardioSessions.bulkAdd(cardioSessions),
      db.settings.bulkAdd(settings),
      ...(weightEntries ? [db.weightEntries.bulkAdd(weightEntries)] : []),
    ]);
  });
}

export async function clearAllData() {
  // Limpa apenas o historico de atividades -- templates, configuracoes e peso sao preservados
  await db.transaction('rw', [db.workoutSessions, db.cardioSessions, db.weightEntries], async () => {
    await Promise.all([
      db.workoutSessions.clear(),
      db.cardioSessions.clear(),
      db.weightEntries.clear(),
    ]);
  });
}

// Modo Treinador: exportar/importar apenas a rotina de treinos
// Historico (workoutSessions) NUNCA e tocado.

export async function exportRoutine(): Promise<string> {
  const templates = await db.workoutTemplates.toArray();
  const payload = {
    version: 1,
    type: 'pulse-routine',
    exportedAt: new Date().toISOString(),
    templates,
  };
  const json = JSON.stringify(payload);
  // btoa nao suporta UTF-8 diretamente -- usar TextEncoder
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

export async function importRoutine(code: string): Promise<void> {
  let json: string;
  try {
    const binary = atob(code.trim());
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    json = new TextDecoder().decode(bytes);
  } catch {
    throw new Error('Codigo invalido. Verifique se copiou tudo corretamente.');
  }

  let payload: any;
  try {
    payload = JSON.parse(json);
  } catch {
    throw new Error('Formato invalido. O codigo nao e um JSON valido.');
  }

  if (payload?.type !== 'pulse-routine' || !Array.isArray(payload?.templates)) {
    throw new Error('Este codigo nao e uma rotina Pulse valida.');
  }

  // Substitui apenas os templates -- historico intacto
  await db.transaction('rw', db.workoutTemplates, async () => {
    await db.workoutTemplates.clear();
    const now = new Date();
    const templates = (payload.templates as any[]).map((t: any) => ({
      ...t,
      id: undefined,
      updatedAt: now,
    }));
    await db.workoutTemplates.bulkAdd(templates);
  });
}
