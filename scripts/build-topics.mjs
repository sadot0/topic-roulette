#!/usr/bin/env node
/**
 * Собирает банки тем из батчей в data/*.json.
 *
 *   node scripts/build-topics.mjs
 *
 * В отличие от старого build.js СОХРАНЯЕТ поле hook — оно написано
 * на трёх языках и показывается после речи.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SRC = process.env.TOPICS_SRC
  || '/private/tmp/claude-501/-Users-admin-Desktop------------/9f843165-059a-41aa-9a7d-a6a3aa64f43f/scratchpad';

const LANGS = ['ru', 'en', 'uz'];
const DEEP_DOMAINS = ['mind','economy','society','philosophy','systems','power','tech','culture'];
const QUICK_DOMAINS = [
  'objects','routine','city','memory','people','digital',
  'food','money','work','home','road','childhood',
  'relations','body','clothes','holiday','nature','habits',
];
const ERAS = ['classic','modern'];

const warn = [];

function readBatches(prefixes) {
  const list = Array.isArray(prefixes) ? prefixes : [prefixes];
  let files = [];
  try {
    files = fs.readdirSync(SRC)
      .filter(f => list.some(p => new RegExp(`^${p}-\\d+\\.json$`).test(f)))
      .sort((a, b) => (+a.match(/\d+/)[0]) - (+b.match(/\d+/)[0]))
      .map(f => path.join(SRC, f));
  } catch { return []; }

  return files.flatMap(f => {
    const raw = fs.readFileSync(f, 'utf8').trim()
      .replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    try {
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr)) throw new Error('не массив');
      console.log(`  ${path.basename(f)} → ${arr.length}`);
      return arr;
    } catch (e) {
      warn.push(`${path.basename(f)}: ${e.message}`);
      return [];
    }
  });
}

function validate(list, bank) {
  const domains = bank === 'deep' ? DEEP_DOMAINS : QUICK_DOMAINS;
  const seen = new Set();
  const out = [];

  for (const t of list) {
    if (!t?.slug) { warn.push(`${bank}: тема без slug`); continue; }
    if (seen.has(t.slug)) { warn.push(`${bank}: дубликат ${t.slug}`); continue; }

    if (!domains.includes(t.domain)) {
      warn.push(`${bank}/${t.slug}: домен "${t.domain}" → ${domains[0]}`);
      t.domain = domains[0];
    }
    if (bank === 'deep' && !ERAS.includes(t.era)) {
      warn.push(`${t.slug}: era "${t.era}" → classic`);
      t.era = 'classic';
    }

    let broken = false;
    for (const L of LANGS) {
      const loc = t[L];
      if (!loc?.title?.trim()) { warn.push(`${t.slug}: нет ${L}.title`); broken = true; break; }
      if (!loc?.hook?.trim()) warn.push(`${t.slug}: нет ${L}.hook`);
    }
    if (broken) continue;

    seen.add(t.slug);
    const pick = o => ({ title: o.title.trim(), hook: (o.hook || '').trim() });
    out.push({
      slug: t.slug,
      bank,
      domain: t.domain,
      ...(bank === 'deep' ? { era: t.era } : {}),
      ru: pick(t.ru), en: pick(t.en), uz: pick(t.uz),
    });
  }
  return out;
}

function build(prefixes, bank, outFile) {
  console.log(`\n· ${bank}:`);
  const raw = readBatches(prefixes);
  if (!raw.length) { console.log('  батчей нет — пропускаю'); return 0; }

  const topics = validate(raw, bank);
  fs.writeFileSync(path.join(ROOT, 'data', outFile), JSON.stringify(topics, null, 1), 'utf8');

  const byDomain = topics.reduce((a, t) => (a[t.domain] = (a[t.domain] || 0) + 1, a), {});
  const withHook = topics.filter(t => LANGS.every(L => t[L].hook)).length;
  console.log(`  ✓ data/${outFile} — ${topics.length} тем, с hook на всех языках: ${withHook}`);
  console.log('    ' + Object.entries(byDomain).map(([k, v]) => `${k}:${v}`).join('  '));
  return topics.length;
}

/* Оба поколения: первые 66 тем и новые 96 по топикам.
   Дубликаты по slug отсеет валидатор */
const deep = build(['topics-batch', 'deep2-batch', 'deep3-batch'], 'deep', 'topics.deep.json');
const quick = build(['quick-batch', 'quick2-batch'], 'quick', 'topics.quick.json');

if (warn.length) {
  console.log(`\n⚠ замечаний: ${warn.length}`);
  warn.slice(0, 20).forEach(w => console.log('  · ' + w));
  if (warn.length > 20) console.log(`  … и ещё ${warn.length - 20}`);
}
console.log(`\nИтого: deep ${deep} · quick ${quick}`);
