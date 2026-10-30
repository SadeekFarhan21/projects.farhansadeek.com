#!/usr/bin/env node
// Build the website dataset from the full SIS catalog (every subject, every
// level). Produces one flat row per section — the shape site/src/pages/index.astro
// renders — plus a downloadable CSV.
//
// SIS-only data: subject, course code, cross-listings, title, section, call
// number, instructor, enrollment (parsed into enrolled/capacity/seatsLeft),
// points, and the Vergil link. Meeting days/times/locations are NOT included —
// those live behind the Vergil login (see src/vergil.js).
//
// Usage:
//   node src/site-data.js                 # reads out/Fall2026_catalog.json
//   node src/site-data.js Spring2026

import { readFile, writeFile, mkdir } from 'node:fs/promises';

const term = process.argv[2] || 'Fall2026';
const CATALOG = `out/${term}_catalog.json`;
const JSON_OUT = 'site/src/data/courses.json';
const CSV_OUT = 'site/public/courses.csv';

const clean = (s) => (s || '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const norm = (t) => clean(t).toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

// "ACCT" + "B5001" -> "ACCT 5001"  (drop the school/division letter prefix)
const courseCode = (c) => `${c.subject} ${(c.courseNumber || '').replace(/^[A-Za-z]+/, '')}`.trim();

// "101 students (200 max) as of June 18, 2026" -> { enrolled, capacity, seatsLeft }
function parseEnrollment(s) {
  const m = (s || '').match(/(\d+)\s+students?\s*\((\d+)\s*max\)/i);
  if (!m) return { enrolled: null, capacity: null, seatsLeft: null };
  const enrolled = Number(m[1]);
  const capacity = Number(m[2]);
  return { enrolled, capacity, seatsLeft: capacity - enrolled };
}

const csvCell = (v) => {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

async function main() {
  const cat = JSON.parse(await readFile(CATALOG, 'utf8'));

  // Cross-listings: courses sharing a normalized title across subjects.
  const titleCodes = new Map();
  for (const c of cat.courses) {
    const code = courseCode(c);
    const key = norm(c.title);
    (titleCodes.get(key) || titleCodes.set(key, new Set()).get(key)).add(code);
  }

  const rows = [];
  for (const c of cat.courses) {
    // Skip offerings without a numeric course number (e.g. med-school clinical rotations).
    if (!/\d/.test(c.courseNumber || '')) continue;
    const code = courseCode(c);
    const title = clean(c.title);
    const crosslist = Array.from(titleCodes.get(norm(c.title)) || [])
      .filter((x) => x !== code)
      .sort()
      .join(', ');
    for (const s of c.sections) {
      const { enrolled, capacity, seatsLeft } = parseEnrollment(s.enrollment);
      const points = s.points || null;
      rows.push({
        subject: c.subject,
        course: code,
        crosslist,
        title,
        section: (s.section || '').replace(/^Section\s+/i, ''),
        call: s.callNumber || null,
        instructor: clean(s.instructor) || null,
        enrolled,
        capacity,
        seatsLeft,
        points,
        pointsNum: points != null ? parseFloat(points) : null,
        vergil: s.vergilUrl || null,
        sis: s.sectionUrl || null,
      });
    }
  }

  // Order by subject (A->Z), then ascending course number, then section.
  const courseNum = (r) => parseInt(r.course.split(' ')[1], 10) || 0;
  rows.sort(
    (a, b) =>
      a.subject.localeCompare(b.subject) ||
      courseNum(a) - courseNum(b) ||
      a.section.localeCompare(b.section)
  );

  await mkdir('site/src/data', { recursive: true });
  await mkdir('site/public', { recursive: true });
  await writeFile(JSON_OUT, JSON.stringify(rows, null, 2));

  const cols = ['course', 'crosslist', 'title', 'section', 'call', 'instructor', 'enrolled', 'capacity', 'seatsLeft', 'points', 'vergil', 'sis'];
  const csv = [cols.join(',')]
    .concat(rows.map((r) => cols.map((k) => csvCell(r[k])).join(',')))
    .join('\n');
  await writeFile(CSV_OUT, csv);

  const distinct = new Set(rows.map((r) => r.course)).size;
  const subjects = new Set(rows.map((r) => r.subject)).size;
  console.error(`[site-data] ${term}: ${distinct} courses / ${rows.length} sections / ${subjects} subjects`);
  console.error(`[site-data] -> ${JSON_OUT}`);
  console.error(`[site-data] -> ${CSV_OUT}`);
  console.log(JSON.stringify({ term, courses: distinct, sections: rows.length, subjects }, null, 2));
}

main().catch((e) => { console.error('[site-data] FAILED:', e.message); process.exit(1); });
