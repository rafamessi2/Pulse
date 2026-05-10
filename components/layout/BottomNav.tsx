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
      <div className="flex items-center justify-around px-2 h-16">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className="relative flex flex-col items-center justify-center gap-0.5 flex-1 h-full"
            >
              <div className="relative flex flex-col items-center gap-0.5">
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute -inset-2 rounded-xl gradient-bg-soft"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <Icon
                  size={20}
                  className={cn(
                    'relative z-10 transition-colors duration-200',
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  )}
                  strokeWidth={isActive ? 2.5 : 1.8}
                />
                <span
                  className={cn(
                    'relative z-10 text-[10px] font-medium transition-colors duration-200',
                    isActive ? 'text-primary' : 'text-muted-foreground'
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
