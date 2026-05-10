'use client';

import { useState, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion } from 'framer-motion';
import {
  Settings, Download, Upload, Trash2, Info, ChevronRight,
  Heart, Shield, Database, User, Dumbbell
} from 'lucide-react';
import Link from 'next/link';
import { db, exportAllData, importAllData, clearAllData } from '@/lib/db';
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

  const settings = useLiveQuery(() => db.settings.toCollection().first());
  const workoutCount = useLiveQuery(() => db.workoutSessions.count());
  const cardioCount = useLiveQuery(() => db.cardioSessions.count());

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
      toast({ title: '✅ Backup exportado!', description: 'Arquivo salvo com sucesso', variant: 'success' });
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
      toast({ title: '✅ Backup importado!', description: 'Dados restaurados com sucesso', variant: 'success' });
    } catch {
      toast({ title: 'Erro ao importar', description: 'Arquivo inválido', variant: 'error' });
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleClear = async () => {
    try {
      await clearAllData();
      setShowClearConfirm(false);
      toast({ title: '🗑️ Dados apagados', description: 'Templates padrão restaurados', variant: 'default' });
    } catch {
      toast({ title: 'Erro ao limpar dados', variant: 'error' });
    }
  };

  const handleSaveName = async () => {
    if (!settings?.id) return;
    await db.settings.update(settings.id, { userName, updatedAt: new Date() });
    setEditingName(false);
    toast({ title: '✅ Nome atualizado!', variant: 'success' });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="relative overflow-hidden px-5 pt-14 pb-6">
        <div className="absolute inset-0 gradient-bg-soft" />
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="relative">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl gradient-bg flex items-center justify-center shadow-lg">
              <Settings size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Configurações</h1>
              <p className="text-muted-foreground text-xs">Personalização e dados</p>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="px-5 space-y-5 pb-6">
        {/* Profile */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Perfil</p>
          <Card className="glass border-border/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl gradient-bg flex items-center justify-center">
                  <User size={22} className="text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{settings?.userName ?? 'Usuária'}</p>
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

        {/* Database stats */}
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
                  { label: 'Treinos', value: workoutCount ?? 0, emoji: '🏋️' },
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

        {/* Gerenciar Exercícios */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.13 }}>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Personalização</p>
          <Link href="/configuracoes/exercicios" className="block">
            <Card className="glass border-border/30 hover:border-primary/30 transition-all active:scale-[0.99]">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center shrink-0 shadow-md">
                  <Dumbbell size={18} className="text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm">Gerenciar Exercícios</p>
                  <p className="text-muted-foreground text-xs">Renomear exercícios dos treinos ABCDE</p>
                </div>
                <ChevronRight size={16} className="text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        </motion.div>

        {/* Backup */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Backup & Restauração</p>
          <div className="space-y-2">
            <button onClick={handleExport} className="w-full">
              <Card className="glass border-border/30 hover:border-emerald-500/30 transition-all active:scale-[0.99]">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                    <Download size={18} className="text-emerald-400" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-semibold text-sm">Exportar Backup</p>
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
                    <p className="font-semibold text-sm">Importar Backup</p>
                    <p className="text-muted-foreground text-xs">Restaura dados de um arquivo JSON</p>
                  </div>
                  <ChevronRight size={16} className="text-muted-foreground" />
                </CardContent>
              </Card>
            </button>

            <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
          </div>
        </motion.div>

        {/* Danger zone */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
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
                    <p className="text-muted-foreground text-xs">Remove histórico e restaura templates padrão</p>
                  </div>
                  <ChevronRight size={16} className="text-muted-foreground" />
                </CardContent>
              </Card>
            </button>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <Card className="border-red-500/40 bg-red-500/5">
                <CardContent className="p-4 space-y-3">
                  <p className="font-bold text-center text-red-400">⚠️ Tem certeza?</p>
                  <p className="text-muted-foreground text-sm text-center">
                    Isso vai apagar <strong>TODOS</strong> os seus treinos e corridas. Faça um backup antes!
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
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
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
                <span>Versão 1.0.0</span>
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
