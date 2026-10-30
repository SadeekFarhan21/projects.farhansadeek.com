'use strict';

// Build /projects.txt, a plain-text dump of every published post, newest first:
// an index (title, date, URL, tags, code link, description), then each post's
// full write-up as Markdown, with diagrams replaced by their alt text and
// charts replaced by their data. Readable with curl and easy for scripts and
// LLMs to ingest. Drafts are never included, since locals.posts only holds
// published posts unless render_drafts is on.

const fs = require('fs');
const path = require('path');

function oneLine(s) {
  return String(s || '').replace(/\s+/g, ' ').trim();
}

function unescapeAttr(s) {
  return String(s || '')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}

function fmt(v) {
  return typeof v === 'number' ? v.toLocaleString('en-US', { maximumFractionDigits: 6 }) : String(v);
}

// A chart's JSON (source/data/<name>.json) as a short text block
function chartText(dataDir, name) {
  let d;
  try {
    d = JSON.parse(fs.readFileSync(path.join(dataDir, name + '.json'), 'utf8'));
  } catch (err) {
    return '';
  }
  if (!d.title) return '';
  const out = [`[Chart] ${oneLine(d.title)}`];
  if (d.subtitle) out.push(oneLine(d.subtitle));
  if (d.unit) out.push(`Unit: ${oneLine(d.unit)}`);
  if (Array.isArray(d.rows)) {
    d.rows.forEach(r => {
      out.push(`- ${oneLine(r.label)}: ${fmt(r.value)}${r.detail ? ` (${oneLine(r.detail)})` : ''}`);
    });
  }
  if (Array.isArray(d.series) && Array.isArray(d.categories)) {
    d.series.forEach(s => {
      const vals = d.categories.map((c, i) => `${oneLine(c)} ${fmt((s.values || [])[i])}`);
      out.push(`- ${oneLine(s.name)}: ${vals.join('; ')}`);
    });
  }
  if (Array.isArray(d.entities)) {
    const x = d.xLabel ? `${oneLine(d.xLabel)} ` : 'x=';
    d.entities.forEach(e => {
      const pts = (e.points || []).map(p => `${x}${fmt(p.x)}: ${fmt(p.value)}`);
      out.push(`- ${oneLine(e.name)}: ${pts.join('; ')}`);
    });
  }
  if (d.caption) out.push(oneLine(d.caption));
  return out.join('\n');
}

// Post Markdown with site-only HTML turned into text. Fenced code is left alone.
function postText(raw, dataDir) {
  const body = raw.replace(/^---[\s\S]*?\n---\s*\n/, '');
  return body.split(/(^```[\s\S]*?^```)/m).map((part, i) => {
    if (i % 2) return part;
    return part
      // charts: <figure data-figure="chart:projects/x/y"></figure>
      .replace(/<figure\b[^>]*data-figure="chart:([^"]+)"[^>]*>\s*<\/figure>/g,
        (m, name) => chartText(dataDir, name))
      // Excalidraw diagrams, as an <img alt> or an inline <svg aria-label>
      .replace(/<figure\b[^>]*class="excal[^"]*"[\s\S]*?<\/figure>/g, m => {
        const alt = m.match(/\balt="([^"]*)"/) || m.match(/\baria-label="([^"]*)"/);
        return alt ? `[Diagram] ${oneLine(unescapeAttr(alt[1]))}` : '';
      })
      // interactive figures without a data file worth flattening
      .replace(/<figure\b[\s\S]*?<\/figure>/g, '')
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, (m, alt) => (alt ? `[Image] ${oneLine(alt)}` : ''))
      // citations: <sup>[[1]](#ref-1)</sup> -> [1]
      .replace(/<sup>\s*\[\[(\d+)\]\]\(#ref-\d+\)\s*<\/sup>/g, '[$1]')
      .replace(/<span id="ref-\d+"><\/span>/g, '')
      .replace(/<\/?(sup|sub)>/g, '')
      // site-relative links become absolute
      .replace(/\]\(\//g, `](${this.base}/`);
  }).join('').replace(/\n{3,}/g, '\n\n').trim();
}

hexo.extend.generator.register('projects-txt', function (locals) {
  const config = this.config;
  const base = config.url.replace(/\/$/, '');
  const dataDir = path.join(this.source_dir, 'data');
  const posts = locals.posts.sort('-date').filter(p => p.published !== false);
  const url = p => `${base}/${p.path.replace(/^\//, '')}`;

  const lines = [
    `# ${config.title}`,
    '',
    oneLine(config.description),
    '',
    `Author: ${config.author}`,
    `Site: ${base}/`,
    `Feed: ${base}/atom.xml`,
    `Source: ${config.code_url}`,
    `Projects: ${posts.length}`,
    '',
  ];

  const about = locals.pages.findOne({ source: 'about/index.md' });
  if (about) {
    lines.push('## About', '', postText.call({ base }, about.raw, dataDir), '');
  }

  lines.push('## Index', '');
  posts.forEach((p, i) => {
    lines.push(`${i + 1}. ${oneLine(p.title)} (${p.date.format('YYYY-MM-DD')})`);
    lines.push(`   ${url(p)}`);
    if (p.description) lines.push(`   ${oneLine(p.description)}`);
  });
  lines.push('');

  posts.forEach(p => {
    lines.push('', '='.repeat(80), '');
    lines.push(`# ${oneLine(p.title)}`, '');
    lines.push(`Date: ${p.date.format('YYYY-MM-DD')}`);
    lines.push(`URL: ${url(p)}`);
    if (p.tags && p.tags.length) lines.push(`Tags: ${p.tags.map(t => t.name).join(', ')}`);
    if (p.code) lines.push(`Code: ${p.code}`);
    if (p.description) lines.push(`Summary: ${oneLine(p.description)}`);
    lines.push('', postText.call({ base }, p.raw, dataDir), '');
  });

  return { path: 'projects.txt', data: lines.join('\n') };
});
