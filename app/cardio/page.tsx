'use client';

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Plus, ChevronRight, Trophy, Timer, MapPin, Flame, TrendingUp } from 'lucide-react';
import { db } from '@/lib/db';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CardioLogForm } from '@/components/cardio/CardioLogForm';
import { formatDate, formatPace, formatDuration, getCardioTypeLabel, getCardioTypeColor } from '@/lib/utils';
import type { CardioTemplate } from '@/types';

export default function CardioPage() {
  const [showForm, setShowForm] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<CardioTemplate | null>(null);

  const templates = useLiveQuery(() => db.cardioTemplates.toArray());
  const sessions = useLiveQuery(() => db.cardioSessions.orderBy('date').reverse().limit(20).toArray());

  const totalKm = sessions?.reduce((acc, s) => acc + s.distance, 0) ?? 0;
  const totalSessions = sessions?.length ?? 0;
  const bestPaceSession = sessions?.reduce<typeof sessions[0] | null>((best, s) => {
    if (!best) return s;
    const bestSec = best.avgPaceMin * 60 + best.avgPaceSec;
    const sSec = s.avgPaceMin * 60 + s.avgPaceSec;
    return sSec < bestSec ? s : best;
  }, null);

  const handleSelectTemplate = (t: CardioTemplate) => {
    setSelectedTemplate(t);
    setShowForm(true);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="relative overflow-hidden px-5 pt-safe-lg pb-6">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.12) 0%, rgba(255,61,127,0.08) 100%)' }} />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg"
              style={{ background: 'linear-gradient(135deg, #A855F7, #FF3D7F)' }}>
              <Activity size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Cardio</h1>
              <p className="text-muted-foreground text-xs">Corridas & Caminhadas</p>
            </div>
          </div>
          <Button size="icon" onClick={() => { setSelectedTemplate(null); setShowForm(true); }}>
            <Plus size={20} />
          </Button>
        </div>
      </div>

      {/* Stats strip */}
      <div className="px-5 mb-5">
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: <MapPin size={16} className="text-purple-400" />, label: 'Total KM', value: `${totalKm.toFixed(1)} km` },
            { icon: <Activity size={16} className="text-pink-400" />, label: 'Corridas', value: String(totalSessions) },
            { icon: <Trophy size={16} className="text-yellow-400" />, label: 'Melhor Pace', value: bestPaceSession ? formatPace(bestPaceSession.avgPaceMin, bestPaceSession.avgPaceSec) : '--' },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
            >
              <Card className="glass border-border/30">
                <CardContent className="p-3 text-center">
                  <div className="flex justify-center mb-1.5">{stat.icon}</div>
                  <p className="font-bold text-sm gradient-text">{stat.value}</p>
                  <p className="text-muted-foreground text-[10px] font-medium">{stat.label}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="px-5 space-y-5 pb-6">
        {/* Templates */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Templates de Treino</p>
          <div className="grid grid-cols-2 gap-3">
            {templates?.map((t, i) => (
              <motion.button
                key={t.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.06 }}
                onClick={() => handleSelectTemplate(t)}
                className="text-left"
              >
                <Card className="glass border-border/30 hover:border-primary/30 transition-all active:scale-[0.97] h-full">
                  <CardContent className="p-4">
                    <div className={`text-2xl mb-2`}>
                      {t.type === 'leve' ? '🏃' : t.type === 'intervalado' ? '⚡' : t.type === 'tempo' ? '🎯' : '🏆'}
                    </div>
                    <p className="font-semibold text-sm">{t.name}</p>
                    <Badge variant="muted" className={`mt-1 text-[10px] ${getCardioTypeColor(t.type)}`}>
                      {getCardioTypeLabel(t.type)}
                    </Badge>
                    {t.targetDistance && (
                      <p className="text-muted-foreground text-xs mt-1">{t.targetDistance} km • {formatPace(t.targetPaceMin ?? 0, t.targetPaceSec ?? 0)}</p>
                    )}
                  </CardContent>
                </Card>
              </motion.button>
            ))}
            {/* Free run button */}
            <motion.button
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: (templates?.length ?? 0) * 0.06 }}
              onClick={() => { setSelectedTemplate(null); setShowForm(true); }}
              className="text-left"
            >
              <Card className="glass border-dashed border-primary/30 hover:border-primary/50 transition-all active:scale-[0.97] h-full">
                <CardContent className="p-4 flex flex-col items-center justify-center min-h-[100px] text-center">
                  <div className="w-10 h-10 rounded-2xl gradient-bg-soft border border-primary/30 flex items-center justify-center mb-2">
                    <Plus size={20} className="text-primary" />
                  </div>
                  <p className="font-semibold text-sm text-primary">Registrar Livre</p>
                  <p className="text-muted-foreground text-xs mt-0.5">Sem template</p>
                </CardContent>
              </Card>
            </motion.button>
          </div>
        </div>

        {/* Recent sessions */}
        {sessions && sessions.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Últimas Corridas</p>
            <div className="space-y-2">
              {sessions.slice(0, 8).map((s, i) => (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <Card className="glass border-border/30">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{s.type === 'leve' ? '🏃' : s.type === 'intervalado' ? '⚡' : s.type === 'tempo' ? '🎯' : '🏆'}</span>
                          <div>
                            <p className="font-semibold text-sm">{s.templateName ?? getCardioTypeLabel(s.type)}</p>
                            <p className="text-muted-foreground text-xs">{formatDate(new Date(s.date))}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-base gradient-text">{s.distance.toFixed(2)} km</p>
                          <p className="text-muted-foreground text-xs">{formatPace(s.avgPaceMin, s.avgPaceSec)}/km</p>
                        </div>
                      </div>
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Timer size={10} /> {formatDuration(s.durationMinutes)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Flame size={10} className="text-orange-400" />
                          <span>Esforço <span className="text-foreground font-medium">{s.perceivedEffort}</span>/10</span>
                        </span>
                        {s.avgHeartRate && <span>❤️ {s.avgHeartRate} bpm</span>}
                      </div>
                      {s.notes && <p className="text-muted-foreground text-xs mt-2 italic">"{s.notes}"</p>}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {!sessions?.length && (
          <Card className="glass border-border/30">
            <CardContent className="p-10 text-center">
              <div className="text-4xl mb-3">🏃‍♀️</div>
              <p className="font-semibold">Nenhuma corrida ainda</p>
              <p className="text-muted-foreground text-sm mt-1">Registre sua primeira corrida!</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Form Modal */}
      <AnimatePresence>
        {showForm && (
          <CardioLogForm
            template={selectedTemplate}
            onClose={() => setShowForm(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
