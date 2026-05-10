'use client';

import { useEffect, useRef, useCallback } from 'react';
import { saveDraft, clearDraft } from '@/lib/db';
import type { ExerciseLog, WorkoutDraft } from '@/types';

const DEBOUNCE_MS = 800; // salva no máximo uma vez a cada 800ms

interface SavePayload {
  templateId: number;
  templateLetter: string;
  templateName: string;
  startTime: Date;
  elapsedSeconds: number;
  exerciseLogs: ExerciseLog[];
}

/**
 * Hook que gerencia o auto-save do rascunho de treino no Dexie.
 *
 * - `triggerSave(payload)` — agenda um save debounced. Chame a cada mudança de estado.
 * - `discardDraft()` — limpa o rascunho do banco (finalizar ou cancelar).
 *
 * O save é também disparado no evento `visibilitychange` (aba em background / troca de app)
 * e `beforeunload` (fecha/recarrega), garantindo que o estado mais recente seja persistido
 * antes de qualquer interrupção.
 */
export function useWorkoutDraft() {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Guarda o payload mais recente para os flush imediatos (beforeunload / visibilitychange)
  const latestPayload = useRef<SavePayload | null>(null);

  const flushSave = useCallback(async () => {
    const p = latestPayload.current;
    if (!p) return;
    await saveDraft({
      templateId: p.templateId,
      templateLetter: p.templateLetter,
      templateName: p.templateName,
      startTime: p.startTime.toISOString(),
      elapsedSeconds: p.elapsedSeconds,
      exerciseLogs: p.exerciseLogs,
      savedAt: new Date().toISOString(),
    });
  }, []);

  const triggerSave = useCallback(
    (payload: SavePayload) => {
      latestPayload.current = payload;

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        flushSave();
      }, DEBOUNCE_MS);
    },
    [flushSave]
  );

  const discardDraft = useCallback(async () => {
    latestPayload.current = null;
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    await clearDraft();
  }, []);

  // ── Flush imediato quando a aba perde o foco (troca de app, minimizar) ──────
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        // Cancela o debounce e salva na hora
        if (debounceRef.current) {
          clearTimeout(debounceRef.current);
          debounceRef.current = null;
        }
        flushSave();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [flushSave]);

  // ── Flush imediato antes de fechar/recarregar ────────────────────────────────
  // `beforeunload` não espera Promises, então usamos o Dexie de forma síncrona
  // via sendBeacon não está disponível de forma simples, então fazemos o que
  // é possível: cancela o debounce e tenta o save de forma best-effort.
  useEffect(() => {
    const onBeforeUnload = () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      // Dexie é baseado em IndexedDB — não bloqueia o unload, mas a maioria
      // dos browsers dá tempo suficiente para operações leves antes de fechar.
      flushSave();
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [flushSave]);

  // ── Limpar debounce ao desmontar ─────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return { triggerSave, discardDraft, flushSave };
}
