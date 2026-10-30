'use client';
import { AnimatePresence, motion } from 'framer-motion';
import { useMode } from '@/context/mode-provider';
import PathMode from '@/components/path-mode';
import OpenMode from '@/components/open-mode';

export default function Home() {
  const { mode } = useMode();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={mode}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        {mode === 'sanctuary' ? <PathMode /> : <OpenMode />}
      </motion.div>
    </AnimatePresence>
  );
}
