#!/usr/bin/env node
/**
 * Сборка под GitHub Pages.
 *
 *   node scripts/build-pages.mjs
 *
 * Кладёт статику в docs/ — оттуда её раздаёт Pages.
 * Middleware в статике не работает, поэтому корневой редирект
 * на язык делается обычным HTML.
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const BASE = '/topic-roulette';

console.log('· сборка…');
execSync('npx next build', {
  stdio: 'inherit',
  env: { ...process.env, DEPLOY_TARGET: 'pages' },
});

const out = path.join(ROOT, 'out');
const docs = path.join(ROOT, 'docs');
if (!fs.existsSync(out)) {
  console.error('✗ папки out/ нет — экспорт не выполнился');
  process.exit(1);
}

fs.rmSync(docs, { recursive: true, force: true });
fs.cpSync(out, docs, { recursive: true });

/* Без этого файла Pages прогоняет всё через Jekyll и выкидывает
   папки, начинающиеся с подчёркивания, — то есть весь _next */
fs.writeFileSync(path.join(docs, '.nojekyll'), '');

/* Корень: middleware недоступен, поэтому язык выбирается
   на клиенте, а до этого стоит честный редирект для тех,
   у кого JS выключен */
fs.writeFileSync(
  path.join(docs, 'index.html'),
  `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>Рулетка тем</title>
<meta name="robots" content="noindex">
<link rel="canonical" href="${BASE}/ru/">
<meta http-equiv="refresh" content="0; url=${BASE}/ru/">
<script>
  var m = { ru:'ru', en:'en', uz:'uz' };
  var want = (navigator.language || 'ru').slice(0,2).toLowerCase();
  location.replace('${BASE}/' + (m[want] || 'ru') + '/');
</script>
</head>
<body style="background:#171620"></body>
</html>
`,
  'utf8',
);

const pages = fs.readdirSync(docs).filter((f) => !f.startsWith('.') && !f.startsWith('_'));
console.log(`\n✓ docs/ готова — ${pages.join(', ')}`);
console.log(`  https://sadot0.github.io${BASE}/`);
