'use client';
import { useState, useRef, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { generateLevels, PACKAGES, type LevelNode, type PackageId } from '@/lib/session-data';
import BreakModal from './break-modal';

// ── Zigzag x-offset pattern (repeating 5-position wave) ──
const ZIGZAG = [0, -36, 0, 36, 0];

function getOffset(index: number): number {
  return ZIGZAG[index % ZIGZAG.length];
}

// ── Node colors per package ──
const PKG_ACCENT: Record<PackageId, { ring: string; glow: string; text: string }> = {
  anchor:          { ring: 'border-primary/60',   glow: 'rgba(205,197,240,0.15)', text: 'text-primary' },
  'earned-moment': { ring: 'border-tertiary/60',  glow: 'rgba(212,165,116,0.15)', text: 'text-tertiary' },
  'lighter-you':   { ring: 'border-secondary/60', glow: 'rgba(228,160,176,0.15)', text: 'text-secondary' },
};

export default function PathMode() {
  const [completedCount] = useState(2); // TODO: persist via state/db
  const [activePackage, setActivePackage] = useState<PackageId | null>(null);
  const [activeLevel, setActiveLevel] = useState<number | null>(null);
  const currentRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [pathData, setPathData] = useState<{
    width: number;
    height: number;
    points: { x: number; y: number }[];
  }>({ width: 0, height: 0, points: [] });

  const levels = useMemo(() => generateLevels(completedCount), [completedCount]);

  // Auto-scroll to current level on mount
  useEffect(() => {
    if (currentRef.current) {
      currentRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  // Measure actual node centers so connector lines align with rendered nodes.
  useEffect(() => {
    const updatePath = () => {
      const container = containerRef.current;
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      const points = levels
        .map((_, i) => {
          const node = nodeRefs.current[i];
          if (!node) return null;
          const rect = node.getBoundingClientRect();
          return {
            x: rect.left - containerRect.left + rect.width / 2,
            y: rect.top - containerRect.top + rect.height / 2,
          };
        })
        .filter((p): p is { x: number; y: number } => p !== null);

      setPathData({
        width: container.clientWidth,
        height: container.scrollHeight,
        points,
      });
    };

    updatePath();
    window.addEventListener('resize', updatePath);
    const id = window.setTimeout(updatePath, 0);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener('resize', updatePath);
    };
  }, [levels, activeLevel]);

  function handleNodeClick(node: LevelNode) {
    if (node.state === 'locked') return;
    setActivePackage(node.packageId);
    setActiveLevel(node.level);
  }

  return (
    <>
      {/* Nebula background blobs */}
      <div className="fixed top-[20%] -left-[10%] w-[500px] h-[500px] pointer-events-none" style={{ background: 'radial-gradient(circle at 50% 50%, rgba(61, 26, 40, 0.4) 0%, transparent 70%)' }} />
      <div className="fixed bottom-[10%] -right-[5%] w-[600px] h-[600px] pointer-events-none" style={{ background: 'radial-gradient(circle at 50% 50%, rgba(212, 165, 116, 0.06) 0%, transparent 60%)' }} />

      <div ref={containerRef} className="relative max-w-md mx-auto py-8 pb-24">
        {/* SVG dashed path connecting nodes */}
        <SVGPath width={pathData.width} height={pathData.height} points={pathData.points} />

        {/* Level nodes */}
        <div className="relative flex flex-col items-center gap-6">
          {levels.map((node, i) => {
            const showWeekHeader = i % 3 === 0;
            const week = Math.floor(i / 3) + 1;

            return (
              <div key={node.level} className="flex flex-col items-center">
                {showWeekHeader && (
                  <div className="mb-4">
                    <span className="px-4 py-1.5 rounded-full text-xs font-label uppercase tracking-[0.15em] bg-surface-container-high/60 text-on-surface-variant border border-outline-variant/20">
                      Week {week}
                    </span>
                  </div>
                )}
                <div
                  ref={(el) => {
                    nodeRefs.current[i] = el;
                    if (node.state === 'current') {
                      currentRef.current = el;
                    }
                  }}
                  style={{ transform: `translateX(${getOffset(i)}px)` }}
                  className="transition-transform duration-500"
                >
                  {node.state === 'completed' && (
                    <CompletedNode node={node} onClick={() => handleNodeClick(node)} />
                  )}
                  {node.state === 'current' && (
                    <CurrentNode node={node} onClick={() => handleNodeClick(node)} />
                  )}
                  {node.state === 'locked' && (
                    <LockedNode node={node} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {activePackage !== null && activeLevel !== null && (
        <BreakModal
          packageId={activePackage}
          level={activeLevel}
          onClose={() => { setActivePackage(null); setActiveLevel(null); }}
        />
      )}
    </>
  );
}

// ── Completed Node ──
function CompletedNode({ node, onClick }: { node: LevelNode; onClick: () => void }) {
  const accent = PKG_ACCENT[node.packageId];
  return (
    <button onClick={onClick} className="group flex flex-col items-center gap-2">
      <div className={`w-20 h-20 rounded-full bg-surface-container/60 backdrop-blur-lg border-2 ${accent.ring} flex items-center justify-center transition-transform duration-500 group-hover:scale-105`}>
        <span className="material-symbols-outlined text-3xl text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
          check_circle
        </span>
      </div>
      <span className="text-xs font-label text-on-surface-variant/60">{PACKAGES[node.packageId].label}</span>
    </button>
  );
}

// ── Current Node (active, pulsing) ──
function CurrentNode({ node, onClick }: { node: LevelNode; onClick: () => void }) {
  const pkg = PACKAGES[node.packageId];
  const accent = PKG_ACCENT[node.packageId];
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        {/* Pulsing glow ring */}
        <motion.div
          className="absolute -inset-4 rounded-full"
          style={{ background: `radial-gradient(circle, ${accent.glow}, transparent 70%)` }}
          animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0.3, 0.6] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        />
        <button
          onClick={onClick}
          className={`relative w-28 h-28 rounded-full bg-surface-variant/40 backdrop-blur-xl border-2 ${accent.ring} flex items-center justify-center shadow-2xl transition-transform duration-500 hover:scale-105`}
        >
          <span className={`material-symbols-outlined text-5xl ${accent.text}`}>
            {pkg.icon}
          </span>
        </button>
      </div>
      <div className="text-center">
        <h3 className={`font-headline font-bold text-lg ${accent.text}`}>{pkg.label}</h3>
        <p className="text-xs font-label uppercase tracking-[0.15em] text-on-surface-variant/60">Level {node.level}</p>
      </div>
      <button
        onClick={onClick}
        className="px-8 py-2.5 bg-gradient-to-r from-primary to-primary-dim text-on-primary-fixed font-bold rounded-xl shadow-[0_4px_20px_rgba(205,197,240,0.12)] hover:shadow-[0_4px_30px_rgba(205,197,240,0.2)] transition-all duration-500 active:scale-95 text-sm"
      >
        Start Training
      </button>
    </div>
  );
}

// ── Locked Node ──
function LockedNode({ node }: { node: LevelNode }) {
  return (
    <div className="flex flex-col items-center gap-2 opacity-40">
      <div className="w-16 h-16 rounded-full bg-surface-container-highest/40 backdrop-blur-md border border-outline-variant/20 flex items-center justify-center">
        <span className="material-symbols-outlined text-xl text-outline">lock</span>
      </div>
      <span className="text-[10px] font-label text-on-surface-variant/40">{PACKAGES[node.packageId].label}</span>
    </div>
  );
}

// ── SVG dashed path behind nodes ──
function SVGPath({
  width,
  height,
  points,
}: {
  width: number;
  height: number;
  points: { x: number; y: number }[];
}) {
  if (points.length < 2 || width <= 0 || height <= 0) return null;

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpY = (prev.y + curr.y) / 2;
    d += ` Q ${prev.x} ${cpY} ${curr.x} ${curr.y}`;
  }

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient
          id="path-grad"
          x1={width / 2}
          y1="0"
          x2={width / 2}
          y2={height}
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#cdc5f0" />
          <stop offset="1" stopColor="#d4a574" />
        </linearGradient>
      </defs>
      <path
        d={d}
        stroke="url(#path-grad)"
        strokeWidth="3"
        strokeDasharray="10 10"
        opacity="0.12"
      />
    </svg>
  );
}
