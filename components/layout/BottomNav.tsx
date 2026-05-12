'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Home, Dumbbell, Activity, Clock, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/', label: 'Início', Icon: Home },
  { href: '/treino', label: 'Treino', Icon: Dumbbell },
  { href: '/cardio', label: 'Cardio', Icon: Activity },
  { href: '/historico', label: 'Histórico', Icon: Clock },
  { href: '/configuracoes', label: 'Config', Icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 nav-blur safe-bottom">
      {/* Linha decorativa no topo da nav */}
      <div className="h-px w-full" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,61,127,0.25), rgba(168,85,247,0.25), transparent)' }} />
      <div className="flex items-center justify-around px-1 h-16">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className="relative flex flex-col items-center justify-center gap-0.5 flex-1 h-full min-h-[44px] select-none"
            >
              <div className="relative flex flex-col items-center gap-0.5 px-3 py-1.5">
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute inset-0 rounded-2xl gradient-bg-soft"
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  />
                )}
                <motion.div
                  whileTap={{ scale: 0.82 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                  className="relative z-10"
                >
                  <Icon
                    size={21}
                    className={cn(
                      'transition-colors duration-150',
                      isActive ? 'text-primary' : 'text-muted-foreground/70'
                    )}
                    strokeWidth={isActive ? 2.5 : 1.7}
                  />
                </motion.div>
                <span
                  className={cn(
                    'relative z-10 text-[10px] font-semibold tracking-wide transition-colors duration-150',
                    isActive ? 'text-primary' : 'text-muted-foreground/60'
                  )}
                >
                  {label}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
