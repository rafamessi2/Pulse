'use client';

import { useState, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings, Download, Upload, Trash2, Info, ChevronRight,
  Heart, Shield, Database, User, Dumbbell, Users, Copy,
  ClipboardPaste, Check, X, AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';
import {
  db, exportAllData, importAllData, clearAllData,
  exportRoutine, importRoutine,
} from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/toaster';

export default function ConfiguracoesPage() {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [userName, setUserName] = useState('');
  const [editingName, setEditingName] = useState(false);

  // Modo Treinador
  const [coachCopied, setCoachCopied] = useState(false);
  const [showImportRoutine, setShowImportRoutine] = useState(false);
  const [importCode, setImportCode] = useState('');
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [importingRoutine, setImportingRoutine] = useState(false);

  const settings = useLiveQuery(() => db.settings.toCollection().first());
  const workoutCount = useLiveQuery(() => db.workoutSessions.count());
  const cardioCount = useLiveQuery(() => db.cardioSessions.count());
  const templateCount = useLiveQuery(() => db.workoutTemplates.count());

  // ── Backup completo ──────────────────────────────────────────────────────────
  const handleExport = async () => {
    try {
      const data = await exportAllData();
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pulse-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: 'Backup exportado!', description: 'Arquivo salvo com sucesso', variant: 'success' });
    } catch {
      toast({ title: 'Erro ao exportar', variant: 'error' });
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await importAllData(data);
      toast({ title: 'Backup importado!', description: 'Dados restaurados com sucesso', variant: 'success' });
    } catch {
      toast({ title: 'Erro ao importar', description: 'Arquivo invalido', variant: 'error' });
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleClear = async () => {
    try {
      await clearAllData();
      setShowClearConfirm(false);
      toast({ title: 'Dados apagados', description: 'Templates padrao restaurados', variant: 'default' });
    } catch {
      toast({ title: 'Erro ao limpar dados', variant: 'error' });
    }
  };

  const handleSaveName = async () => {
    if (!settings?.id) return;
    await db.settings.update(settings.id, { userName, updatedAt: new Date() });
    setEditingName(false);
    toast({ title: 'Nome atualizado!', variant: 'success' });
  };

  // ── Modo Treinador ───────────────────────────────────────────────────────────
  const handleExportRoutine = async () => {
    try {
      const code = await exportRoutine();
      await navigator.clipboard.writeText(code);
      setCoachCopied(true);
      setTimeout(() => setCoachCopied(false), 3000);
      toast({ title: 'Rotina copiada!', description: 'Cole no WhatsApp ou email do seu aluno', variant: 'success' });
    } catch {
      toast({ title: 'Erro ao exportar rotina', variant: 'error' });
    }
  };

  const handleImportRoutineConfirm = async () => {
    if (!importCode.trim()) return;
    setImportingRoutine(true);
    try {
      await importRoutine(importCode);
      toast({ title: 'Rotina importada!', description: 'Seu historico foi preservado', variant: 'success' });
      setShowImportRoutine(false);
      setShowImportConfirm(false);
      setImportCode('');
    } catch (err: any) {
      toast({ title: 'Erro ao importar', description: err?.message ?? 'Codigo invalido', variant: 'error' });
    } finally {
      setImportingRoutine(false);
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
              <Settings size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Configuracoes</h1>
              <p className="text-muted-foreground text-xs">Personalizacao e dados</p>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="px-5 space-y-5 pb-6">

        {/* Perfil */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Perfil</p>
          <Card className="glass border-border/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl gradient-bg flex items-center justify-center">
                  <User size={22} className="text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{settings?.userName ?? 'Usuaria'}</p>
                  <p className="text-muted-foreground text-xs">Treinos • App Pulse</p>
                </div>
                <button
                  onClick={() => { setUserName(settings?.userName ?? ''); setEditingName(!editingName); }}
                  className="text-primary text-sm font-medium"
                >
                  Editar
                </button>
              </div>
              {editingName && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  className="space-y-2"
                >
                  <Input
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="Seu nome"
                    className="h-11"
                  />
                  <div className="flex gap-2">
                    <Button onClick={handleSaveName} className="flex-1" size="sm">Salvar</Button>
                    <Button variant="ghost" onClick={() => setEditingName(false)} className="flex-1" size="sm">Cancelar</Button>
                  </div>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Dados */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Dados Armazenados</p>
          <Card className="glass border-border/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <Database size={18} className="text-blue-400" />
                </div>
                <div>
                  <p className="font-semibold text-sm">IndexedDB Local</p>
                  <p className="text-muted-foreground text-xs">100% offline • seus dados ficam no celular</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Treinos', value: workoutCount ?? 0, emoji: '🏋' },
                  { label: 'Corridas', value: cardioCount ?? 0, emoji: '🏃' },
                ].map((stat) => (
                  <div key={stat.label} className="bg-muted/40 rounded-xl p-3 text-center">
                    <p className="text-2xl">{stat.emoji}</p>
                    <p className="font-bold text-lg gradient-text">{stat.value}</p>
                    <p className="text-muted-foreground text-xs">{stat.label}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Gerenciar Exercicios */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.13 }}>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Personalizacao</p>
          <Link href="/configuracoes/exercicios" className="block">
            <Card className="glass border-border/30 hover:border-primary/30 transition-all active:scale-[0.99]">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center shrink-0 shadow-md">
                  <Dumbbell size={18} className="text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm">Gerenciar Exercicios</p>
                  <p className="text-muted-foreground text-xs">Renomear exercicios dos treinos ABCDE</p>
                </div>
                <ChevronRight size={16} className="text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        </motion.div>

        {/* Modo Treinador */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Modo Treinador</p>
          <Card className="glass border-border/30">
            <CardContent className="p-4 space-y-4">

              {/* Info */}
              <div className="flex gap-2.5 rounded-xl bg-primary/8 border border-primary/20 p-3">
                <Users size={15} className="text-primary mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  <span className="text-primary font-semibold">Compartilhe sua rotina</span> com um aluno ou amigo.
                  O historico de atividades de cada pessoa nunca e afetado.
                </p>
              </div>

              {/* Exportar rotina */}
              <button onClick={handleExportRoutine} className="w-full">
                <div className={`flex items-center gap-3 p-3 rounded-xl border transition-all active:scale-[0.98] ${
                  coachCopied
                    ? 'border-emerald-500/40 bg-emerald-500/8'
                    : 'border-primary/25 bg-primary/5 hover:border-primary/50'
                }`}>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                    coachCopied ? 'bg-emerald-500/20' : 'gradient-bg'
                  }`}>
                    {coachCopied
                      ? <Check size={17} className="text-emerald-400" />
                      : <Copy size={17} className="text-white" />
                    }
                  </div>
                  <div className="flex-1 text-left">
                    <p className={`font-semibold text-sm ${coachCopied ? 'text-emerald-400' : ''}`}>
                      {coachCopied ? 'Codigo copiado!' : 'Exportar Rotina'}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {coachCopied
                        ? 'Cole no WhatsApp, email ou Notes'
                        : `${templateCount ?? 0} treinos • copia codigo para a area de transferencia`}
                    </p>
                  </div>
                </div>
              </button>

              {/* Importar rotina */}
              <div>
                {!showImportRoutine ? (
                  <button
                    onClick={() => setShowImportRoutine(true)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-border/30 hover:border-blue-500/30 bg-muted/20 transition-all active:scale-[0.98]"
                  >
                    <div className="w-9 h-9 rounded-xl bg-blue-500/20 flex items-center justify-center shrink-0">
                      <ClipboardPaste size={17} className="text-blue-400" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-semibold text-sm">Importar Rotina</p>
                      <p className="text-muted-foreground text-xs">Cole o codigo recebido do treinador</p>
                    </div>
                  </button>
                ) : (
                  <AnimatePresence>
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-blue-400 flex items-center gap-1.5">
                          <ClipboardPaste size={12} />
                          Cole o codigo da rotina
                        </p>
                        <button
                          onClick={() => { setShowImportRoutine(false); setImportCode(''); setShowImportConfirm(false); }}
                          className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-muted/40 text-muted-foreground"
                        >
                          <X size={14} />
                        </button>
                      </div>

                      <textarea
                        value={importCode}
                        onChange={(e) => { setImportCode(e.target.value); setShowImportConfirm(false); }}
                        placeholder="Cole aqui o codigo Base64 recebido..."
                        className="w-full h-24 rounded-xl bg-muted/30 border border-border/40 px-3 py-2.5 text-xs font-mono text-muted-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-blue-500/50 resize-none"
                      />

                      {!showImportConfirm ? (
                        <Button
                          onClick={() => setShowImportConfirm(true)}
                          disabled={!importCode.trim()}
                          className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          <ClipboardPaste size={15} />
                          Verificar e Importar
                        </Button>
                      ) : (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.97 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="rounded-xl border border-orange-500/30 bg-orange-500/8 p-3 space-y-3"
                        >
                          <div className="flex gap-2 items-start">
                            <AlertTriangle size={15} className="text-orange-400 mt-0.5 shrink-0" />
                            <p className="text-xs text-muted-foreground">
                              <span className="text-orange-400 font-semibold">Atencao: </span>
                              seus treinos atuais ({templateCount ?? 0} dias) serao substituidos.
                              Seu historico de atividades sera preservado.
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={handleImportRoutineConfirm}
                              disabled={importingRoutine}
                              className="flex-1 h-9 text-xs bg-orange-600 hover:bg-orange-700"
                            >
                              {importingRoutine ? 'Importando...' : 'Confirmar'}
                            </Button>
                            <Button
                              variant="ghost"
                              onClick={() => setShowImportConfirm(false)}
                              className="flex-1 h-9 text-xs"
                            >
                              Cancelar
                            </Button>
                          </div>
                        </motion.div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Backup */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.19 }}>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Backup & Restauracao</p>
          <div className="space-y-2">
            <button onClick={handleExport} className="w-full">
              <Card className="glass border-border/30 hover:border-emerald-500/30 transition-all active:scale-[0.99]">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                    <Download size={18} className="text-emerald-400" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-semibold text-sm">Exportar Backup Completo</p>
                    <p className="text-muted-foreground text-xs">Salva todos os dados em JSON</p>
                  </div>
                  <ChevronRight size={16} className="text-muted-foreground" />
                </CardContent>
              </Card>
            </button>

            <button onClick={() => fileRef.current?.click()} className="w-full">
              <Card className="glass border-border/30 hover:border-blue-500/30 transition-all active:scale-[0.99]">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center shrink-0">
                    <Upload size={18} className="text-blue-400" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-semibold text-sm">Importar Backup Completo</p>
                    <p className="text-muted-foreground text-xs">Restaura dados de um arquivo JSON</p>
                  </div>
                  <ChevronRight size={16} className="text-muted-foreground" />
                </CardContent>
              </Card>
            </button>

            <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
          </div>
        </motion.div>

        {/* Zona de Perigo */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Zona de Perigo</p>

          {!showClearConfirm ? (
            <button onClick={() => setShowClearConfirm(true)} className="w-full">
              <Card className="glass border-red-500/20 hover:border-red-500/40 transition-all active:scale-[0.99]">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center shrink-0">
                    <Trash2 size={18} className="text-red-400" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-semibold text-sm text-red-400">Limpar Todos os Dados</p>
                    <p className="text-muted-foreground text-xs">Remove historico e restaura templates padrao</p>
                  </div>
                  <ChevronRight size={16} className="text-muted-foreground" />
                </CardContent>
              </Card>
            </button>
          ) : (
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}>
              <Card className="border-red-500/40 bg-red-500/5">
                <CardContent className="p-4 space-y-3">
                  <p className="font-bold text-center text-red-400">Tem certeza?</p>
                  <p className="text-muted-foreground text-sm text-center">
                    Isso vai apagar <strong>TODOS</strong> os seus treinos e corridas. Faca um backup antes!
                  </p>
                  <div className="flex gap-2">
                    <Button variant="destructive" onClick={handleClear} className="flex-1">
                      Sim, apagar tudo
                    </Button>
                    <Button variant="ghost" onClick={() => setShowClearConfirm(false)} className="flex-1">
                      Cancelar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </motion.div>

        {/* About */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.26 }}>
          <Card className="glass border-border/30">
            <CardContent className="p-5 text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl gradient-bg flex items-center justify-center mx-auto shadow-lg">
                <svg width="30" height="30" viewBox="0 0 44 44" fill="none">
                  <path d="M4 22 L12 10 L20 28 L28 16 L36 22 L40 18" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-lg gradient-text">Pulse</h3>
                <p className="text-muted-foreground text-sm">Seu companheiro de treino</p>
              </div>
              <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <span>Versao 1.0.0</span>
                <span>•</span>
                <span>Feito com</span>
                <Heart size={12} className="text-primary fill-primary" />
              </div>
              <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground pt-1">
                <Shield size={12} className="text-emerald-400" />
                <span>100% privado • sem conta • sem servidor</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
