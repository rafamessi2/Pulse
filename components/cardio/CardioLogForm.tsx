'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Save, Activity } from 'lucide-react';
import { db } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toaster';
import { calcPace, getCardioTypeLabel } from '@/lib/utils';
import type { CardioTemplate, CardioType } from '@/types';

interface Props {
  template: CardioTemplate | null;
  onClose: () => void;
}

const EFFORT_LABELS = ['', 'Muito fácil', 'Fácil', 'Moderado', 'Moderado+', 'Médio', 'Difícil', 'Muito difícil', 'Extremo', 'Máximo', '💀 Tudo'];

export function CardioLogForm({ template, onClose }: Props) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    distance: template?.targetDistance?.toString() ?? '',
    durationMinutes: template?.targetDurationMinutes?.toString() ?? '',
    durationSeconds: '0',
    avgHeartRate: '',
    perceivedEffort: 6,
    notes: '',
    type: (template?.type ?? 'leve') as CardioType,
  });
  const [saving, setSaving] = useState(false);

  const distance = parseFloat(form.distance) || 0;
  const durMin = parseInt(form.durationMinutes) || 0;
  const durSec = parseInt(form.durationSeconds) || 0;
  const pace = distance > 0 ? calcPace(distance, durMin, durSec) : null;

  const set = (key: string, value: string | number) => setForm((f) => ({ ...f, [key]: value }));

  const handleSave = async () => {
    if (!distance || !durMin) {
      toast({ title: 'Preencha distância e duração', variant: 'error' });
      return;
    }
    setSaving(true);
    try {
      await db.cardioSessions.add({
        templateId: template?.id,
        templateName: template?.name,
        type: form.type,
        date: new Date(),
        distance,
        durationMinutes: durMin,
        durationSeconds: durSec,
        avgPaceMin: pace?.min ?? 0,
        avgPaceSec: pace?.sec ?? 0,
        avgHeartRate: form.avgHeartRate ? parseInt(form.avgHeartRate) : undefined,
        perceivedEffort: form.perceivedEffort,
        notes: form.notes || undefined,
        origem: 'cardio_avulso',
      });
      toast({ title: '🏃 Corrida salva!', description: `${distance.toFixed(2)} km registrados`, variant: 'success' });
      onClose();
    } catch {
      toast({ title: 'Erro ao salvar', variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const TYPES: CardioType[] = ['leve', 'intervalado', 'tempo', 'longao'];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 400, damping: 40 }}
        className="w-full bg-card rounded-t-3xl border-t border-border/50 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle + Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-muted rounded-full" />
        </div>
        <div className="flex items-center justify-between px-5 pt-4 pb-4 sticky top-0 bg-card border-b border-border/30">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl gradient-bg flex items-center justify-center">
              <Activity size={18} className="text-white" />
            </div>
            <div>
              <h2 className="font-bold">{template?.name ?? 'Registrar Corrida'}</h2>
              <p className="text-muted-foreground text-xs">{new Date().toLocaleDateString('pt-BR')}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground"><X size={20} /></button>
        </div>

        <div className="px-5 py-5 space-y-5">
          {/* Type selector */}
          {!template && (
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">Tipo de treino</label>
              <div className="grid grid-cols-2 gap-2">
                {TYPES.map((t) => (
                  <button
                    key={t}
                    onClick={() => set('type', t)}
                    className={`p-3 rounded-xl text-sm font-medium border transition-all ${
                      form.type === t ? 'gradient-bg text-white border-transparent' : 'glass border-border/30 text-muted-foreground'
                    }`}
                  >
                    {t === 'leve' ? '🏃 ' : t === 'intervalado' ? '⚡ ' : t === 'tempo' ? '🎯 ' : '🏆 '}
                    {getCardioTypeLabel(t)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Distance + Duration */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">Distância (km)</label>
              <Input
                type="number"
                step="0.01"
                placeholder="5.00"
                value={form.distance}
                onChange={(e) => set('distance', e.target.value)}
                className="text-center font-bold text-lg h-14"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">Duração</label>
              <div className="flex gap-1 items-center">
                <Input
                  type="number"
                  placeholder="min"
                  value={form.durationMinutes}
                  onChange={(e) => set('durationMinutes', e.target.value)}
                  className="text-center font-bold h-14 text-base"
                />
                <span className="text-muted-foreground font-bold">:</span>
                <Input
                  type="number"
                  placeholder="s"
                  value={form.durationSeconds}
                  onChange={(e) => set('durationSeconds', e.target.value)}
                  className="text-center font-bold h-14 text-base w-16"
                />
              </div>
            </div>
          </div>

          {/* Pace display */}
          {pace && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              className="rounded-2xl gradient-bg-soft border border-primary/20 p-4 text-center"
            >
              <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wider mb-1">⚡ Pace Médio Calculado</p>
              <p className="text-4xl font-bold gradient-text">
                {pace.min}:{String(pace.sec).padStart(2, '0')}
                <span className="text-base text-muted-foreground font-normal ml-1">/km</span>
              </p>
            </motion.div>
          )}

          {/* FC */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">FC Média (opcional)</label>
            <Input
              type="number"
              placeholder="150 bpm"
              value={form.avgHeartRate}
              onChange={(e) => set('avgHeartRate', e.target.value)}
              className="h-11"
            />
          </div>

          {/* Perceived effort */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Esforço Percebido
              </label>
              <span className="gradient-text font-bold text-sm">{form.perceivedEffort}/10</span>
            </div>
            <p className="text-xs text-center mb-3 text-muted-foreground font-medium">{EFFORT_LABELS[form.perceivedEffort]}</p>
            <div className="flex gap-1">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((v) => (
                <button
                  key={v}
                  onClick={() => set('perceivedEffort', v)}
                  className={`flex-1 h-10 rounded-lg text-xs font-bold transition-all active:scale-90 ${
                    v === form.perceivedEffort
                      ? 'gradient-bg text-white scale-105 shadow-md'
                      : v < form.perceivedEffort
                      ? 'gradient-bg text-white opacity-60'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">Observações</label>
            <Textarea
              placeholder="Como foi a corrida? Condições, sensações…"
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              rows={3}
            />
          </div>

          <Button onClick={handleSave} className="w-full h-14 text-base rounded-2xl" disabled={saving}>
            <Save size={19} />
            {saving ? 'Salvando…' : 'Salvar Corrida'}
          </Button>
          <div className="h-4" />
        </div>
      </motion.div>
    </motion.div>
  );
}
