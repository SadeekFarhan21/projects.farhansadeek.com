interface FileIcon {
  icon: string;
  color: string;
}

const SPECIAL_FILENAMES: Record<string, FileIcon> = {
  'package.json':  { icon: '⬡', color: '#CC3A26' },
  'tsconfig.json': { icon: '⬡', color: '#3178C6' },
  '.gitignore':    { icon: '◈', color: '#F54D27' },
  '.env':          { icon: '⚙', color: '#ECD53F' },
  'readme.md':     { icon: '◉', color: '#083FA1' },
  'dockerfile':    { icon: '◈', color: '#2496ED' },
};

const EXT_ICONS: Record<string, FileIcon> = {
  // TypeScript / JavaScript
  ts:    { icon: 'TS', color: '#3178C6' },
  tsx:   { icon: 'TS', color: '#3178C6' },
  js:    { icon: 'JS', color: '#F7DF1E' },
  jsx:   { icon: 'JS', color: '#F7DF1E' },
  mjs:   { icon: 'JS', color: '#F7DF1E' },

  // Web
  html:  { icon: '◈', color: '#E34C26' },
  css:   { icon: '◈', color: '#563D7C' },
  scss:  { icon: '◈', color: '#C6538C' },
  sass:  { icon: '◈', color: '#C6538C' },
  svg:   { icon: '◈', color: '#FFB13B' },

  // Data
  json:  { icon: '{}', color: '#CBCB41' },
  yaml:  { icon: '≡', color: '#CB171E' },
  yml:   { icon: '≡', color: '#CB171E' },
  toml:  { icon: '≡', color: '#9C4221' },
  xml:   { icon: '◈', color: '#E37933' },

  // Languages
  py:    { icon: 'PY', color: '#3572A5' },
  rb:    { icon: 'RB', color: '#CC342D' },
  go:    { icon: 'GO', color: '#00ADD8' },
  rs:    { icon: 'RS', color: '#DEA584' },
  swift: { icon: 'SW', color: '#FA7343' },
  kt:    { icon: 'KT', color: '#A97BFF' },
  java:  { icon: 'JV', color: '#B07219' },
  cpp:   { icon: 'C+', color: '#F34B7D' },
  c:     { icon: 'C', color: '#555555' },
  cs:    { icon: 'C#', color: '#178600' },
  php:   { icon: 'PH', color: '#4F5D95' },

  // Config/other
  md:    { icon: '◉', color: '#083FA1' },
  sh:    { icon: '$_', color: '#89E051' },
  bash:  { icon: '$_', color: '#89E051' },
  lock:  { icon: '◈', color: '#858585' },
  log:   { icon: '≡', color: '#858585' },
};

const DEFAULT_ICON: FileIcon = { icon: '◈', color: '#CCCCCC' };

export function getFileIcon(filename: string): FileIcon {
  const name = filename.toLowerCase();
  const special = SPECIAL_FILENAMES[name];
  if (special) return special;

  const ext = filename.split('.').pop()?.toLowerCase();
  return EXT_ICONS[ext || ''] || DEFAULT_ICON;
}
