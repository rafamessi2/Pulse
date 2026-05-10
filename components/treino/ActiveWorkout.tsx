'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  CheckCircle2,
  Circle,
  Timer,
  Minus,
  Plus,
  TrendingUp,
  Save,
  ChevronDown,
  ChevronUp,
  X,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { db, getLastWorkoutSession, clearDraft } from '@/lib/db';
import { useWorkoutDraft } from '@/hooks/useWorkoutDraft';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/toaster';
import type { WorkoutTemplate, ExerciseLog, WorkoutDraft } from '@/types';
import { formatDuration } from '@/lib/utils';

interface Props {
  template: WorkoutTemplate;
  draft?: WorkoutDraft;
  onClose: () => void;
}

export function WorkoutSession({ template, draft, onClose }: Props) {
  const { toast } = useToast();
  const { triggerSave, discardDraft, flushSave } = useWorkoutDraft();

  const liveTemplate = useLiveQuery(
    () => db.workoutTemplates.get(template.id!),
    [template.id]
  );
  const displayTitle = (() => {
    const name = liveTemplate?.name ?? template.name;
    const idx = name.indexOf(' – ');
    return idx !== -1 ? name.slice(idx + 3) : name;
  })();

  const restoredElapsed = draft
    ? draft.elapsedSeconds +
      Math.floor((Date.now() - new Date(draft.savedAt).getTime()) / 1000)
    : 0;
  const [elapsed, setElapsed] = useState(restoredElapsed);
  const startTimeRef = useRef<Date>(
    draft
      ? new Date(Date.now() - restoredElapsed * 1000)
      : new Date()
  );

  useEffect(() => {
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const [restTick, setRestTick] = useState(0);
  const [restActive, setRestActive] = useState(false);
  const restIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startRest = useCallback((seconds: number) => {
    if (restIntervalRef.current) clearInterval(restIntervalRef.current);
    setRestTick(seconds);
    setRestActive(true);
    restIntervalRef.current = setInterval(() => {
      setRestTick((t) => {
        if (t <= 1) {
          clearInterval(restIntervalRef.current!);
          setRestActive(false);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => () => { if (restIntervalRef.current) clearInterval(restIntervalRef.current); }, []);

  const [exerciseLogs, setExerciseLogs] = useState<ExerciseLog[]>(() => {
    if (draft) return draft.exerciseLogs;
    return template.exercises.map((ex) => ({
      exerciseId: ex.order,
      exerciseName: ex.name,
      muscleGroup: ex.muscleGroup,
      sets: Array.from({ length: ex.sets }, (_, i) => ({
        setNumber: i + 1,
        targetReps: ex.reps,
        completedReps: null,
        weight: null,
        completed: false,
      })),
      notes: '',
    }));
  });

  const [previousData, setPreviousData] = useState<Record<string, { weight: number; reps: number }>>({});
  const [expandedExercise, setExpandedExercise] = useState<number>(0);
  const [workoutNotes, setWorkoutNotes] = useState('');
  const [showFinish, setShowFinish] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveIndicator, setSaveIndicator] = useState<'idle' | 'saving' | 'saved'>('idle');

  useEffect(() => {
    getLastWorkoutSession(template.id!).then((prev) => {
      if (!prev) return;
      const map: Record<string, { weight: number; reps: number }> = {};
      for (const ex of prev.exercises) {
        const best = ex.sets
          .filter((s) => s.completed && s.weight && s.completedReps)
          .sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0))[0];
        if (best?.weight && best.completedReps) {
          map[ex.exerciseName] = { weight: best.weight, reps: best.completedReps };
        }
      }
      setPreviousData(map);

      if (!draft) {
        setExerciseLogs((prev) =>
          prev.map((log) => {
            const prevBest = map[log.exerciseName];
            if (!prevBest) return log;
            return {
              ...log,
              previousBest: prevBest,
              sets: log.sets.map((s) => ({ ...s, weight: prevBest.weight })),
            };
          })
        );
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template.id]);

  const buildDraftPayload = useCallback(() => ({
    templateId: template.id!,
    templateLetter: template.letter,
    templateName: liveTemplate?.name ?? template.name,
    startTime: startTimeRef.current,
    elapsedSeconds: elapsed,
    exerciseLogs,
  }), [template, liveTemplate, elapsed, exerciseLogs]);

  useEffect(() => {
    setSaveIndicator('saving');
    triggerSave(buildDraftPayload());
    const t = setTimeout(() => setSaveIndicator('saved'), 900);
    const t2 = setTimeout(() => setSaveIndicator('idle'), 3000);
    return () => { clearTimeout(t); clearTimeout(t2); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exerciseLogs]);

  useEffect(() => {
    const id = setInterval(() => {
      triggerSave(buildDraftPayload());
    }, 30_000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildDraftPayload]);

  const updateSet = (exIdx: number, setIdx: number, field: 'weight' | 'completedReps', value: number | null) => {
    setExerciseLogs((prev) =>
      prev.map((ex, ei) =>
        ei !== exIdx ? ex : {
          ...ex,
          sets: ex.sets.map((s, si) =>
            si !== setIdx ? s : { ...s, [field]: value }
          ),
        }
      )
    );
  };

  const toggleSet = (exIdx: number, setIdx: number) => {
    const newCompleted = !exerciseLogs[exIdx].sets[setIdx].completed;
    setExerciseLogs((prev) =>
      prev.map((ex, ei) =>
        ei !== exIdx ? ex : {
          ...ex,
          sets: ex.sets.map((s, si) =>
            si !== setIdx ? s : { ...s, completed: newCompleted }
          ),
        }
      )
    );
    if (newCompleted) {
      const restSecs = template.exercises[exIdx]?.restSeconds ?? 60;
      startRest(restSecs);
      const nextSetIdx = setIdx + 1;
      if (nextSetIdx >= exerciseLogs[exIdx].sets.length && exIdx + 1 < exerciseLogs.length) {
        setExpandedExercise(exIdx + 1);
      }
    }
  };

  const totalSets = exerciseLogs.reduce((acc, ex) => acc + ex.sets.length, 0);
  const completedSets = exerciseLogs.reduce((acc, ex) => acc + ex.sets.filter((s) => s.completed).length, 0);
  const progress = totalSets > 0 ? (completedSets / totalSets) * 100 : 0;

  const handleFinish = async () => {
    setSaving(true);
    try {
      await flushSave();
      const endTime = new Date();
      const durationMinutes = Math.round((endTime.getTime() - startTimeRef.current.getTime()) / 60000);
      const totalVolume = exerciseLogs.reduce(
        (acc, ex) => acc + ex.sets.reduce(
          (s, set) => s + (set.completed && set.weight && set.completedReps ? set.weight * set.completedReps : 0), 0
        ), 0
      );
      const snapshotName = liveTemplate?.name ?? template.name;

      await db.workoutSessions.add({
        templateId: template.id!,
        templateName: snapshotName,
        templateLetter: template.letter,
        date: new Date(),
        startTime: startTimeRef.current,
        endTime,
        durationMinutes,
        exercises: exerciseLogs,
        totalVolume,
        completedExercises: exerciseLogs.filter((ex) => ex.sets.some((s) => s.completed)).length,
        totalExercises: exerciseLogs.length,
        notes: workoutNotes,
      });

      await discardDraft();

      toast({
        title: '🎉 Treino salvo!',
        description: `${durationMinutes}min • ${totalVolume.toFixed(0)}kg volume`,
        variant: 'success',
      });
      onClose();
    } catch {
      toast({ title: 'Erro ao salvar treino', variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async () => {
    await discardDraft();
    toast({ title: 'Treino cancelado', description: 'Rascunho descartado', variant: 'default' });
    onClose();
  };

  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  const elapsedStr = h > 0
    ? `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

  return (
    <div className="min-h-screen bg-background">

      {/* Header */}
      <div className="sticky top-0 z-30 nav-blur px-5">
        <div className="flex items-center justify-between h-14">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 text-muted-foreground"
          >
            <ChevronLeft size={20} />
            <span className="text-sm">Treinos</span>
          </button>

          <div className="text-center">
            <p className="font-bold text-sm">
              {template.letter} – {displayTitle}
            </p>
            <div className="flex items-center justify-center gap-2">
              <p className="text-primary text-xs font-mono">{elapsedStr}</p>
              <AnimatePresence mode="wait">
                {saveIndicator === 'saving' && (
                  <motion.span
                    key="saving"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-[9px] text-muted-foreground"
                  >
                    salvando…
                  </motion.span>
                )}
                {saveIndicator === 'saved' && (
                  <motion.span
                    key="saved"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-[9px] text-emerald-400"
                  >
                    ✓ salvo
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </div>

          <button
            onClick={() => setShowFinish(true)}
            className="text-primary text-sm font-semibold"
          >
            Finalizar
          </button>
        </div>
        <Progress value={progress} className="h-1 mb-2" />
        <p className="text-xs text-center text-muted-foreground pb-2">
          {completedSets}/{totalSets} séries concluídas
        </p>
      </div>

      {/* Banner restaurado do rascunho */}
      {draft && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className="overflow-hidden"
        >
          <div className="mx-5 mt-3 mb-1 rounded-xl border border-emerald-500/30 bg-emerald-500/8 px-4 py-2.5 flex items-center gap-2">
            <RotateCcw size={13} className="text-emerald-400 shrink-0" />
            <p className="text-xs text-emerald-300">
              Treino restaurado — continuando de onde parou
            </p>
          </div>
        </motion.div>
      )}

      {/* Timer de descanso */}
      <AnimatePresence>
        {restActive && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="gradient-bg-soft border-b border-primary/20 px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Timer size={16} className="text-primary" />
                <span className="text-sm font-medium">Descanso</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono font-bold text-primary text-lg">{restTick}s</span>
                <button onClick={() => { setRestActive(false); if (restIntervalRef.current) clearInterval(restIntervalRef.current); }}>
                  <X size={16} className="text-muted-foreground" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lista de exercícios */}
      <div className="px-5 py-4 space-y-3">
        {exerciseLogs.map((exLog, exIdx) => {
          const isExpanded = expandedExercise === exIdx;
          const allDone = exLog.sets.every((s) => s.completed);
          const someDone = exLog.sets.some((s) => s.completed);
          const prev = previousData[exLog.exerciseName];

          return (
            <Card
              key={exIdx}
              className={`border transition-all ${
                allDone
                  ? 'border-emerald-500/30 bg-emerald-500/5'
                  : someDone
                  ? 'border-primary/20'
                  : 'border-border/30 glass'
              }`}
            >
              <button
                onClick={() => setExpandedExercise(isExpanded ? -1 : exIdx)}
                className="w-full"
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                          allDone
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'gradient-bg-soft text-primary'
                        }`}
                      >
                        {allDone ? '✓' : exIdx + 1}
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-sm">{exLog.exerciseName}</p>
                        <p className="text-muted-foreground text-xs">{exLog.muscleGroup}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {exLog.sets.filter((s) => s.completed).length}/{exLog.sets.length}
                      </span>
                      {isExpanded
                        ? <ChevronUp size={16} className="text-muted-foreground" />
                        : <ChevronDown size={16} className="text-muted-foreground" />
                      }
                    </div>
                  </div>
                </CardContent>
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 space-y-3">
                      {prev && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded-xl px-3 py-2">
                          <TrendingUp size={12} className="text-emerald-400" />
                          <span>Último: {prev.weight}kg × {prev.reps}rep</span>
                        </div>
                      )}

                      <div className="grid grid-cols-[32px_1fr_1fr_40px] gap-2 text-xs text-muted-foreground px-1">
                        <span>Série</span>
                        <span className="text-center">Carga (kg)</span>
                        <span className="text-center">Reps</span>
                        <span />
                      </div>

                      {exLog.sets.map((set, setIdx) => (
                        <div
                          key={setIdx}
                          className={`grid grid-cols-[32px_1fr_1fr_40px] gap-2 items-center transition-opacity ${
                            set.completed ? 'opacity-60' : ''
                          }`}
                        >
                          <span className="text-sm font-bold text-center text-muted-foreground">
                            {set.setNumber}
                          </span>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => updateSet(exIdx, setIdx, 'weight', Math.max(0, (set.weight ?? 0) - 2.5))}
                              className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center active:scale-90"
                            >
                              <Minus size={12} />
                            </button>
                            <Input
                              type="number"
                              value={set.weight ?? ''}
                              onChange={(e) => updateSet(exIdx, setIdx, 'weight', e.target.value ? parseFloat(e.target.value) : null)}
                              className="h-9 text-center text-sm px-1 font-semibold"
                              placeholder="0"
                            />
                            <button
                              onClick={() => updateSet(exIdx, setIdx, 'weight', (set.weight ?? 0) + 2.5)}
                              className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center active:scale-90"
                            >
                              <Plus size={12} />
                            </button>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => updateSet(exIdx, setIdx, 'completedReps', Math.max(0, (set.completedReps ?? 0) - 1))}
                              className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center active:scale-90"
                            >
                              <Minus size={12} />
                            </button>
                            <Input
                              type="number"
                              value={set.completedReps ?? ''}
                              onChange={(e) => updateSet(exIdx, setIdx, 'completedReps', e.target.value ? parseInt(e.target.value) : null)}
                              className="h-9 text-center text-sm px-1 font-semibold"
                              placeholder={set.targetReps}
                            />
                            <button
                              onClick={() => updateSet(exIdx, setIdx, 'completedReps', (set.completedReps ?? 0) + 1)}
                              className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center active:scale-90"
                            >
                              <Plus size={12} />
                            </button>
                          </div>

                          <button
                            onClick={() => toggleSet(exIdx, setIdx)}
                            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90 ${
                              set.completed ? 'gradient-bg shadow-md' : 'bg-muted'
                            }`}
                          >
                            {set.completed
                              ? <CheckCircle2 size={18} className="text-white" />
                              : <Circle size={18} className="text-muted-foreground" />
                            }
                          </button>
                        </div>
                      ))}

                      <Textarea
                        placeholder="Observações do exercício…"
                        value={exLog.notes ?? ''}
                        onChange={(e) =>
                          setExerciseLogs((prev) =>
                            prev.map((ex, i) =>
                              i === exIdx ? { ...ex, notes: e.target.value } : ex
                            )
                          )
                        }
                        className="text-xs mt-1"
                        rows={2}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          );
        })}

        <button
          onClick={() => setShowCancel(true)}
          className="w-full mt-2 py-3 text-sm text-muted-foreground hover:text-red-400 transition-colors flex items-center justify-center gap-2"
        >
          <X size={15} />
          Cancelar treino
        </button>
      </div>

      {/* Modal: Finalizar */}
      <AnimatePresence>
        {showFinish && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end"
            onClick={() => setShowFinish(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 400, damping: 40 }}
              className="w-full bg-card rounded-t-3xl p-6 border-t border-border/50"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-10 h-1 bg-muted rounded-full mx-auto mb-5" />
              <h2 className="text-xl font-bold text-center mb-1">Finalizar Treino</h2>
              <p className="text-muted-foreground text-sm text-center mb-5">
                {completedSets}/{totalSets} séries • {formatDuration(Math.round(elapsed / 60))}
              </p>

              <div className="grid grid-cols-3 gap-3 mb-5">
                {[
                  { label: 'Séries', value: `${completedSets}/${totalSets}` },
                  { label: 'Duração', value: formatDuration(Math.round(elapsed / 60)) },
                  {
                    label: 'Volume',
                    value: `${exerciseLogs.reduce((acc, ex) => acc + ex.sets.reduce((s, set) => s + (set.completed && set.weight && set.completedReps ? set.weight * set.completedReps : 0), 0), 0).toFixed(0)}kg`,
                  },
                ].map((stat) => (
                  <div key={stat.label} className="bg-muted/50 rounded-2xl p-3 text-center">
                    <p className="font-bold text-base gradient-text">{stat.value}</p>
                    <p className="text-muted-foreground text-xs">{stat.label}</p>
                  </div>
                ))}
              </div>

              <Textarea
                placeholder="Como foi o treino? Adicione observações…"
                value={workoutNotes}
                onChange={(e) => setWorkoutNotes(e.target.value)}
                className="mb-4"
                rows={3}
              />

              <Button onClick={handleFinish} className="w-full h-12" disabled={saving}>
                <Save size={18} />
                {saving ? 'Salvando…' : 'Salvar no Histórico'}
              </Button>
              <Button variant="ghost" onClick={() => setShowFinish(false)} className="w-full mt-2">
                Continuar treinando
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal: Cancelar */}
      <AnimatePresence>
        {showCancel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-5"
            onClick={() => setShowCancel(false)}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="w-full max-w-sm bg-card rounded-2xl p-6 border border-red-500/20"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col items-center gap-3 mb-5">
                <div className="w-12 h-12 rounded-2xl bg-red-500/15 flex items-center justify-center">
                  <AlertTriangle size={22} className="text-red-400" />
                </div>
                <h2 className="text-lg font-bold text-center">Cancelar treino?</h2>
                <p className="text-muted-foreground text-sm text-center">
                  Todo o progresso desta sessão será <strong>descartado</strong> e removido
                  do rascunho. Esta ação não pode ser desfeita.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  variant="destructive"
                  onClick={handleCancel}
                  className="w-full h-11"
                >
                  Sim, descartar tudo
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setShowCancel(false)}
                  className="w-full h-11"
                >
                  Continuar treinando
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
