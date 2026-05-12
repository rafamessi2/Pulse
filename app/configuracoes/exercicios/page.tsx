'use client';

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, Pencil, Check, X, Dumbbell, Info,
  ChevronDown, ChevronUp, History, Tag, Plus, Trash2,
  GripVertical, Minus, Timer,
} from 'lucide-react';
import Link from 'next/link';
import {
  db,
  renameExercise,
  renameWorkoutTemplate,
  addWorkoutTemplate,
  deleteWorkoutTemplate,
  addExerciseToTemplate,
  removeExerciseFromTemplate,
  updateExerciseSets,
  updateExerciseReps,
} from '@/lib/db';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toaster';

type EditKind = 'title' | 'exercise-name' | 'exercise-sets' | 'exercise-reps';
type Modalidade = 'forca' | 'cardio';

interface EditState {
  kind: EditKind;
  templateId: number;
  exerciseOrder?: number;
  value: string;
}

function extractSubtitle(fullName: string) {
  const idx = fullName.indexOf(' – ');
  return idx !== -1 ? fullName.slice(idx + 3) : fullName;
}

const LETTERS = 'ABCDEFGHIJ'.split('');
const MUSCLE_GROUPS = [
  'Peito', 'Costas', 'Ombros', 'Tríceps', 'Bíceps',
  'Quadríceps', 'Posterior', 'Glúteos', 'Panturrilha',
  'Abdômen', 'Lombar', 'Trapézio', 'Antebraco',
];

interface NewExerciseForm {
  modalidade: Modalidade;
  name: string;
  // forca
  muscleGroup: string;
  sets: string;
  reps: string;
  restSeconds: string;
  // cardio
  tipoCardio: string;
  tempoMinutos: string;
  ritmoEsforco: string;
}

const emptyExForm = (): NewExerciseForm => ({
  modalidade: 'forca',
  name: '',
  muscleGroup: 'Peito',
  sets: '3',
  reps: '12',
  restSeconds: '60',
  tipoCardio: '',
  tempoMinutos: '',
  ritmoEsforco: '',
});

