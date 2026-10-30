#!/usr/bin/env node
// Compile already-scraped subject JSON files into one combined catalog, and tag
// each course against the user's research interests (keyword lists below).
//
// Usage:
//   node src/compile.js                       # defaults: MATH PHYS COMS APMA APPH, Fall2026
//   node src/compile.js Fall2026 MATH COMS    # term then subjects
//
// Reads out/<SUBJECT>_<TERM>.json (produced by src/scrape.js) and writes
// out/<TERM>_catalog.json plus a printed summary of interest-matched courses.

import { readFile, writeFile, readdir } from 'node:fs/promises';

const DEFAULT_TERM = 'Fall2026';
const DEFAULT_SUBJECTS = ['MATH', 'PHYS', 'COMS', 'APMA', 'APPH'];

// Interest -> keywords to look for in course titles (lowercased).
const INTERESTS = {
  'machine learning': ['machine learning', 'deep learning', 'neural', 'learning', 'reinforcement', 'nlp', 'natural language', 'vision', 'ai '],
  'distributed algorithms': ['distributed', 'parallel', 'concurrent', 'consensus', 'fault-tol'],
  'signal processing': ['signal', 'fourier', 'wavelet', 'image', 'compressed sensing', 'sensing', 'sampling', 'spectral'],
  'random matrix theory': ['random matrix', 'stochastic', 'probability', 'random', 'markov', 'matrix'],
  'higher-dimensional geometry': ['geometry', 'geometric', 'topology', 'manifold', 'high-dimensional', 'high dimensional', 'differential geom'],
};

const clean = (s) => (s || '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

function matchInterests(title) {
  const t = title.toLowerCase();
  const hits = [];
  for (const [interest, kws] of Object.entries(INTERESTS)) {
    if (kws.some((k) => k && t.includes(k))) hits.push(interest);
  }
  return hits;
}

async function main() {
  const argv = process.argv.slice(2);
  const term = argv.find((a) => /^(Fall|Spring|Summer)\d{4}$/.test(a)) || DEFAULT_TERM;
  const all = argv.includes('--all');
  // Subject codes can contain underscores (e.g. AM__, CR__), so accept those too.
  const subjects = argv.filter((a) => /^[A-Z][A-Z_]{2,3}$/.test(a));
  let subs;
  if (all) {
    // Discover every out/<CODE>_<TERM>.json produced by src/all.js or src/scrape.js.
    const files = await readdir('out');
    subs = files
      .filter((f) => f.endsWith(`_${term}.json`) && !f.startsWith('_'))
      .map((f) => f.slice(0, -`_${term}.json`.length))
      .sort();
  } else {
    subs = subjects.length ? subjects : DEFAULT_SUBJECTS;
  }

  const perSubject = [];
  const courses = [];

  for (const code of subs) {
    let data;
    try {
      data = JSON.parse(await readFile(`out/${code}_${term}.json`, 'utf8'));
    } catch {
      console.error(`[compile] missing out/${code}_${term}.json — run: node src/scrape.js ${code} ${term}`);
      continue;
    }
    let sectionCount = 0;
    for (const c of data.courses || []) {
      const title = clean(c.title);
      const interests = matchInterests(title);
      const sections = (c.sections || []).map((s) => ({
        section: s.section,
        callNumber: s.callNumber,
        points: s.points,
        instructor: s.instructor,
        enrollment: s.enrollment,
        sectionUrl: s.sectionUrl,
        vergilUrl: s.vergilUrl,
      }));
      sectionCount += sections.length;
      courses.push({
        subject: code,
        courseNumber: c.courseNumber,
        title,
        interests,
        sectionCount: sections.length,
        sections,
      });
    }
    perSubject.push({ code, subjectTitle: data.subjectTitle || null, courseCount: (data.courses || []).length, sectionCount });
  }

  const matched = courses.filter((c) => c.interests.length);
  const out = {
    term,
    generatedAt: new Date().toISOString(),
    subjects: perSubject,
    totals: {
      courses: courses.length,
      sections: courses.reduce((n, c) => n + c.sectionCount, 0),
      interestMatched: matched.length,
    },
    courses,
  };

  const file = `out/${term}_catalog.json`;
  await writeFile(file, JSON.stringify(out, null, 2));

  // Summary to stderr/stdout.
  console.error(`\n[compile] ${term} catalog -> ${file}`);
  for (const s of perSubject) console.error(`   ${s.code.padEnd(5)} ${String(s.courseCount).padStart(3)} courses / ${String(s.sectionCount).padStart(3)} sections  ${s.subjectTitle || ''}`);
  console.error(`   TOTAL ${String(out.totals.courses).padStart(3)} courses / ${out.totals.sections} sections`);
  console.error(`\n[compile] ${matched.length} courses matched your interests:`);
  for (const c of matched.sort((a, b) => a.subject.localeCompare(b.subject) || a.courseNumber.localeCompare(b.courseNumber))) {
    console.error(`   ${(c.subject + ' ' + c.courseNumber).padEnd(13)} ${c.title}  [${c.interests.join(', ')}]`);
  }
  console.log(JSON.stringify({ file, ...out.totals }, null, 2));
}

main().catch((e) => { console.error('[compile] FAILED:', e.message); process.exit(1); });
