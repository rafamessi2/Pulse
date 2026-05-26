'use client';

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock, Dumbbell, Activity, TrendingUp, Calendar,
  ChevronDown, ChevronUp, Trophy, Pencil, Check, X, Trash2,
} from 'lucide-react';
import { db, updateSessionDuration, updateSessionSet, deleteWorkoutSession, deleteCardioSession } from '@/lib/db';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toaster';
import { formatDate, formatDuration, formatPace, formatVolume, getCardioTypeLabel } from '@/lib/utils';
import { format, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type Filter = 'todos' | 'treino' | 'cardio';

const stripPrefix = (name: string) =>
  name.replace(/^Treino [A-Za-z]+ [-–] /, '').replace(/^Treino [A-Za-z]+ - /, '');

// ─── Estado de edição ────────────────────────────────────────────────────────
interface EditingSet {
  sessionId: number;
  exerciseIdx: number;
  setIdx: number;
  field: 'weight' | 'reps';
  value: string;
}

interface EditingDuration {
  sessionId: number;
  value: string;
}

export default function HistoricoPage() {
  const { toast } = useToast();
  const [filter, setFilter] = useState<Filter>('todos');
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [editingSet, setEditingSet] = useState<EditingSet | null>(null);
  const [editingDuration, setEditingDuration] = useState<EditingDuration | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingItem, setDeletingItem] = useState<{ key: string; type: 'workout' | 'cardio'; id: number; name: string } | null>(null);

  const workouts = useLiveQuery(() => db.workoutSessions.orderBy('date').reverse().toArray());
  const cardios = useLiveQuery(() => db.cardioSessions.orderBy('date').reverse().toArray());

  const allItems = [
    ...(workouts?.map((w) => ({ type: 'workout' as const, date: new Date(w.date), data: w })) ?? []),
    ...(cardios?.map((c) => ({ type: 'cardio' as const, date: new Date(c.date), data: c })) ?? []),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  const filtered = allItems.filter((item) => {
    if (filter === 'treino') return item.type === 'workout';
    if (filter === 'cardio') return item.type === 'cardio';
    return true;
  });

  // Monthly stats
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthWorkouts = workouts?.filter((w) => new Date(w.date) >= monthStart) ?? [];
  const monthCardios = cardios?.filter((c) => new Date(c.date) >= monthStart) ?? [];
  const monthKm = monthCardios.reduce((acc, c) => acc + c.distance, 0);
  const monthVolume = monthWorkouts.reduce((acc, w) => acc + (w.totalVolume ?? 0), 0);

  // PR tracking
  const prMap: Record<string, { weight: number; reps: number; date: Date }> = {};
  workouts?.forEach((w) => {
    w.exercises.forEach((ex) => {
      ex.sets.filter((s) => s.completed && s.weight && s.completedReps).forEach((s) => {
        const key = ex.exerciseName;
        if (!prMap[key] || s.weight! > prMap[key].weight) {
          prMap[key] = { weight: s.weight!, reps: s.completedReps!, date: new Date(w.date) };
        }
      });
    });
  });
  const topPRs = Object.entries(prMap).sort((a, b) => b[1].weight - a[1].weight).slice(0, 5);

  // ── Salvar edição de série ──────────────────────────────────────────────────
  const confirmSetEdit = async () => {
    if (!editingSet) return;
    setSaving(true);
    try {
      const numVal = parseFloat(editingSet.value.replace(',', '.'));
      if (isNaN(numVal) || numVal < 0) {
        toast({ title: 'Valor inválido', variant: 'error' });
        return;
      }
      const patch =
        editingSet.field === 'weight'
          ? { weight: numVal }
          : { completedReps: Math.round(numVal) };
      await updateSessionSet(editingSet.sessionId, editingSet.exerciseIdx, editingSet.setIdx, patch);
      toast({ title: '✅ Série atualizada!', variant: 'success' });
      setEditingSet(null);
    } catch (err: any) {
      toast({ title: err?.message ?? 'Erro ao salvar', variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // ── Salvar edição de duração ────────────────────────────────────────────────
  const confirmDurationEdit = async () => {
    if (!editingDuration) return;
    setSaving(true);
    try {
      const mins = parseInt(editingDuration.value);
      if (isNaN(mins) || mins < 0) {
        toast({ title: 'Duração inválida', variant: 'error' });
        return;
      }
      await updateSessionDuration(editingDuration.sessionId, mins);
      toast({ title: '✅ Duração atualizada!', variant: 'success' });
      setEditingDuration(null);
    } catch (err: any) {
      toast({ title: err?.message ?? 'Erro ao salvar', variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent, confirm: () => void) => {
    if (e.key === 'Enter') confirm();
    if (e.key === 'Escape') { setEditingSet(null); setEditingDuration(null); }
  };

  // ── Deletar sessão individual ───────────────────────────────────────────────
  const confirmDelete = async () => {
    if (!deletingItem) return;
    try {
      if (deletingItem.type === 'workout') {
        await deleteWorkoutSession(deletingItem.id);
      } else {
        await deleteCardioSession(deletingItem.id);
      }
      toast({ title: '🗑️ Registro removido', description: 'Os outros registros não foram afetados.', variant: 'default' });
      if (expandedItem === deletingItem.key) setExpandedItem(null);
      setDeletingItem(null);
    } catch {
      toast({ title: 'Erro ao remover registro', variant: 'error' });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="relative overflow-hidden px-5 pt-safe-lg pb-6">
        <div className="absolute inset-0 gradient-bg-soft" />
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="relative">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl gradient-bg flex items-center justify-center shadow-lg">
              <Clock size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Histórico</h1>
              <p className="text-muted-foreground text-xs">{allItems.length} atividades registradas</p>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="px-5 space-y-5 pb-6">
        {/* Month stats */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            {format(now, 'MMMM yyyy', { locale: ptBR })}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Card className="glass border-border/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl gradient-bg flex items-center justify-center">
                    <Dumbbell size={18} className="text-white" />
                  </div>
                  <div>
                    <p className="text-xl font-bold gradient-text">{monthWorkouts.length}</p>
                    <p className="text-muted-foreground text-xs">Treinos • {formatVolume(monthVolume)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="glass border-border/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-secondary/20 flex items-center justify-center">
                    <Activity size={18} className="text-secondary" />
                  </div>
                  <div>
                    <p className="text-xl font-bold gradient-text">{monthCardios.length}</p>
                    <p className="text-muted-foreground text-xs">Corridas • {monthKm.toFixed(1)} km</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* Top PRs */}
        {topPRs.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">🏆 Recordes Pessoais</p>
            <div className="space-y-2">
              {topPRs.map(([name, pr], i) => (
                <motion.div key={name} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                  <Card className="glass border-yellow-500/20">
                    <CardContent className="p-3.5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-yellow-500/20 flex items-center justify-center text-xs font-bold text-yellow-400">{i + 1}</div>
                        <p className="font-medium text-sm">{name}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-sm gradient-text">{pr.weight} kg × {pr.reps}</p>
                        <p className="text-muted-foreground text-xs">{formatDate(pr.date)}</p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex gap-2 p-1 rounded-2xl bg-muted/40 border border-border/20">
          {([
            { key: 'todos', label: 'Todos', count: allItems.length },
            { key: 'treino', label: '🏋️ Treino', count: workouts?.length ?? 0 },
            { key: 'cardio', label: '🏃 Cardio', count: cardios?.length ?? 0 },
          ] as { key: Filter; label: string; count: number }[]).map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`flex-1 h-9 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                filter === key ? 'gradient-bg text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${filter === key ? 'bg-white/20' : 'bg-muted text-muted-foreground'}`}>{count}</span>
            </button>
          ))}
        </div>

        {/* Activity list */}
        {filtered.length === 0 ? (
          <Card className="glass border-border/30">
            <CardContent className="p-10 text-center">
              <Calendar size={32} className="text-muted-foreground mx-auto mb-3" />
              <p className="font-semibold">Nenhuma atividade</p>
              <p className="text-muted-foreground text-sm mt-1">Comece a treinar para ver seu histórico!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map((item, i) => {
              const key = `${item.type}-${(item.data as any).id}`;
              const isExpanded = expandedItem === key;
              const sessionId = (item.data as any).id as number;

              return (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.04, 0.3) }}
                >
                  <Card className={`border transition-all ${isExpanded ? 'border-primary/30' : 'border-border/30 glass'}`}>
                    {/* Header row */}
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-2">
                        {/* Área clicável para expandir */}
                        <button
                          onClick={() => setExpandedItem(isExpanded ? null : key)}
                          className="flex items-center gap-3 flex-1 min-w-0 text-left"
                        >
                          {item.type === 'workout' ? (
                            <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center font-bold text-white text-base shrink-0">
                              {(item.data as any).templateLetter}
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-secondary/20 flex items-center justify-center shrink-0">
                              <span className="text-xl">
                                {(item.data as any).type === 'leve' ? '🏃' : (item.data as any).type === 'intervalado' ? '⚡' : (item.data as any).type === 'tempo' ? '🎯' : '🏆'}
                              </span>
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-semibold text-sm truncate">
                              {item.type === 'workout'
                                ? stripPrefix((item.data as any).templateName ?? '')
                                : ((item.data as any).templateName ?? getCardioTypeLabel((item.data as any).type))}
                            </p>
                            <p className="text-muted-foreground text-xs">{formatDate(item.date)}</p>
                          </div>
                        </button>

                        {/* Badges + ações */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {item.type === 'workout' ? (
                            <Badge variant="muted" className="text-[10px]">{formatVolume((item.data as any).totalVolume ?? 0)}</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px]">{(item.data as any).distance.toFixed(1)} km</Badge>
                          )}
                          {/* Botão deletar */}
                          <button
                            onClick={() => setDeletingItem({
                              key,
                              type: item.type,
                              id: sessionId,
                              name: item.type === 'workout'
                                ? stripPrefix((item.data as any).templateName ?? '')
                                : ((item.data as any).templateName ?? getCardioTypeLabel((item.data as any).type)),
                            })}
                            className="w-8 h-8 rounded-lg hover:bg-red-500/15 hover:text-red-400 flex items-center justify-center transition-colors active:scale-90"
                          >
                            <Trash2 size={13} />
                          </button>
                          {/* Expandir */}
                          <button
                            onClick={() => setExpandedItem(isExpanded ? null : key)}
                            className="w-8 h-8 rounded-lg hover:bg-muted/60 flex items-center justify-center transition-colors"
                          >
                            {isExpanded ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
                          </button>
                        </div>
                      </div>
                    </CardContent>

                    {/* ── Expanded details ── */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden border-t border-border/30"
                        >
                          <CardContent className="p-4 pt-3">
                            {item.type === 'workout' ? (
                              <div className="space-y-4">

                                {/* Stats: Duração editável + Exercícios + Volume */}
                                <div className="grid grid-cols-3 gap-2 text-center">
                                  {/* Duração — editável */}
                                  <div className="bg-muted/40 rounded-xl p-3 flex flex-col items-center gap-1">
                                    {editingDuration?.sessionId === sessionId ? (
                                      <div className="flex items-center gap-1 w-full justify-center">
                                        <Input
                                          autoFocus
                                          type="number"
                                          value={editingDuration.value}
                                          onChange={(e) => setEditingDuration((d) => d ? { ...d, value: e.target.value } : d)}
                                          onKeyDown={(e) => handleKey(e, confirmDurationEdit)}
                                          className="h-7 w-14 text-center text-xs font-bold px-1"
                                          min={0}
                                        />
                                        <button onClick={confirmDurationEdit} disabled={saving} className="text-emerald-400 hover:text-emerald-300 active:scale-90">
                                          <Check size={13} />
                                        </button>
                                        <button onClick={() => setEditingDuration(null)} className="text-muted-foreground hover:text-foreground active:scale-90">
                                          <X size={13} />
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        onClick={() => setEditingDuration({ sessionId, value: String((item.data as any).durationMinutes ?? 0) })}
                                        className="group flex items-center gap-1 hover:text-primary transition-colors"
                                      >
                                        <p className="font-bold text-sm gradient-text">
                                          {formatDuration((item.data as any).durationMinutes ?? 0)}
                                        </p>
                                        <Pencil size={9} className="opacity-0 group-hover:opacity-60 transition-opacity text-primary" />
                                      </button>
                                    )}
                                    <p className="text-muted-foreground text-[10px] font-medium">Duração</p>
                                  </div>
                                  {/* Exercícios */}
                                  <div className="bg-muted/40 rounded-xl p-3 flex flex-col items-center gap-1">
                                    <p className="font-bold text-sm gradient-text">
                                      {(item.data as any).completedExercises}/{(item.data as any).totalExercises}
                                    </p>
                                    <p className="text-muted-foreground text-[10px] font-medium">Exercícios</p>
                                  </div>
                                  {/* Volume */}
                                  <div className="bg-muted/40 rounded-xl p-3 flex flex-col items-center gap-1">
                                    <p className="font-bold text-sm gradient-text">{formatVolume((item.data as any).totalVolume ?? 0)}</p>
                                    <p className="text-muted-foreground text-[10px] font-medium">Volume</p>
                                  </div>
                                </div>

                                {/* Hint de edição */}
                                <p className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
                                  <Pencil size={9} /> Toque nos valores de kg ou reps para corrigir
                                </p>

                                {/* Exercícios com séries editáveis */}
                                <div className="space-y-3">
                                  {(item.data as any).exercises?.map((ex: any, ei: number) => (
                                    <div key={ei} className="rounded-xl border border-border/20 bg-muted/10 overflow-hidden">
                                      {/* Nome do exercício */}
                                      <div className="px-3 py-2 border-b border-border/20 flex items-center justify-between">
                                        <p className="text-xs font-semibold">{ex.exerciseName}</p>
                                        <Badge variant="muted" className="text-[9px] px-1.5 py-0">{ex.muscleGroup}</Badge>
                                      </div>

                                      {/* Cabeçalho das colunas */}
                                      <div className="grid grid-cols-[20px_1fr_56px_56px] gap-1 px-3 py-1.5 text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">
                                        <span>#</span>
                                        <span>Status</span>
                                        <span className="text-center">Kg</span>
                                        <span className="text-center">Reps</span>
                                      </div>

                                      {/* Séries */}
                                      {ex.sets?.map((s: any, si: number) => {
                                        const isEditingW = editingSet?.sessionId === sessionId && editingSet.exerciseIdx === ei && editingSet.setIdx === si && editingSet.field === 'weight';
                                        const isEditingR = editingSet?.sessionId === sessionId && editingSet.exerciseIdx === ei && editingSet.setIdx === si && editingSet.field === 'reps';

                                        return (
                                          <div
                                            key={si}
                                            className={`grid grid-cols-[20px_1fr_56px_56px] gap-1 px-3 py-2 items-center border-t border-border/10 text-xs ${
                                              s.completed ? '' : 'opacity-40'
                                            }`}
                                          >
                                            {/* Número da série */}
                                            <span className="text-muted-foreground font-bold text-[10px]">{si + 1}</span>

                                            {/* Status */}
                                            <span className={`text-[10px] font-medium ${s.completed ? 'text-emerald-400' : 'text-muted-foreground'}`}>
                                              {s.completed ? '✓ Feita' : '— Skip'}
                                            </span>

                                            {/* Kg — editável */}
                                            <div className="flex justify-center">
                                              {isEditingW ? (
                                                <div className="flex items-center gap-0.5">
                                                  <Input
                                                    autoFocus
                                                    type="number"
                                                    value={editingSet!.value}
                                                    onChange={(e) => setEditingSet((p) => p ? { ...p, value: e.target.value } : p)}
                                                    onKeyDown={(e) => handleKey(e, confirmSetEdit)}
                                                    onBlur={confirmSetEdit}
                                                    className="h-7 w-12 text-center text-xs font-bold px-1"
                                                    step="0.5"
                                                    min={0}
                                                  />
                                                </div>
                                              ) : (
                                                <button
                                                  onClick={() => s.completed && setEditingSet({ sessionId, exerciseIdx: ei, setIdx: si, field: 'weight', value: String(s.weight ?? 0) })}
                                                  disabled={!s.completed}
                                                  className="group h-7 min-w-[44px] px-1.5 rounded-lg bg-muted/60 hover:bg-primary/15 hover:text-primary font-bold transition-colors flex items-center justify-center gap-0.5 disabled:cursor-default"
                                                >
                                                  {s.weight != null ? `${s.weight}` : '—'}
                                                  {s.completed && <Pencil size={7} className="opacity-0 group-hover:opacity-60 transition-opacity" />}
                                                </button>
                                              )}
                                            </div>

                                            {/* Reps — editável */}
                                            <div className="flex justify-center">
                                              {isEditingR ? (
                                                <Input
                                                  autoFocus
                                                  type="number"
                                                  value={editingSet!.value}
                                                  onChange={(e) => setEditingSet((p) => p ? { ...p, value: e.target.value } : p)}
                                                  onKeyDown={(e) => handleKey(e, confirmSetEdit)}
                                                  onBlur={confirmSetEdit}
                                                  className="h-7 w-12 text-center text-xs font-bold px-1"
                                                  min={0}
                                                />
                                              ) : (
                                                <button
                                                  onClick={() => s.completed && setEditingSet({ sessionId, exerciseIdx: ei, setIdx: si, field: 'reps', value: String(s.completedReps ?? 0) })}
                                                  disabled={!s.completed}
                                                  className="group h-7 min-w-[44px] px-1.5 rounded-lg bg-muted/60 hover:bg-primary/15 hover:text-primary font-bold transition-colors flex items-center justify-center gap-0.5 disabled:cursor-default"
                                                >
                                                  {s.completedReps != null ? `${s.completedReps}` : '—'}
                                                  {s.completed && <Pencil size={7} className="opacity-0 group-hover:opacity-60 transition-opacity" />}
                                                </button>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ))}
                                </div>

                                {(item.data as any).notes && (
                                  <p className="text-muted-foreground text-xs italic">"{(item.data as any).notes}"</p>
                                )}
                              </div>
                            ) : (
                              /* Cardio — sem edição inline por ora */
                              <div className="space-y-3">
                                <div className="grid grid-cols-3 gap-2 text-center">
                                  {[
                                    { label: 'Distância', value: `${(item.data as any).distance.toFixed(2)} km` },
                                    { label: 'Pace', value: formatPace((item.data as any).avgPaceMin, (item.data as any).avgPaceSec) },
                                    { label: 'Duração', value: formatDuration((item.data as any).durationMinutes) },
                                  ].map((s) => (
                                    <div key={s.label} className="bg-muted/40 rounded-xl p-3 flex flex-col items-center gap-1">
                                      <p className="font-bold text-sm gradient-text">{s.value}</p>
                                      <p className="text-muted-foreground text-[10px] font-medium">{s.label}</p>
                                    </div>
                                  ))}
                                </div>
                                <div className="flex gap-4 text-xs text-muted-foreground">
                                  <span>Esforço: {(item.data as any).perceivedEffort}/10</span>
                                  {(item.data as any).avgHeartRate && <span>❤️ {(item.data as any).avgHeartRate} bpm</span>}
                                </div>
                                {(item.data as any).notes && (
                                  <p className="text-muted-foreground text-xs italic">"{(item.data as any).notes}"</p>
                                )}
                              </div>
                            )}
                          </CardContent>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Modal de confirmação de exclusão ──────────────────────────────── */}
      <AnimatePresence>
        {deletingItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-5"
            onClick={() => setDeletingItem(null)}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              className="w-full max-w-sm bg-card rounded-2xl p-6 border border-red-500/20"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col items-center gap-3 mb-5 text-center">
                <div className="w-12 h-12 rounded-2xl bg-red-500/15 flex items-center justify-center">
                  <Trash2 size={22} className="text-red-400" />
                </div>
                <h2 className="text-lg font-bold">Remover registro?</h2>
                <p className="text-muted-foreground text-sm">
                  <span className="text-foreground font-semibold">"{deletingItem.name}"</span> será removido do histórico.
                  Os outros registros não serão afetados.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Button variant="destructive" onClick={confirmDelete} className="w-full h-11">
                  Sim, remover este registro
                </Button>
                <Button variant="ghost" onClick={() => setDeletingItem(null)} className="w-full h-11">
                  Cancelar
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
