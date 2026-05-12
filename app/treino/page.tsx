'use client';

import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, AnimatePresence } from 'framer-motion';
import { Dumbbell, ChevronRight, Clock, Zap, RotateCcw, X } from 'lucide-react';
import { db, loadDraft, clearDraft } from '@/lib/db';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { WorkoutSession } from '@/components/treino/ActiveWorkout';
import type { WorkoutTemplate, WorkoutDraft } from '@/types';
import { formatDate } from '@/lib/utils';

export default function TreinoPage() {
  const [selectedTemplate, setSelectedTemplate] = useState<WorkoutTemplate | null>(null);
  const [activeDraft, setActiveDraft] = useState<WorkoutDraft | undefined>(undefined);
  const [draft, setDraft] = useState<WorkoutDraft | null>(null);
  const [draftTemplate, setDraftTemplate] = useState<WorkoutTemplate | null>(null);
  const [dismissedDraft, setDismissedDraft] = useState(false);

  const templates = useLiveQuery(() => db.workoutTemplates.orderBy('letter').toArray());
  const lastSessions = useLiveQuery(() =>
    db.workoutSessions.orderBy('date').reverse().limit(20).toArray()
  );

  useEffect(() => {
    loadDraft().then(async (d) => {
      if (!d) return;
      setDraft(d);
      const tmpl = await db.workoutTemplates.get(d.templateId);
      if (tmpl) setDraftTemplate(tmpl);
    });
  }, []);

  const stripPrefix = (name: string) =>
    name.replace(/^Treino [A-Za-z]+ [-–] /, '').replace(/^Treino [A-Za-z]+ - /, '');

  const handleStartFresh = (template: WorkoutTemplate) => {
    setActiveDraft(undefined);
    setSelectedTemplate(template);
  };

  const handleResumeDraft = () => {
    if (!draftTemplate || !draft) return;
    setActiveDraft(draft);
    setSelectedTemplate(draftTemplate);
  };

  const handleDiscardDraft = async () => {
    await clearDraft();
    setDraft(null);
    setDraftTemplate(null);
    setDismissedDraft(true);
  };

  const handleClose = () => {
    setSelectedTemplate(null);
    setActiveDraft(undefined);
    loadDraft().then(async (d) => {
      if (!d) { setDraft(null); setDraftTemplate(null); return; }
      setDraft(d);
      const tmpl = await db.workoutTemplates.get(d.templateId);
      if (tmpl) setDraftTemplate(tmpl);
    });
  };

  if (selectedTemplate) {
    return (
      <WorkoutSession
        template={selectedTemplate}
        draft={activeDraft}
        onClose={handleClose}
      />
    );
  }

  const getLastSession = (templateId: number) =>
    lastSessions?.find((s) => s.templateId === templateId);

  const showDraftBanner = draft && draftTemplate && !dismissedDraft;

  const draftAgeMinutes = draft
    ? Math.floor((Date.now() - new Date(draft.savedAt).getTime()) / 60000)
    : 0;
  const draftAgeStr =
    draftAgeMinutes < 1
      ? 'agora mesmo'
      : draftAgeMinutes < 60
      ? `${draftAgeMinutes}min atras`
      : `${Math.floor(draftAgeMinutes / 60)}h atras`;

  const draftCompletedSets = draft
    ? draft.exerciseLogs.reduce((acc, ex) => acc + ex.sets.filter((s) => s.completed).length, 0)
    : 0;
  const draftTotalSets = draft
    ? draft.exerciseLogs.reduce((acc, ex) => acc + ex.sets.length, 0)
    : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="relative overflow-hidden px-5 pt-safe-lg pb-6">
        <div className="absolute inset-0 gradient-bg-soft" />
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 relative">
            <div className="w-10 h-10 rounded-2xl gradient-bg flex items-center justify-center shadow-lg">
              <Dumbbell size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Treinos</h1>
              <p className="text-muted-foreground text-xs">Escolha o treino de hoje</p>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="px-5 pb-6 space-y-3">

        {/* Banner: Treino em andamento */}
        <AnimatePresence>
          {showDraftBanner && (
            <motion.div
              initial={{ opacity: 0, y: -12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            >
              <Card className="border-primary/40 overflow-hidden shadow-lg"
                style={{ background: 'linear-gradient(135deg, rgba(255,61,127,0.10) 0%, rgba(168,85,247,0.10) 100%)' }}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center font-bold text-white text-base shadow-md shrink-0">
                        {draftTemplate!.letter}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-sm">Treino em andamento</p>
                          <Badge variant="default" className="text-[10px] px-2 py-0.5 animate-pulse">
                            Rascunho
                          </Badge>
                        </div>
                        <p className="text-muted-foreground text-xs truncate mt-0.5">
                          {stripPrefix(draftTemplate!.name)}
                        </p>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock size={10} />
                            {draftAgeStr}
                          </span>
                          <span className="flex items-center gap-1">
                            <Zap size={10} className="text-primary" />
                            {draftCompletedSets}/{draftTotalSets} series
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={handleDiscardDraft}
                      className="text-muted-foreground hover:text-foreground transition-colors p-1 shrink-0"
                      aria-label="Descartar rascunho"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-4">
                    <Button onClick={handleResumeDraft} className="h-10 text-sm">
                      <RotateCcw size={15} />
                      Retomar Treino
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleDiscardDraft}
                      className="h-10 text-sm text-muted-foreground"
                    >
                      <X size={15} />
                      Descartar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Lista de templates */}
        <AnimatePresence>
          {templates?.map((template, i) => {
            const last = getLastSession(template.id!);
            const isCurrentDraft = draft?.templateId === template.id && showDraftBanner;
            const hasCardio = template.exercises.some((e) => e.modalidade === 'cardio');
            const forcaGroups = [...new Set(
              template.exercises
                .filter((e) => e.modalidade !== 'cardio')
                .map((e) => e.muscleGroup)
            )];

            return (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07, duration: 0.3 }}
              >
                <button onClick={() => handleStartFresh(template)} className="w-full text-left">
                  <Card className={`border transition-all active:scale-[0.98] ${
                    isCurrentDraft
                      ? 'border-primary/40 bg-primary/5'
                      : 'glass border-border/30 hover:border-primary/30 hover:card-glow'
                  }`}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-2xl gradient-bg flex items-center justify-center font-bold text-white text-xl shadow-md shrink-0 relative">
                          {template.letter}
                          {isCurrentDraft && (
                            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-primary border-2 border-background animate-pulse" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-base truncate">
                              {stripPrefix(template.name)}
                            </p>
                            {isCurrentDraft && (
                              <Badge variant="default" className="text-[9px] px-1.5 py-0 shrink-0">
                                Em andamento
                              </Badge>
                            )}
                          </div>
                          {template.description && (
                            <p className="text-muted-foreground text-xs mt-0.5 truncate">
                              {template.description}
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-1.5">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Zap size={10} className="text-primary" />
                              <span className="font-medium text-foreground">{template.exercises.length}</span> exercícios
                            </span>
                            {last && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock size={10} />
                                {formatDate(new Date(last.date))}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="w-8 h-8 rounded-xl bg-muted/60 flex items-center justify-center shrink-0">
                          <ChevronRight size={16} className="text-muted-foreground" />
                        </div>
                      </div>

                      {(hasCardio || forcaGroups.length > 0) && (
                        <div className="flex gap-1.5 flex-wrap mt-3 pt-3 border-t border-border/20">
                          {hasCardio && (
                            <Badge variant="muted" className="text-[10px] px-2 py-0.5 text-orange-400 bg-orange-500/10">
                              🏃 Cardio
                            </Badge>
                          )}
                          {forcaGroups.map((g) => (
                            <Badge key={g} variant="muted" className="text-[10px] px-2 py-0.5">
                              {g}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
