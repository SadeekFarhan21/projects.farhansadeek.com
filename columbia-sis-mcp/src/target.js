#!/usr/bin/env node
// Build the targeted class list for Fall 2026 from the compiled catalog, using
// only the public SIS dataset. Scope = every class in the 16 target subjects
// (targetsubjects.json). Interests are NOT a filter — they're kept as optional
// tags so on-theme classes are easy to spot. Cross-listed courses are merged.
//
// Usage: node src/target.js   (reads out/Fall2026_catalog.json)
// Writes targeted_classes.json and prints a per-subject summary.

import { readFile, writeFile } from 'node:fs/promises';

// Interest -> keywords, used only to ANNOTATE (tag) classes, never to exclude.
const INTERESTS = {
  'machine learning': ['machine learning', 'deep learning', 'neural network', 'reinforcement', 'representation learning', 'statistical learning', 'unsupervised', 'computer vision', 'natural language', 'graph neural', 'learning theory', 'generative'],
  'distributed algorithms': ['distributed', 'parallel', 'concurrent', 'consensus'],
  'signal processing': ['signal', 'fourier', 'wavelet', 'sampling', 'compressed sensing', 'information theory', 'estimation', 'image processing', 'inverse problem', 'harmonic analysis'],
  'random matrix theory': ['random matrix', 'high-dimensional', 'high dimensional', 'spectral', 'advanced probability', 'probability theory', 'stochastic process', 'stochastic models', 'measure theor'],
  'higher-dimensional geometry': ['geometry', 'geometric', 'topology', 'manifold', 'differential geometry', 'algebraic topology', 'riemannian', 'lie group'],
};

const num = (s) => parseInt((String(s).match(/\d{4}/) || [0])[0], 10);
const norm = (t) => t.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

function tag(title) {
  const t = title.toLowerCase();
  return Object.entries(INTERESTS).filter(([, kws]) => kws.some((w) => t.includes(w))).map(([k]) => k);
}

async function main() {
  const cat = JSON.parse(await readFile('out/Fall2026_catalog.json', 'utf8'));

  // Merge cross-listed courses (same title) into one entry.
  const seen = new Map();
  for (const c of cat.courses) {
    const key = norm(c.title);
    const entry = seen.get(key) || {
      title: c.title,
      level: num(c.courseNumber),
      interests: [],
      points: c.sections[0]?.points || null,
      codes: [],
      sections: [],
    };
    entry.codes.push(`${c.subject} ${c.courseNumber}`);
    entry.interests = Array.from(new Set([...entry.interests, ...tag(c.title)]));
    for (const s of c.sections) {
      entry.sections.push({ code: `${c.subject} ${c.courseNumber}`, section: s.section, call: s.callNumber, points: s.points, instructor: s.instructor, enrollment: s.enrollment, vergilUrl: s.vergilUrl });
    }
    seen.set(key, entry);
  }

  const classes = Array.from(seen.values()).sort((a, b) => a.codes[0].localeCompare(b.codes[0]));

  // Per-subject roll-up (by the primary code's subject prefix).
  const bySubject = {};
  for (const c of classes) {
    const subj = c.codes[0].split(' ')[0];
    (bySubject[subj] ||= []).push(c.codes[0] + ' — ' + c.title);
  }

  const out = {
    term: 'Fall2026',
    source: 'public SIS dataset only (out/Fall2026_catalog.json); times/locations NOT included (Vergil-only)',
    scope: 'all classes in the 16 target subjects (targetsubjects.json); interests are tags, not filters',
    totalClasses: classes.length,
    totalSections: classes.reduce((n, c) => n + c.sections.length, 0),
    interestTagged: classes.filter((c) => c.interests.length).length,
    classes,
    bySubject,
  };
  await writeFile('targeted_classes.json', JSON.stringify(out, null, 2));

  console.error(`\n[target] ${classes.length} classes (${out.totalSections} sections) -> targeted_classes.json`);
  console.error(`[target] ${out.interestTagged} are tagged as on-theme.\n`);
  for (const [subj, list] of Object.entries(bySubject).sort()) console.error(`  ${subj.padEnd(5)} ${list.length} classes`);
  console.log(JSON.stringify({ file: 'targeted_classes.json', totalClasses: out.totalClasses, totalSections: out.totalSections, interestTagged: out.interestTagged }, null, 2));
}

main().catch((e) => { console.error('[target] FAILED:', e.message); process.exit(1); });
