'use client';

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion } from 'framer-motion';
import { Clock, Dumbbell, Activity, TrendingUp, Calendar, ChevronDown, ChevronUp, Trophy } from 'lucide-react';
import { db } from '@/lib/db';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate, formatDuration, formatPace, formatVolume, getCardioTypeLabel } from '@/lib/utils';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type Filter = 'todos' | 'treino' | 'cardio';

const stripPrefix = (name: string) =>
  name.replace(/^Treino [A-Za-z]+ [-–] /, '').replace(/^Treino [A-Za-z]+ - /, '');

export default function HistoricoPage() {
  const [filter, setFilter] = useState<Filter>('todos');
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const workouts = useLiveQuery(() => db.workoutSessions.orderBy('date').reverse().toArray());
  const cardios = useLiveQuery(() => db.cardioSessions.orderBy('date').reverse().toArray());

  // Merge and sort
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
  const monthEnd = endOfMonth(now);
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
        if (!prMap[key] || (s.weight! > prMap[key].weight)) {
          prMap[key] = { weight: s.weight!, reps: s.completedReps!, date: new Date(w.date) };
        }
      });
    });
  });

  const topPRs = Object.entries(prMap)
    .sort((a, b) => b[1].weight - a[1].weight)
    .slice(0, 5);

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
                <motion.div
                  key={name}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card className="glass border-yellow-500/20">
                    <CardContent className="p-3.5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-yellow-500/20 flex items-center justify-center text-xs font-bold text-yellow-400">
                          {i + 1}
                        </div>
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
                filter === key
                  ? 'gradient-bg text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                filter === key ? 'bg-white/20' : 'bg-muted text-muted-foreground'
              }`}>{count}</span>
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

              return (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.04, 0.3) }}
                >
                  <Card className={`border transition-all ${isExpanded ? 'border-primary/30' : 'border-border/30 glass'}`}>
                    <button
                      onClick={() => setExpandedItem(isExpanded ? null : key)}
                      className="w-full text-left"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
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
                            <div>
                              <p className="font-semibold text-sm">
                                {item.type === 'workout'
                                  ? stripPrefix((item.data as any).templateName ?? '')
                                  : ((item.data as any).templateName ?? getCardioTypeLabel((item.data as any).type))
                                }
                              </p>
                              <p className="text-muted-foreground text-xs">{formatDate(item.date)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {item.type === 'workout' ? (
                              <Badge variant="muted" className="text-[10px]">{formatVolume((item.data as any).totalVolume ?? 0)}</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[10px]">{(item.data as any).distance.toFixed(1)} km</Badge>
                            )}
                            {isExpanded ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
                          </div>
                        </div>
                      </CardContent>
                    </button>

                    {/* Expanded details */}
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        className="overflow-hidden border-t border-border/30"
                      >
                        <CardContent className="p-4 pt-3">
                          {item.type === 'workout' ? (
                            <div className="space-y-3">
                              <div className="grid grid-cols-3 gap-2 text-center">
                                {[
                                  { label: 'Duração', value: formatDuration((item.data as any).durationMinutes ?? 0) },
                                  { label: 'Exercícios', value: `${(item.data as any).completedExercises}/${(item.data as any).totalExercises}` },
                                  { label: 'Volume', value: formatVolume((item.data as any).totalVolume ?? 0) },
                                ].map((s) => (
                                  <div key={s.label} className="bg-muted/40 rounded-xl p-3 flex flex-col items-center gap-1">
                                    <p className="font-bold text-sm gradient-text">{s.value}</p>
                                    <p className="text-muted-foreground text-[10px] font-medium">{s.label}</p>
                                  </div>
                                ))}
                              </div>
                              <div className="space-y-1">
                                {(item.data as any).exercises?.slice(0, 5).map((ex: any, ei: number) => (
                                  <div key={ei} className="flex items-center justify-between text-xs py-1 border-b border-border/20 last:border-0">
                                    <span className="text-muted-foreground">{ex.exerciseName}</span>
                                    <span className="font-medium">
                                      {ex.sets.filter((s: any) => s.completed).length}/{ex.sets.length} séries
                                    </span>
                                  </div>
                                ))}
                              </div>
                              {(item.data as any).notes && (
                                <p className="text-muted-foreground text-xs italic">"{(item.data as any).notes}"</p>
                              )}
                            </div>
                          ) : (
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
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
