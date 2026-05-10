'use client';

import { useEffect, useState } from 'react';
import { seedDefaultData } from '@/lib/db';
import { motion, AnimatePresence } from 'framer-motion';

export function DbProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    seedDefaultData()
      .then(() => setReady(true))
      .catch((err) => {
        console.error('DB seed error', err);
        setReady(true);
      });
  }, []);

  return (
    <AnimatePresence mode="wait">
      {!ready ? (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.4, ease: 'easeOut' }}
            className="flex flex-col items-center gap-4"
          >
            {/* Logo */}
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl gradient-bg flex items-center justify-center shadow-lg"
                style={{ boxShadow: '0 0 40px rgba(255,61,127,0.5)' }}>
                <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
                  <path d="M4 22 L12 10 L20 28 L28 16 L36 22 L40 18" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <motion.div
                className="absolute inset-0 rounded-2xl gradient-bg opacity-40 blur-xl"
                animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.7, 0.4] }}
                transition={{ repeat: Infinity, duration: 2 }}
              />
            </div>
            <div className="text-center">
              <h1 className="text-3xl font-bold gradient-text tracking-tight">Pulse</h1>
              <p className="text-muted-foreground text-sm mt-1">Carregando seus treinos…</p>
            </div>
            <div className="flex gap-1.5 mt-4">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 rounded-full bg-primary"
                  animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.1, 0.8] }}
                  transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.2 }}
                />
              ))}
            </div>
          </motion.div>
        </motion.div>
      ) : (
        <motion.div
          key="app"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