export default function ExerciciosPage() {
  const { toast } = useToast();
  const templates = useLiveQuery(() => db.workoutTemplates.orderBy('letter').toArray());

  const [expandedTemplate, setExpandedTemplate] = useState<number | null>(null);
  const [editing, setEditing] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);

  const [showNewWorkout, setShowNewWorkout] = useState(false);
  const [newLetter, setNewLetter] = useState('');
  const [newSubtitle, setNewSubtitle] = useState('');
  const [creatingWorkout, setCreatingWorkout] = useState(false);

  const [deletingTemplateId, setDeletingTemplateId] = useState<number | null>(null);

  const [addingExerciseToTemplateId, setAddingExerciseToTemplateId] = useState<number | null>(null);
  const [newExForm, setNewExForm] = useState<NewExerciseForm>(emptyExForm());
  const [creatingEx, setCreatingEx] = useState(false);

  const [deletingExercise, setDeletingExercise] = useState<{ templateId: number; order: number; name: string } | null>(null);

  const confirmEdit = async () => {
    if (!editing || !editing.value.trim()) {
      toast({ title: 'Campo não pode ser vazio', variant: 'error' });
      return;
    }
    setSaving(true);
    try {
      switch (editing.kind) {
        case 'title':
          await renameWorkoutTemplate(editing.templateId, editing.value);
          toast({ title: '✅ Título atualizado!', description: 'Histórico preservado', variant: 'success' });
          break;
        case 'exercise-name':
          await renameExercise(editing.templateId, editing.exerciseOrder!, editing.value);
          toast({ title: '✅ Exercício renomeado!', description: 'Histórico preservado', variant: 'success' });
          break;
        case 'exercise-sets': {
          const n = parseInt(editing.value);
          if (isNaN(n) || n < 1) { toast({ title: 'Mínimo 1 série', variant: 'error' }); return; }
          await updateExerciseSets(editing.templateId, editing.exerciseOrder!, n);
          toast({ title: '✅ Séries atualizadas!', variant: 'success' });
          break;
        }
        case 'exercise-reps':
          await updateExerciseReps(editing.templateId, editing.exerciseOrder!, editing.value);
          toast({ title: '✅ Repetições atualizadas!', variant: 'success' });
          break;
      }
      setEditing(null);
    } catch (err: any) {
      toast({ title: err?.message ?? 'Erro ao salvar', variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') confirmEdit();
    if (e.key === 'Escape') setEditing(null);
  };

  const handleCreateWorkout = async () => {
    if (!newLetter.trim() || !newSubtitle.trim()) {
      toast({ title: 'Preencha letra e título', variant: 'error' });
      return;
    }
    setCreatingWorkout(true);
    try {
      await addWorkoutTemplate(newLetter.toUpperCase(), newSubtitle);
      toast({ title: `✅ Treino ${newLetter.toUpperCase()} criado!`, variant: 'success' });
      setShowNewWorkout(false);
      setNewLetter('');
      setNewSubtitle('');
    } catch (err: any) {
      toast({ title: err?.message ?? 'Erro ao criar treino', variant: 'error' });
    } finally {
      setCreatingWorkout(false);
    }
  };

  const handleDeleteTemplate = async (id: number) => {
    try {
      await deleteWorkoutTemplate(id);
      toast({ title: '🗑️ Treino removido', description: 'Histórico preservado', variant: 'default' });
      setDeletingTemplateId(null);
      if (expandedTemplate === id) setExpandedTemplate(null);
    } catch {
      toast({ title: 'Erro ao remover treino', variant: 'error' });
    }
  };

  const handleAddExercise = async () => {
    if (!newExForm.name.trim()) { toast({ title: 'Nome é obrigatório', variant: 'error' }); return; }

    setCreatingEx(true);
    try {
      if (newExForm.modalidade === 'cardio') {
        await addExerciseToTemplate(addingExerciseToTemplateId!, {
          name: newExForm.name,
          muscleGroup: 'Cardio',
          sets: 1,
          reps: newExForm.tempoMinutos || '-',
          restSeconds: 0,
          modalidade: 'cardio',
          tipoCardio: newExForm.tipoCardio || undefined,
          tempoMinutos: newExForm.tempoMinutos || undefined,
          ritmoEsforco: newExForm.ritmoEsforco || undefined,
        });
      } else {
        const sets = parseInt(newExForm.sets);
        const rest = parseInt(newExForm.restSeconds);
        if (isNaN(sets) || sets < 1) { toast({ title: 'Mínimo 1 série', variant: 'error' }); setCreatingEx(false); return; }
        await addExerciseToTemplate(addingExerciseToTemplateId!, {
          name: newExForm.name,
          muscleGroup: newExForm.muscleGroup,
          sets,
          reps: newExForm.reps || '12',
          restSeconds: isNaN(rest) ? 60 : rest,
          modalidade: 'forca',
        });
      }
      toast({ title: '✅ Exercício adicionado!', variant: 'success' });
      setAddingExerciseToTemplateId(null);
      setNewExForm(emptyExForm());
    } catch (err: any) {
      toast({ title: err?.message ?? 'Erro ao adicionar exercício', variant: 'error' });
    } finally {
      setCreatingEx(false);
    }
  };

  const handleDeleteExercise = async () => {
    if (!deletingExercise) return;
    try {
      await removeExerciseFromTemplate(deletingExercise.templateId, deletingExercise.order);
      toast({ title: '🗑️ Exercício removido', description: 'Histórico preservado', variant: 'default' });
      setDeletingExercise(null);
    } catch {
      toast({ title: 'Erro ao remover exercício', variant: 'error' });
    }
  };

  const usedLetters = new Set(templates?.map((t) => t.letter) ?? []);
  const availableLetters = LETTERS.filter((l) => !usedLetters.has(l));

  return (
    <div className="min-h-screen bg-background">

      {/* Header */}
      <div className="relative overflow-hidden px-5 pt-safe-lg pb-6">
        <div className="absolute inset-0 gradient-bg-soft" />
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="relative">
          <div className="flex items-center gap-3">
            <Link href="/configuracoes">
              <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
                <ChevronLeft size={20} />
              </div>
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl gradient-bg flex items-center justify-center shadow-lg">
                <Dumbbell size={20} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Gerenciar Treinos</h1>
                <p className="text-muted-foreground text-xs">Rotina, exercícios e séries</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Banner Snapshot */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="mx-5 mb-4 rounded-2xl border border-blue-500/25 bg-blue-500/8 p-4"
      >
        <div className="flex gap-3">
          <Info size={15} className="text-blue-400 mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            <span className="text-blue-300 font-semibold">Histórico protegido por Snapshot. </span>
            Adicionar, remover ou editar treinos e exercícios afeta apenas os treinos futuros.
            Sessões já finalizadas mantêm os dados originais.
          </p>
        </div>
      </motion.div>

      <div className="px-5 pb-8 space-y-3">

        {/* Seção: Rotina */}
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Rotina de Treinos ({templates?.length ?? 0} dias)
          </p>
          {availableLetters.length > 0 && (
            <button
              onClick={() => { setShowNewWorkout(true); setNewLetter(availableLetters[0]); }}
              className="flex items-center gap-1.5 text-xs text-primary font-semibold hover:opacity-80 transition-opacity"
            >
              <Plus size={14} />
              Novo treino
            </button>
          )}
        </div>

        {/* Lista de templates */}
        <AnimatePresence mode="popLayout">
          {templates?.map((template, tIdx) => {
            const isExpanded = expandedTemplate === template.id;
            const subtitle = extractSubtitle(template.name);
            const isEditingTitle = editing?.kind === 'title' && editing.templateId === template.id;
            const isAddingEx = addingExerciseToTemplateId === template.id;

            return (
              <motion.div
                key={template.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.18 } }}
                transition={{ delay: tIdx * 0.05, duration: 0.25 }}
              >
                <Card className={`border transition-all ${isExpanded ? 'border-primary/30 card-glow' : 'glass border-border/30'}`}>

                  {/* Cabeçalho do treino */}
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl gradient-bg flex items-center justify-center font-bold text-white text-lg shadow-md shrink-0">
                        {template.letter}
                      </div>

                      <div className="flex-1 min-w-0">
                        {isEditingTitle ? (
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                                Treino {template.letter} –
                              </span>
                              <Input
                                autoFocus value={editing!.value}
                                onChange={(e) => setEditing((p) => p ? { ...p, value: e.target.value } : p)}
                                onKeyDown={handleKey}
                                className="h-9 text-sm font-semibold flex-1" maxLength={40}
                                placeholder="Ex: Peito & Tríceps"
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" onClick={confirmEdit} disabled={saving || !editing!.value.trim()} className="flex-1 h-8 text-xs">
                                <Check size={13} />{saving ? 'Salvando…' : 'Confirmar'}
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setEditing(null)} className="flex-1 h-8 text-xs">
                                <X size={13} />Cancelar
                              </Button>
                            </div>
                          </motion.div>
                        ) : (
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="font-bold text-sm truncate">{subtitle}</p>
                              <button
                                onClick={() => setEditing({ kind: 'title', templateId: template.id!, value: subtitle })}
                                className="w-6 h-6 rounded-md hover:bg-primary/15 hover:text-primary flex items-center justify-center transition-colors shrink-0 active:scale-90"
                              >
                                <Pencil size={11} />
                              </button>
                            </div>
                            <p className="text-muted-foreground text-xs">{template.exercises.length} exercícios</p>
                          </div>
                        )}
                      </div>

                      {!isEditingTitle && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => setDeletingTemplateId(template.id!)}
                            className="w-8 h-8 rounded-lg hover:bg-red-500/15 hover:text-red-400 flex items-center justify-center transition-colors active:scale-90"
                          >
                            <Trash2 size={14} />
                          </button>
                          <button
                            onClick={() => setExpandedTemplate(isExpanded ? null : template.id!)}
                            className="flex items-center gap-1 text-muted-foreground text-xs py-1 px-2 rounded-lg hover:bg-muted/40 transition-colors"
                          >
                            <Tag size={12} />
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                        </div>
                      )}
                    </div>
                  </CardContent>

                  {/* Lista de exercícios */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22 }}
                        className="overflow-hidden"
                      >
                        <div className="border-t border-border/30 px-4 pb-4 pt-3 space-y-2">

                          <div className="grid grid-cols-[20px_1fr_52px_52px_36px] gap-1.5 px-2 mb-1">
                            <span />
                            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Exercício</span>
                            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-center">Séries</span>
                            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-center">Reps</span>
                            <span />
                          </div>

                          <AnimatePresence mode="popLayout">
                            {template.exercises.map((ex, exIdx) => {
                              const isCardioEx = ex.modalidade === 'cardio';
                              const isEditingName = editing?.kind === 'exercise-name' && editing.templateId === template.id && editing.exerciseOrder === ex.order;
                              const isEditingSets = editing?.kind === 'exercise-sets' && editing.templateId === template.id && editing.exerciseOrder === ex.order;
                              const isEditingReps = editing?.kind === 'exercise-reps' && editing.templateId === template.id && editing.exerciseOrder === ex.order;
                              const anyEditingThis = isEditingName || isEditingSets || isEditingReps;

                              return (
                                <motion.div
                                  key={ex.order}
                                  layout
                                  initial={{ opacity: 0, x: -8 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  exit={{ opacity: 0, x: 8, transition: { duration: 0.15 } }}
                                  transition={{ delay: exIdx * 0.03 }}
                                  className={`rounded-xl border transition-all ${anyEditingThis ? 'border-primary/40 bg-primary/5' : 'border-border/20 bg-muted/20'}`}
                                >
                                  {isEditingName ? (
                                    <div className="p-3 space-y-2">
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-xs font-bold text-primary w-5 text-center shrink-0">{ex.order}</span>
                                        <Input autoFocus value={editing!.value}
                                          onChange={(e) => setEditing((p) => p ? { ...p, value: e.target.value } : p)}
                                          onKeyDown={handleKey} className="h-9 text-sm font-semibold flex-1" maxLength={60} />
                                      </div>
                                      <div className="flex gap-2 pl-6">
                                        <Button size="sm" onClick={confirmEdit} disabled={saving} className="flex-1 h-8 text-xs">
                                          <Check size={13} />{saving ? '…' : 'OK'}
                                        </Button>
                                        <Button size="sm" variant="ghost" onClick={() => setEditing(null)} className="flex-1 h-8 text-xs">
                                          <X size={13} />Cancel
                                        </Button>
                                      </div>
                                      <p className="pl-6 text-[10px] text-muted-foreground flex items-center gap-1">
                                        <History size={10} className="text-blue-400" />
                                        Histórico mantém o nome original
                                      </p>
                                    </div>
                                  ) : isCardioEx ? (
                                    /* Cardio exercise row */
                                    <div className="flex items-center gap-2 px-2 py-2">
                                      <span className="text-[10px] font-bold text-muted-foreground text-center w-5 shrink-0">{ex.order}</span>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1">
                                          <Timer size={10} className="text-orange-400 shrink-0" />
                                          <p className="text-sm font-medium truncate">{ex.name}</p>
                                          <button
                                            onClick={() => setEditing({ kind: 'exercise-name', templateId: template.id!, exerciseOrder: ex.order, value: ex.name })}
                                            className="w-5 h-5 rounded flex items-center justify-center hover:text-primary transition-colors shrink-0 active:scale-90"
                                          >
                                            <Pencil size={10} />
                                          </button>
                                        </div>
                                        <div className="flex flex-wrap gap-1 mt-0.5">
                                          {ex.tipoCardio && <Badge variant="muted" className="text-[9px] px-1.5 py-0">{ex.tipoCardio}</Badge>}
                                          {ex.tempoMinutos && <Badge variant="muted" className="text-[9px] px-1.5 py-0">{ex.tempoMinutos} min</Badge>}
                                          {ex.ritmoEsforco && <Badge variant="muted" className="text-[9px] px-1.5 py-0">{ex.ritmoEsforco}</Badge>}
                                        </div>
                                      </div>
                                      <button
                                        onClick={() => setDeletingExercise({ templateId: template.id!, order: ex.order, name: ex.name })}
                                        className="w-8 h-8 rounded-lg hover:bg-red-500/15 hover:text-red-400 flex items-center justify-center transition-colors active:scale-90"
                                      >
                                        <Trash2 size={13} />
                                      </button>
                                    </div>
                                  ) : (
                                    /* Forca exercise row */
                                    <div className="grid grid-cols-[20px_1fr_52px_52px_36px] gap-1.5 items-center px-2 py-2">
                                      <span className="text-[10px] font-bold text-muted-foreground text-center">{ex.order}</span>

                                      <div className="min-w-0">
                                        <div className="flex items-center gap-1">
                                          <p className="text-sm font-medium truncate">{ex.name}</p>
                                          <button
                                            onClick={() => setEditing({ kind: 'exercise-name', templateId: template.id!, exerciseOrder: ex.order, value: ex.name })}
                                            className="w-5 h-5 rounded flex items-center justify-center hover:text-primary transition-colors shrink-0 active:scale-90"
                                          >
                                            <Pencil size={10} />
                                          </button>
                                        </div>
                                        <Badge variant="muted" className="text-[9px] px-1.5 py-0 mt-0.5">{ex.muscleGroup}</Badge>
                                      </div>

                                      <div className="flex flex-col items-center gap-0.5">
                                        {isEditingSets ? (
                                          <Input autoFocus value={editing!.value}
                                            onChange={(e) => setEditing((p) => p ? { ...p, value: e.target.value } : p)}
                                            onKeyDown={handleKey} onBlur={confirmEdit}
                                            className="h-8 w-12 text-center text-sm font-bold px-1" type="number" min={1} max={20} />
                                        ) : (
                                          <button
                                            onClick={() => setEditing({ kind: 'exercise-sets', templateId: template.id!, exerciseOrder: ex.order, value: String(ex.sets) })}
                                            className="h-8 w-12 rounded-lg bg-muted/60 hover:bg-primary/15 hover:text-primary text-sm font-bold transition-colors flex items-center justify-center gap-0.5 group"
                                          >
                                            {ex.sets}
                                            <Pencil size={8} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                          </button>
                                        )}
                                        <span className="text-[9px] text-muted-foreground">séries</span>
                                      </div>

                                      <div className="flex flex-col items-center gap-0.5">
                                        {isEditingReps ? (
                                          <Input autoFocus value={editing!.value}
                                            onChange={(e) => setEditing((p) => p ? { ...p, value: e.target.value } : p)}
                                            onKeyDown={handleKey} onBlur={confirmEdit}
                                            className="h-8 w-12 text-center text-sm font-bold px-1" />
                                        ) : (
                                          <button
                                            onClick={() => setEditing({ kind: 'exercise-reps', templateId: template.id!, exerciseOrder: ex.order, value: ex.reps })}
                                            className="h-8 w-12 rounded-lg bg-muted/60 hover:bg-primary/15 hover:text-primary text-sm font-bold transition-colors flex items-center justify-center gap-0.5 group"
                                          >
                                            {ex.reps}
                                            <Pencil size={8} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                          </button>
                                        )}
                                        <span className="text-[9px] text-muted-foreground">reps</span>
                                      </div>

                                      <button
                                        onClick={() => setDeletingExercise({ templateId: template.id!, order: ex.order, name: ex.name })}
                                        className="w-8 h-8 rounded-lg hover:bg-red-500/15 hover:text-red-400 flex items-center justify-center transition-colors active:scale-90 mx-auto"
                                      >
                                        <Trash2 size={13} />
                                      </button>
                                    </div>
                                  )}
                                </motion.div>
                              );
                            })}
                          </AnimatePresence>

                          {/* Formulário de novo exercício */}
                          <AnimatePresence>
                            {isAddingEx ? (
                              <motion.div
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 4 }}
                                className="rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-3 mt-1"
                              >
                                <p className="text-xs font-semibold text-primary flex items-center gap-1.5">
                                  <Plus size={12} /> Novo exercício
                                </p>

                                {/* Toggle Modalidade */}
                                <div className="flex rounded-xl overflow-hidden border border-border/40 bg-muted/30 p-0.5 gap-0.5">
                                  <button
                                    onClick={() => setNewExForm((f) => ({ ...f, modalidade: 'forca' }))}
                                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${newExForm.modalidade === 'forca' ? 'gradient-bg text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                                  >
                                    <span>🏋️‍♂️</span> Musculação
                                  </button>
                                  <button
                                    onClick={() => setNewExForm((f) => ({ ...f, modalidade: 'cardio' }))}
                                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${newExForm.modalidade === 'cardio' ? 'bg-orange-500 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                                  >
                                    <span>🏃‍♂️</span> Cardio
                                  </button>
                                </div>

                                {/* Nome (sempre visível) */}
                                <Input
                                  autoFocus
                                  placeholder={newExForm.modalidade === 'cardio' ? 'Nome (ex: Corrida na Rua, Esteira)' : 'Nome do exercício'}
                                  value={newExForm.name}
                                  onChange={(e) => setNewExForm((f) => ({ ...f, name: e.target.value }))}
                                  className="h-10 text-sm"
                                />

                                {newExForm.modalidade === 'forca' ? (
                                  <>
                                    {/* Grupo Muscular */}
                                    <div>
                                      <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1.5">Grupo Muscular</label>
                                      <div className="flex flex-wrap gap-1.5">
                                        {MUSCLE_GROUPS.map((g) => (
                                          <button
                                            key={g}
                                            onClick={() => setNewExForm((f) => ({ ...f, muscleGroup: g }))}
                                            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${newExForm.muscleGroup === g ? 'gradient-bg text-white' : 'bg-muted text-muted-foreground hover:text-foreground'}`}
                                          >
                                            {g}
                                          </button>
                                        ))}
                                      </div>
                                    </div>

                                    {/* Séries / Reps / Descanso */}
                                    <div className="grid grid-cols-3 gap-2">
                                      {[
                                        { label: 'Séries', key: 'sets', type: 'number', ph: '3' },
                                        { label: 'Reps', key: 'reps', type: 'text', ph: '12' },
                                        { label: 'Descanso (s)', key: 'restSeconds', type: 'number', ph: '60' },
                                      ].map(({ label, key, type, ph }) => (
                                        <div key={key}>
                                          <label className="text-[10px] text-muted-foreground block mb-1">{label}</label>
                                          <Input
                                            type={type} placeholder={ph}
                                            value={(newExForm as any)[key]}
                                            onChange={(e) => setNewExForm((f) => ({ ...f, [key]: e.target.value }))}
                                            className="h-9 text-center text-sm font-semibold"
                                          />
                                        </div>
                                      ))}
                                    </div>
                                  </>
                                ) : (
                                  /* Campos Cardio */
                                  <div className="space-y-2">
                                    <div>
                                      <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">Tipo de Treino</label>
                                      <Input
                                        placeholder="ex: Zona 2 regenerativa, Intervalado"
                                        value={newExForm.tipoCardio}
                                        onChange={(e) => setNewExForm((f) => ({ ...f, tipoCardio: e.target.value }))}
                                        className="h-9 text-sm"
                                      />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                      <div>
                                        <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">Tempo/Duração</label>
                                        <Input
                                          placeholder="ex: 30-40 min"
                                          value={newExForm.tempoMinutos}
                                          onChange={(e) => setNewExForm((f) => ({ ...f, tempoMinutos: e.target.value }))}
                                          className="h-9 text-sm"
                                        />
                                      </div>
                                      <div>
                                        <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">Ritmo/Esforço</label>
                                        <Input
                                          placeholder="ex: Pace 6:00, Leve"
                                          value={newExForm.ritmoEsforco}
                                          onChange={(e) => setNewExForm((f) => ({ ...f, ritmoEsforco: e.target.value }))}
                                          className="h-9 text-sm"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                )}

                                <div className="flex gap-2">
                                  <Button onClick={handleAddExercise} disabled={creatingEx || !newExForm.name.trim()} className="flex-1 h-9 text-sm">
                                    <Plus size={14} />{creatingEx ? 'Adicionando…' : 'Adicionar'}
                                  </Button>
                                  <Button variant="ghost" onClick={() => { setAddingExerciseToTemplateId(null); setNewExForm(emptyExForm()); }} className="flex-1 h-9 text-sm">
                                    Cancelar
                                  </Button>
                                </div>
                              </motion.div>
                            ) : (
                              <motion.button
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                onClick={() => { setAddingExerciseToTemplateId(template.id!); setNewExForm(emptyExForm()); }}
                                className="w-full mt-1 py-2.5 rounded-xl border border-dashed border-primary/30 hover:border-primary/60 text-primary text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                              >
                                <Plus size={13} /> Adicionar exercício
                              </motion.button>
                            )}
                          </AnimatePresence>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Botão Novo Treino */}
        <AnimatePresence>
          {showNewWorkout ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            >
              <Card className="border-primary/30 gradient-bg-soft">
                <CardContent className="p-4 space-y-4">
                  <p className="font-semibold text-sm flex items-center gap-2">
                    <Plus size={15} className="text-primary" /> Novo Treino
                  </p>

                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-2">Letra do Treino</label>
                    <div className="flex gap-2 flex-wrap">
                      {availableLetters.map((l) => (
                        <button key={l}
                          onClick={() => setNewLetter(l)}
                          className={`w-10 h-10 rounded-xl text-base font-bold transition-all active:scale-90 ${newLetter === l ? 'gradient-bg text-white shadow-md' : 'bg-muted text-muted-foreground hover:bg-muted/60'}`}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-2">
                      Título  <span className="normal-case text-muted-foreground/60">(ex: Peito &amp; Tríceps)</span>
                    </label>
                    <Input
                      placeholder="Nome do grupo muscular"
                      value={newSubtitle}
                      onChange={(e) => setNewSubtitle(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleCreateWorkout(); }}
                      className="h-11 text-sm"
                      maxLength={40}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={handleCreateWorkout} disabled={creatingWorkout || !newLetter || !newSubtitle.trim()} className="flex-1 h-10">
                      <Plus size={15} />{creatingWorkout ? 'Criando…' : 'Criar Treino'}
                    </Button>
                    <Button variant="ghost" onClick={() => { setShowNewWorkout(false); setNewLetter(''); setNewSubtitle(''); }} className="flex-1 h-10">
                      Cancelar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            availableLetters.length > 0 && (
              <motion.button
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                onClick={() => { setShowNewWorkout(true); setNewLetter(availableLetters[0]); }}
                className="w-full py-3.5 rounded-2xl border border-dashed border-primary/30 hover:border-primary/60 text-primary text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <Plus size={16} /> Adicionar novo dia de treino
              </motion.button>
            )
          )}
        </AnimatePresence>
      </div>

      {/* Modal: Confirmar remoção de TREINO */}
      <AnimatePresence>
        {deletingTemplateId !== null && (() => {
          const t = templates?.find((x) => x.id === deletingTemplateId);
          return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-5"
              onClick={() => setDeletingTemplateId(null)}
            >
              <motion.div initial={{ scale: 0.92 }} animate={{ scale: 1 }} exit={{ scale: 0.92 }}
                className="w-full max-w-sm bg-card rounded-2xl p-6 border border-red-500/20"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex flex-col items-center gap-3 mb-5 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-red-500/15 flex items-center justify-center">
                    <Trash2 size={22} className="text-red-400" />
                  </div>
                  <h2 className="text-lg font-bold">Remover Treino {t?.letter}?</h2>
                  <p className="text-muted-foreground text-sm">
                    <strong>"{extractSubtitle(t?.name ?? '')}"</strong> será removido da sua rotina.
                    O histórico de sessões passadas é preservado.
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <Button variant="destructive" onClick={() => handleDeleteTemplate(deletingTemplateId)} className="w-full h-11">
                    Sim, remover treino
                  </Button>
                  <Button variant="ghost" onClick={() => setDeletingTemplateId(null)} className="w-full h-11">
                    Cancelar
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* Modal: Confirmar remoção de EXERCÍCIO */}
      <AnimatePresence>
        {deletingExercise && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-5"
            onClick={() => setDeletingExercise(null)}
          >
            <motion.div initial={{ scale: 0.92 }} animate={{ scale: 1 }} exit={{ scale: 0.92 }}
              className="w-full max-w-sm bg-card rounded-2xl p-6 border border-red-500/20"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col items-center gap-3 mb-5 text-center">
                <div className="w-12 h-12 rounded-2xl bg-red-500/15 flex items-center justify-center">
                  <Minus size={22} className="text-red-400" />
                </div>
                <h2 className="text-lg font-bold">Remover exercício?</h2>
                <p className="text-muted-foreground text-sm">
                  <strong>"{deletingExercise.name}"</strong> será removido do treino.
                  O histórico de sessões passadas é preservado.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Button variant="destructive" onClick={handleDeleteExercise} className="w-full h-11">
                  Sim, remover exercício
                </Button>
                <Button variant="ghost" onClick={() => setDeletingExercise(null)} className="w-full h-11">
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
