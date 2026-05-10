import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, isToday, isYesterday, startOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date): string {
  if (isToday(date)) return 'Hoje';
  if (isYesterday(date)) return 'Ontem';
  return format(date, "dd 'de' MMM", { locale: ptBR });
}

export function formatDateTime(date: Date): string {
  return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}min`;
  return `${h}h${m > 0 ? ` ${m}min` : ''}`;
}

export function formatPace(paceMin: number, paceSec: number): string {
  const sec = String(paceSec).padStart(2, '0');
  return `${paceMin}:${sec}/km`;
}

export function calcPace(distanceKm: number, durationMinutes: number, durationSeconds: number): { min: number; sec: number } {
  const totalSeconds = durationMinutes * 60 + durationSeconds;
  if (distanceKm === 0) return { min: 0, sec: 0 };
  const paceSeconds = totalSeconds / distanceKm;
  return {
    min: Math.floor(paceSeconds / 60),
    sec: Math.round(paceSeconds % 60),
  };
}

export function formatVolume(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}t`;
  return `${kg.toFixed(0)}kg`;
}

export function getWeekStart(date: Date = new Date()): Date {
  return startOfWeek(date, { weekStartsOn: 1 }); // Monday
}

export function getCardioTypeLabel(type: string): string {
  const map: Record<string, string> = {
    leve: 'Corrida Leve',
    intervalado: 'Intervalado',
    tempo: 'Tempo Run',
    longao: 'Longão',
  };
  return map[type] ?? type;
}

export function getCardioTypeColor(type: string): string {
  const map: Record<string, string> = {
    leve: 'text-emerald-400',
    intervalado: 'text-orange-400',
    tempo: 'text-blue-400',
    longao: 'text-purple-400',
  };
  return map[type] ?? 'text-muted-foreground';
}

export function getEffortLabel(effort: number): string {
  if (effort <= 3) return 'Fácil';
  if (effort <= 5) return 'Moderado';
  if (effort <= 7) return 'Difícil';
  if (effort <= 9) return 'Muito Difícil';
  return 'Máximo';
}

export function getEffortColor(effort: number): string {
  if (effort <= 3) return 'text-emerald-400';
  if (effort <= 5) return 'text-yellow-400';
  if (effort <= 7) return 'text-orange-400';
  return 'text-red-400';
}

export function dayOfWeekIndex(): number {
  const day = new Date().getDay(); // 0=Sun
  return day === 0 ? 6 : day - 1; // Mon=0 ... Sun=6
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}
