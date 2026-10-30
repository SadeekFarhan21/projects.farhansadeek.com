#!/usr/bin/env node
// Build a course list of ACTUAL COURSES across the 16 target subjects, from the
// public SIS catalog. Excludes non-course offerings (research, independent
// study, fieldwork, thesis, practicum, colloquium, tutorial, seminars,
// projects). "Topics in ..." lecture courses are kept.
//
// Usage:
//   node src/graduate.js                       # 4000+ -> graduate.json
//   node src/graduate.js --min 0 --out courses.json   # all levels -> courses.json
//
// Reads out/Fall2026_catalog.json.

import { readFile, writeFile } from 'node:fs/promises';

const argv = process.argv.slice(2);
const arg = (name, def) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : def; };
const MIN_LEVEL = parseInt(arg('--min', '4000'), 10);
const OUT_FILE = arg('--out', 'graduate.json');

const num = (s) => parseInt((String(s).match(/\d{4}/) || [0])[0], 10);
const norm = (t) => t.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

// Returns true if the title is a non-course (research/admin/individual) offering.
function isNonCourse(title) {
  const t = title.toLowerCase();
  if (/\b(fieldwork|internship|thesis|dissertation|practicum|colloquium|tutorial|seminar|projects?|mentored)\b/.test(t)) return true;
  if (/\bindependent\b/.test(t)) return true;
  if (/\bdoctoral\b/.test(t)) return true;
  if (/practitioner/.test(t)) return true;
  if (/professional development/.test(t)) return true;
  // "research" as an activity — but keep the field name "operations research".
  if (/\bresearch\b/.test(t) && !/operations research/.test(t)) return true;
  return false;
}

async function main() {
  const cat = JSON.parse(await readFile('out/Fall2026_catalog.json', 'utf8'));

  const seen = new Map();
  let droppedNonCourse = 0;
  for (const c of cat.courses) {
    if (num(c.courseNumber) < MIN_LEVEL) continue;
    if (isNonCourse(c.title)) { droppedNonCourse++; continue; }
    const key = norm(c.title);
    const e = seen.get(key) || { title: c.title, level: num(c.courseNumber), interests: [], points: c.sections[0]?.points || null, codes: [], sections: [] };
    e.codes.push(`${c.subject} ${c.courseNumber}`);
    e.level = Math.min(e.level, num(c.courseNumber));
    e.interests = Array.from(new Set([...e.interests, ...(c.interests || [])]));
    for (const s of c.sections) e.sections.push({ code: `${c.subject} ${c.courseNumber}`, section: s.section, call: s.callNumber, points: s.points, instructor: s.instructor, enrollment: s.enrollment, vergilUrl: s.vergilUrl });
    seen.set(key, e);
  }

  const classes = Array.from(seen.values()).sort((a, b) => a.codes[0].localeCompare(b.codes[0]));
  const bySubject = {};
  for (const c of classes) (bySubject[c.codes[0].split(' ')[0]] ||= []).push(c.codes[0] + ' — ' + c.title);

  const levelDesc = MIN_LEVEL > 0 ? `${MIN_LEVEL}+ ` : 'all-level ';
  const out = {
    term: 'Fall2026',
    source: `public SIS dataset only; ${levelDesc}actual COURSES (research/seminar/fieldwork/thesis/project/practicum/independent-study excluded); times/locations are Vergil-only and not included`,
    scope: `actual courses (${MIN_LEVEL > 0 ? MIN_LEVEL + '+' : 'all levels'}) across the 16 target subjects`,
    minLevel: MIN_LEVEL,
    totalClasses: classes.length,
    totalSections: classes.reduce((n, c) => n + c.sections.length, 0),
    interestTagged: classes.filter((c) => c.interests.length).length,
    classes,
    bySubject,
  };
  await writeFile(OUT_FILE, JSON.stringify(out, null, 2));

  console.error(`[graduate] dropped ${droppedNonCourse} non-course offerings`);
  console.error(`[graduate] ${out.totalClasses} courses / ${out.totalSections} sections -> ${OUT_FILE}`);
  for (const [s, l] of Object.entries(bySubject).sort()) console.error(`  ${s.padEnd(5)} ${l.length}`);
  console.log(JSON.stringify({ file: 'graduate.json', totalClasses: out.totalClasses, totalSections: out.totalSections }, null, 2));
}

main().catch((e) => { console.error('[graduate] FAILED:', e.message); process.exit(1); });
