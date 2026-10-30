// Shared in-page parser for Columbia SIS course-listing pages.
//
// PAGE_PARSER is the body of a function that runs INSIDE the browser via the
// Playwright MCP `browser_evaluate` tool, so it can only use DOM globals. It is
// kept here as a serialized function string so both src/scrape.js (single
// subject) and src/all.js (every subject) parse listings identically.

export const PAGE_PARSER = (() => {
  const abs = (h) => (h ? new URL(h, location.href).href : null);
  const table = document.querySelector('table.course-listing');
  if (!table) return { error: 'no table.course-listing found', courses: [] };

  const subjectTitle = (document.querySelector('#header h1') || {}).textContent || '';
  const rows = Array.from(table.querySelectorAll('tr'));
  const courses = [];
  let current = null;

  for (const tr of rows) {
    const th = tr.querySelector('th');
    if (th) {
      // Course header, e.g. "Fall 2026 Computer Science W1002<br>COMPUTING IN CONTEXT"
      const parts = th.innerHTML.split(/<br\s*\/?>/i);
      const heading = parts[0].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').trim();
      const title = (parts[1] || '').replace(/<[^>]+>/g, '').trim();
      const num = heading.match(/([A-Z]{0,3}\d{4}[A-Z]?)\s*$/);
      current = {
        courseNumber: num ? num[1] : null,
        heading,
        title,
        sections: [],
      };
      courses.push(current);
      continue;
    }
    if (!current) continue;
    const link = tr.querySelector('td a[href]');
    if (!link) continue;

    const sec = {
      section: link.textContent.trim(),
      sectionUrl: abs(link.getAttribute('href')),
      sectionTitle: null,
      callNumber: null,
      points: null,
      enrollment: null,
      instructor: null,
      vergilUrl: null,
      fields: {},
    };

    const details = tr.querySelector('div.course-details');
    if (details) {
      const h1 = details.querySelector('h1');
      if (h1) sec.sectionTitle = h1.textContent.trim();
      const dl = details.querySelector('dl');
      if (dl) {
        let key = null;
        for (const el of Array.from(dl.children)) {
          if (el.tagName === 'DT') key = el.textContent.replace(/:\s*$/, '').trim();
          else if (el.tagName === 'DD' && key) sec.fields[key] = el.textContent.trim();
        }
      }
      const v = details.querySelector('a[href*="vergil"]');
      if (v) sec.vergilUrl = abs(v.getAttribute('href'));
    }

    sec.callNumber = sec.fields['Call Number'] || null;
    sec.points = sec.fields['Points'] || null;
    sec.enrollment = sec.fields['Enrollment'] || null;
    sec.instructor = sec.fields['Instructor'] || null;

    current.sections.push(sec);
  }

  return { subjectTitle, courses };
}).toString();
