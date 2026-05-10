'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dumbbell, Activity, TrendingUp, Flame, Star, ChevronRight,
  Trophy, Weight, X, Plus, Trash2,
} from 'lucide-react';
import Link from 'next/link';
import {
  db, getWeeklyStats, getPersonalRecords, getBestPace,
  getLatestWeight, getWeightHistory, addWeightEntry, deleteWeightEntry,
} from '@/lib/db';
import { formatDate, formatPace, formatVolume, getGreeting, getWeekStart } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useEffect, useState, useMemo } from 'react';
import type { WeightEntry } from '@/types';

const WEEK_GOAL = 5;

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.07, duration: 0.4, ease: 'easeOut' },
  }),
};

// ─── Gráfico SVG puro ──────────────────────────────────────────────────────────
interface WeightChartProps {
  data: { date: string; peso: number }[];
}

function WeightChart({ data }: WeightChartProps) {
  const W = 320;
  const H = 160;
  const PAD = { top: 12, right: 12, bottom: 28, left: 36 };

  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const values = data.map((d) => d.peso);
  const minV = Math.floor(Math.min(...values) - 1);
  const maxV = Math.ceil(Math.max(...values) + 1);
  const range = maxV - minV || 1;

  const toX = (i: number) => PAD.left + (i / (data.length - 1)) * chartW;
  const toY = (v: number) => PAD.top + chartH - ((v - minV) / range) * chartH;

  // Linha principal
  const linePath = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)} ${toY(d.peso).toFixed(1)}`)
    .join(' ');

  // Área preenchida (gradiente)
  const areaPath = [
    ...data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)} ${toY(d.peso).toFixed(1)}`),
    `L ${toX(data.length - 1).toFixed(1)} ${(PAD.top + chartH).toFixed(1)}`,
    `L ${PAD.left.toFixed(1)} ${(PAD.top + chartH).toFixed(1)}`,
    'Z',
  ].join(' ');

  // Labels do eixo Y (3 pontos)
  const yLabels = [minV, Math.round((minV + maxV) / 2), maxV];

  // Labels do eixo X (max 5 pontos)
  const xStep = Math.max(1, Math.floor(data.length / 5));
  const xLabels = data.filter((_, i) => i % xStep === 0 || i === data.length - 1);

  // Tooltip
  const [tooltip, setTooltip] = useState<{ x: number; y: number; value: number; label: string } | null>(null);

  return (
    <div className="relative w-full" style={{ maxWidth: W }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        onMouseLeave={() => setTooltip(null)}
      >
        <defs>
          <linearGradient id="wLineGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#ff3d7f" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
          <linearGradient id="wAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ff3d7f" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid horizontal */}
        {yLabels.map((v) => (
          <line
            key={v}
            x1={PAD.left}
            x2={PAD.left + chartW}
            y1={toY(v)}
            y2={toY(v)}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="1"
          />
        ))}

        {/* Área */}
        <path d={areaPath} fill="url(#wAreaGrad)" />

        {/* Linha */}
        <path
          d={linePath}
          fill="none"
          stroke="url(#wLineGrad)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Pontos + hit area */}
        {data.map((d, i) => (
          <g key={i}>
            <circle
              cx={toX(i)}
              cy={toY(d.peso)}
              r={14}
              fill="transparent"
              onMouseEnter={() => setTooltip({ x: toX(i), y: toY(d.peso), value: d.peso, label: d.date })}
              onTouchStart={() => setTooltip({ x: toX(i), y: toY(d.peso), value: d.peso, label: d.date })}
              className="cursor-pointer"
            />
            <circle
              cx={toX(i)}
              cy={toY(d.peso)}
              r={i === data.length - 1 ? 5 : 3.5}
              fill={i === data.length - 1 ? '#a855f7' : '#ff3d7f'}
              stroke={i === data.length - 1 ? 'rgba(168,85,247,0.3)' : 'none'}
              strokeWidth="4"
            />
          </g>
        ))}

        {/* Eixo Y labels */}
        {yLabels.map((v) => (
          <text
            key={v}
            x={PAD.left - 6}
            y={toY(v) + 4}
            textAnchor="end"
            fontSize="9"
            fill="rgba(255,255,255,0.4)"
          >
            {v}
          </text>
        ))}

        {/* Eixo X labels */}
        {xLabels.map((d) => {
          const i = data.indexOf(d);
          return (
            <text
              key={i}
              x={toX(i)}
              y={H - 6}
              textAnchor="middle"
              fontSize="9"
              fill="rgba(255,255,255,0.4)"
            >
              {d.date}
            </text>
          );
        })}

        {/* Tooltip */}
        {tooltip && (
          <g>
            <line
              x1={tooltip.x}
              x2={tooltip.x}
              y1={PAD.top}
              y2={PAD.top + chartH}
              stroke="rgba(255,255,255,0.15)"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
            <rect
              x={tooltip.x > W / 2 ? tooltip.x - 64 : tooltip.x + 8}
              y={tooltip.y - 24}
              width={56}
              height={32}
              rx={6}
              fill="hsl(var(--card))"
              stroke="rgba(255,61,127,0.3)"
              strokeWidth="1"
            />
            <text
              x={tooltip.x > W / 2 ? tooltip.x - 36 : tooltip.x + 36}
              y={tooltip.y - 10}
              textAnchor="middle"
              fontSize="8"
              fill="rgba(255,255,255,0.5)"
            >
              {tooltip.label}
            </text>
            <text
              x={tooltip.x > W / 2 ? tooltip.x - 36 : tooltip.x + 36}
              y={tooltip.y + 4}
              textAnchor="middle"
              fontSize="11"
              fontWeight="bold"
              fill="#ff3d7f"
            >
              {tooltip.value} kg
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}

// ─── Dashboard ─────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const settings = useLiveQuery(() => db.settings.toCollection().first());
  const recentWorkouts = useLiveQuery(() =>
    db.workoutSessions.orderBy('date').reverse().limit(5).toArray()
  );
  const recentCardios = useLiveQuery(() =>
    db.cardioSessions.orderBy('date').reverse().limit(5).toArray()
  );
  const templates = useLiveQuery(() => db.workoutTemplates.orderBy('letter').toArray());

  const [weekStats, setWeekStats] = useState({ workouts: 0, cardios: 0, volume: 0, km: 0 });
  const [bestPace, setBestPace] = useState<{ paceMin: number; paceSec: number; date: Date } | null>(null);
  const [prCount, setPrCount] = useState(0);
  const [latestWeight, setLatestWeight] = useState<WeightEntry | undefined>(undefined);
  const [weightHistory, setWeightHistory] = useState<WeightEntry[]>([]);

  const [showWeightModal, setShowWeightModal] = useState(false);
  const [newWeight, setNewWeight] = useState('');
  const [addingWeight, setAddingWeight] = useState(false);

  const refreshWeight = () => {
    getLatestWeight().then(setLatestWeight);
    getWeightHistory().then(setWeightHistory);
  };

  useEffect(() => {
    const weekStart = getWeekStart();
    getWeeklyStats(weekStart).then(setWeekStats);
    getBestPace().then(setBestPace);
    getPersonalRecords().then((prs) => setPrCount(Object.keys(prs).length));
    refreshWeight();
  }, [recentWorkouts, recentCardios]);

  const totalActivities = weekStats.workouts;
  const progress = Math.min((totalActivities / WEEK_GOAL) * 100, 100);

  const lastWorkout = recentWorkouts?.[0];
  const allLetters = templates?.map((t) => t.letter) ?? ['A', 'B', 'C', 'D', 'E'];
  const nextIndex = lastWorkout?.templateLetter
    ? (allLetters.indexOf(lastWorkout.templateLetter) + 1) % allLetters.length
    : 0;
  const nextTemplate = templates?.[nextIndex];

  const chartData = useMemo(
    () => weightHistory.map((e) => ({
      date: new Date(e.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      peso: e.weight,
    })),
    [weightHistory]
  );

  const weightDelta = weightHistory.length >= 2
    ? weightHistory[weightHistory.length - 1].weight - weightHistory[weightHistory.length - 2].weight
    : null;

  const handleAddWeight = async () => {
    const w = parseFloat(newWeight.replace(',', '.'));
    if (isNaN(w) || w <= 0 || w > 500) return;
    setAddingWeight(true);
    await addWeightEntry(w);
    setNewWeight('');
    refreshWeight();
    setAddingWeight(false);
  };

  const handleDeleteWeight = async (id: number) => {
    await deleteWeightEntry(id);
    refreshWeight();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Header */}
      <div className="relative overflow-hidden px-5 pt-14 pb-8">
        <div className="absolute inset-0 gradient-bg-soft" />
        <div className="absolute -top-20 -right-20 w-48 h-48 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-secondary/10 blur-3xl" />
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative"
        >
          <p className="text-muted-foreground text-sm font-medium">
            {getGreeting()}, {settings?.userName?.split(' ')[0] ?? 'linda'} ✨
          </p>
          <h1 className="text-2xl font-bold mt-0.5">
            Vamos <span className="gradient-text">treinar</span> hoje?
          </h1>
        </motion.div>

        {/* Weekly progress */}
        <motion.div
          custom={1}
          initial="hidden"
          animate="show"
          variants={fadeUp}
          className="relative mt-5 p-4 rounded-2xl glass"
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Semana Atual</p>
              <p className="text-lg font-bold mt-0.5">
                {totalActivities}{' '}
                <span className="text-muted-foreground font-normal text-sm">de {WEEK_GOAL} treinos</span>
              </p>
            </div>
            <div className="text-2xl font-bold gradient-text">{Math.round(progress)}%</div>
          </div>
          <Progress value={progress} className="h-2.5" />
          <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
            <span>🏋️ {weekStats.workouts} treinos</span>
            <span>🏃 {weekStats.cardios} corridas</span>
            <span>📏 {weekStats.km.toFixed(1)} km</span>
          </div>
        </motion.div>
      </div>

      <div className="px-5 pb-4 space-y-5">
        {/* Quick Actions */}
        <motion.div custom={2} initial="hidden" animate="show" variants={fadeUp} className="grid grid-cols-2 gap-3">
          <Link href="/treino">
            <div className="relative overflow-hidden rounded-2xl p-4 gradient-bg card-glow-active">
              <div className="absolute -right-4 -bottom-4 opacity-20">
                <Dumbbell size={64} />
              </div>
              <Dumbbell size={24} className="text-white mb-3" />
              <p className="text-white font-bold text-base">Iniciar Treino</p>
              <p className="text-white/70 text-xs mt-0.5">
                {nextTemplate ? `Próximo: ${nextTemplate.letter}` : 'Selecionar treino'}
              </p>
            </div>
          </Link>
          <Link href="/cardio">
            <div className="relative overflow-hidden rounded-2xl p-4 bg-card border border-secondary/30 card-glow">
              <div className="absolute -right-4 -bottom-4 opacity-10">
                <Activity size={64} />
              </div>
              <Activity size={24} className="text-secondary mb-3" />
              <p className="font-bold text-base">Registrar Cardio</p>
              <p className="text-muted-foreground text-xs mt-0.5">Corrida, caminhada…</p>
            </div>
          </Link>
        </motion.div>

        {/* Stats grid 2x2 */}
        <motion.div custom={3} initial="hidden" animate="show" variants={fadeUp} className="grid grid-cols-2 gap-3">
          {/* Sequência */}
          <Card className="glass border-border/30">
            <CardContent className="p-3 text-center">
              <div className="flex justify-center mb-1.5">
                <Flame size={18} className="text-orange-400" />
              </div>
              <p className="font-bold text-base">{recentWorkouts?.length ?? 0}d</p>
              <p className="text-muted-foreground text-[10px]">Sequência</p>
            </CardContent>
          </Card>

          {/* Volume */}
          <Card className="glass border-border/30">
            <CardContent className="p-3 text-center">
              <div className="flex justify-center mb-1.5">
                <TrendingUp size={18} className="text-emerald-400" />
              </div>
              <p className="font-bold text-base">{formatVolume(weekStats.volume)}</p>
              <p className="text-muted-foreground text-[10px]">Volume</p>
            </CardContent>
          </Card>

          {/* Melhor Pace */}
          <Card className="glass border-border/30">
            <CardContent className="p-3 text-center">
              <div className="flex justify-center mb-1.5">
                <Activity size={18} className="text-blue-400" />
              </div>
              <p className="font-bold text-base">
                {bestPace ? formatPace(bestPace.paceMin, bestPace.paceSec) : '--'}
              </p>
              <p className="text-muted-foreground text-[10px]">Melhor Pace</p>
            </CardContent>
          </Card>

          {/* Peso Atual — clicável */}
          <button onClick={() => setShowWeightModal(true)} className="text-left w-full">
            <Card className="glass border-border/30 hover:border-primary/40 hover:card-glow transition-all active:scale-[0.97] cursor-pointer h-full">
              <CardContent className="p-3 text-center">
                <div className="flex justify-center mb-1.5">
                  <Weight size={18} className="text-primary" />
                </div>
                <p className="font-bold text-base">
                  {latestWeight ? `${latestWeight.weight} kg` : '--'}
                </p>
                <p className="text-muted-foreground text-[10px] leading-tight">
                  Peso Atual
                  {weightDelta !== null && (
                    <span className={`ml-1 font-semibold ${weightDelta < 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {weightDelta > 0 ? `+${weightDelta.toFixed(1)}` : weightDelta.toFixed(1)}
                    </span>
                  )}
                </p>
              </CardContent>
            </Card>
          </button>
        </motion.div>

        {/* Próximo treino sugerido */}
        {nextTemplate && (
          <motion.div custom={4} initial="hidden" animate="show" variants={fadeUp}>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Próximo Treino Sugerido</p>
            <Link href="/treino">
              <Card className="glass border-primary/20 card-glow hover:card-glow-active transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center font-bold text-white text-lg shadow-md">
                        {nextTemplate.letter}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{nextTemplate.name}</p>
                        <p className="text-muted-foreground text-xs">{nextTemplate.exercises.length} exercícios</p>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        )}

        {/* Últimas atividades */}
        <motion.div custom={5} initial="hidden" animate="show" variants={fadeUp}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Últimas Atividades</p>
            <Link href="/historico" className="text-primary text-xs font-medium">Ver tudo</Link>
          </div>

          {(!recentWorkouts?.length && !recentCardios?.length) ? (
            <Card className="glass border-border/30">
              <CardContent className="p-8 text-center">
                <div className="w-12 h-12 rounded-2xl gradient-bg-soft flex items-center justify-center mx-auto mb-3">
                  <Star size={22} className="text-primary" />
                </div>
                <p className="font-semibold">Nenhuma atividade ainda</p>
                <p className="text-muted-foreground text-sm mt-1">Comece seu primeiro treino agora!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {[
                ...(recentWorkouts?.slice(0, 3).map((w) => ({ type: 'workout' as const, data: w })) ?? []),
                ...(recentCardios?.slice(0, 3).map((c) => ({ type: 'cardio' as const, data: c })) ?? []),
              ]
                .sort((a, b) => new Date(b.data.date).getTime() - new Date(a.data.date).getTime())
                .slice(0, 4)
                .map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.05 }}
                  >
                    {item.type === 'workout' ? (
                      <Card className="glass border-border/30">
                        <CardContent className="p-3.5 flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl gradient-bg flex items-center justify-center font-bold text-white text-sm shrink-0">
                            {item.data.templateLetter}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{item.data.templateName}</p>
                            <p className="text-muted-foreground text-xs">{formatDate(new Date(item.data.date))} • {item.data.durationMinutes}min</p>
                          </div>
                          <Badge variant="muted" className="text-[10px] shrink-0">
                            {formatVolume(item.data.totalVolume ?? 0)}
                          </Badge>
                        </CardContent>
                      </Card>
                    ) : (
                      <Card className="glass border-border/30">
                        <CardContent className="p-3.5 flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-secondary/20 flex items-center justify-center shrink-0">
                            <Activity size={18} className="text-secondary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{item.data.templateName ?? 'Corrida'}</p>
                            <p className="text-muted-foreground text-xs">
                              {formatDate(new Date(item.data.date))} • {item.data.distance.toFixed(1)} km
                            </p>
                          </div>
                          <Badge variant="secondary" className="text-[10px] shrink-0">
                            {formatPace(item.data.avgPaceMin, item.data.avgPaceSec)}
                          </Badge>
                        </CardContent>
                      </Card>
                    )}
                  </motion.div>
                ))}
            </div>
          )}
        </motion.div>

        {/* Records */}
        {prCount > 0 && (
          <motion.div custom={6} initial="hidden" animate="show" variants={fadeUp}>
            <Card className="glass border-yellow-500/20">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                  <Trophy size={20} className="text-yellow-400" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Recordes Pessoais</p>
                  <p className="text-muted-foreground text-xs">
                    {prCount} exercício{prCount !== 1 ? 's' : ''} com PR registrado
                  </p>
                </div>
                <ChevronRight size={18} className="text-muted-foreground ml-auto" />
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>

      {/* ── Modal de Peso ───────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showWeightModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end"
            onClick={() => setShowWeightModal(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 38 }}
              className="w-full bg-card rounded-t-3xl border-t border-border/50 max-h-[88vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Handle + header */}
              <div className="px-6 pt-4 pb-3 flex-shrink-0">
                <div className="w-10 h-1 bg-muted rounded-full mx-auto mb-4" />
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold">Evolução do Peso</h2>
                    <p className="text-muted-foreground text-xs mt-0.5">
                      {latestWeight
                        ? `Atual: ${latestWeight.weight} kg${weightDelta !== null ? ` (${weightDelta > 0 ? '+' : ''}${weightDelta!.toFixed(1)} kg)` : ''}`
                        : 'Nenhum registro ainda'}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowWeightModal(false)}
                    className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center hover:bg-muted/60 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Scroll area */}
              <div className="flex-1 overflow-y-auto px-6 pb-8 space-y-5">

                {/* Gráfico */}
                {chartData.length >= 2 ? (
                  <div className="rounded-2xl bg-muted/20 border border-border/20 p-3 overflow-hidden">
                    <WeightChart data={chartData} />
                  </div>
                ) : chartData.length === 1 ? (
                  <div className="rounded-2xl bg-muted/30 border border-border/30 p-6 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Registre mais medições para ver o gráfico</p>
                    <p className="text-3xl font-bold gradient-text mt-1">{chartData[0].peso} kg</p>
                  </div>
                ) : (
                  <div className="rounded-2xl bg-muted/30 border border-border/30 p-8 text-center">
                    <Weight size={32} className="text-muted-foreground mx-auto mb-3 opacity-30" />
                    <p className="text-sm text-muted-foreground">
                      Nenhum registro de peso ainda.
                    </p>
                  </div>
                )}

                {/* Input novo peso */}
                <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-3">
                  <p className="text-xs font-semibold text-primary flex items-center gap-1.5">
                    <Plus size={12} />
                    Registrar peso de hoje
                  </p>
                  <div className="flex gap-2 items-center">
                    <Input
                      type="number"
                      placeholder="Ex: 72.5"
                      value={newWeight}
                      onChange={(e) => setNewWeight(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleAddWeight(); }}
                      className="h-11 text-base font-semibold text-center flex-1"
                      step="0.1"
                      min="20"
                      max="500"
                    />
                    <span className="text-sm text-muted-foreground font-medium shrink-0">kg</span>
                    <Button
                      onClick={handleAddWeight}
                      disabled={addingWeight || !newWeight.trim()}
                      className="h-11 px-4 shrink-0"
                    >
                      <Plus size={18} />
                      Salvar
                    </Button>
                  </div>
                </div>

                {/* Histórico */}
                {weightHistory.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Histórico ({weightHistory.length})
                    </p>
                    <div className="space-y-1.5">
                      {[...weightHistory].reverse().map((entry, idx, arr) => {
                        // delta em relação ao registro anterior (no array original)
                        const origIdx = weightHistory.indexOf(entry);
                        const prevEntry = origIdx > 0 ? weightHistory[origIdx - 1] : null;
                        const delta = prevEntry ? entry.weight - prevEntry.weight : null;
                        return (
                          <div
                            key={entry.id}
                            className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-muted/30 border border-border/20"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                              <div>
                                <p className="text-sm font-semibold">{entry.weight} kg</p>
                                <p className="text-[10px] text-muted-foreground">
                                  {new Date(entry.date).toLocaleDateString('pt-BR', {
                                    day: '2-digit', month: 'short', year: 'numeric',
                                  })}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {delta !== null && delta !== 0 && (
                                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${
                                  delta < 0
                                    ? 'bg-emerald-500/15 text-emerald-400'
                                    : 'bg-rose-500/15 text-rose-400'
                                }`}>
                                  {delta > 0 ? '+' : ''}{delta.toFixed(1)}
                                </span>
                              )}
                              <button
                                onClick={() => handleDeleteWeight(entry.id!)}
                                className="w-7 h-7 rounded-lg hover:bg-red-500/15 hover:text-red-400 flex items-center justify-center transition-colors"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
