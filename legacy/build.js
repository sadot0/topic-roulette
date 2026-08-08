#!/usr/bin/env node
/**
 * Сборщик «Рулетки тем».
 *
 *   node build.js [папка-с-батчами]
 *
 * Читает topics-batch-*.json (результат исследовательского workflow),
 * валидирует, дедуплицирует и вставляет в app.template.html
 * между маркерами __TOPICS__ / __END_TOPICS__ → index.html
 *
 * Если батчей нет — берёт seed-topics.json, чтобы движок
 * всегда можно было запустить и проверить.
 */

const fs = require('fs');
const path = require('path');

const ROOT     = __dirname;
const TEMPLATE = path.join(ROOT, 'app.template.html');
const OUTPUT   = path.join(ROOT, 'index.html');
const SEED     = path.join(ROOT, 'seed-topics.json');

const BATCH_DIR = process.argv[2] || ROOT;

const LANGS  = ['ru', 'en', 'uz'];
// Приложение показывает только название. hook может лежать в исходных
// данных — он просто не попадает в сборку и не требуется.
const FIELDS = ['title'];
const DOMAINS = ['mind', 'economy', 'society', 'philosophy', 'systems', 'power', 'tech'];
const ERAS = ['classic', 'modern'];

const warn = [];

function collect() {
  let files = [];
  try {
    files = fs.readdirSync(BATCH_DIR)
      .filter(f => /^topics-batch-\d+\.json$/.test(f))
      .sort((a, b) => (+a.match(/\d+/)[0]) - (+b.match(/\d+/)[0]))
      .map(f => path.join(BATCH_DIR, f));
  } catch {
    /* папки нет — упадём на seed ниже */
  }

  if (!files.length) {
    console.log('· батчей не найдено, беру seed-topics.json');
    return JSON.parse(fs.readFileSync(SEED, 'utf8'));
  }

  console.log(`· найдено батчей: ${files.length}`);
  return files.flatMap(f => {
    const raw = fs.readFileSync(f, 'utf8');
    // Агент мог обернуть JSON в ```json … ``` — снимаем обёртку
    const clean = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    try {
      const arr = JSON.parse(clean);
      if (!Array.isArray(arr)) throw new Error('не массив');
      console.log(`  ${path.basename(f)} → ${arr.length}`);
      return arr;
    } catch (e) {
      warn.push(`${path.basename(f)}: не разобран (${e.message})`);
      return [];
    }
  });
}

function validate(list) {
  const seen = new Set();
  const out = [];

  for (const t of list) {
    if (!t || typeof t !== 'object') continue;

    if (!t.slug) { warn.push(`тема без slug: ${t?.ru?.title || '?'}`); continue; }
    if (seen.has(t.slug)) { warn.push(`дубликат slug: ${t.slug}`); continue; }

    if (!DOMAINS.includes(t.domain)) {
      warn.push(`${t.slug}: неизвестный domain "${t.domain}" → mind`);
      t.domain = 'mind';
    }

    if (!ERAS.includes(t.era)) {
      warn.push(`${t.slug}: неизвестная era "${t.era}" → classic`);
      t.era = 'classic';
    }

    let broken = false;
    for (const L of LANGS) {
      if (!t[L] || typeof t[L] !== 'object') {
        warn.push(`${t.slug}: нет языка ${L} — тема пропущена`);
        broken = true;
        break;
      }
      for (const F of FIELDS) {
        if (typeof t[L][F] !== 'string' || !t[L][F].trim()) {
          warn.push(`${t.slug}: пустое ${L}.${F} — тема пропущена`);
          broken = true;
          break;
        }
      }
      if (broken) break;
    }
    if (broken) continue;

    seen.add(t.slug);
    out.push({
      slug: t.slug,
      domain: t.domain,
      era: t.era,
      ru: pick(t.ru), en: pick(t.en), uz: pick(t.uz),
    });
  }
  return out;
}

const pick = o => ({ title: o.title.trim() });

function build() {
  const topics = validate(collect());

  if (!topics.length) {
    console.error('✗ нет ни одной валидной темы — сборка остановлена');
    process.exit(1);
  }

  const byDomain = topics.reduce((a, t) => (a[t.domain] = (a[t.domain] || 0) + 1, a), {});
  const byEra = topics.reduce((a, t) => (a[t.era] = (a[t.era] || 0) + 1, a), {});
  const longTitles = topics
    .flatMap(t => LANGS.map(L => ({ slug: t.slug, L, n: t[L].title.length })))
    .filter(x => x.n > 32);

  const tpl = fs.readFileSync(TEMPLATE, 'utf8');
  const marker = /\/\*__TOPICS__\*\/[\s\S]*?\/\*__END_TOPICS__\*\//;
  if (!marker.test(tpl)) {
    console.error('✗ в шаблоне нет маркеров __TOPICS__');
    process.exit(1);
  }

  // </script> внутри данных разорвал бы тег — экранируем
  const json = JSON.stringify(topics).replace(/<\//g, '<\\/');
  const html = '<!doctype html>\n' + tpl.replace(
    marker,
    `/*__TOPICS__*/${json}/*__END_TOPICS__*/`
  );

  fs.writeFileSync(OUTPUT, html, 'utf8');

  console.log('');
  console.log(`✓ index.html — ${topics.length} тем, ${(html.length / 1024).toFixed(0)} КБ`);
  console.log('  ' + DOMAINS.map(d => `${d}:${byDomain[d] || 0}`).join('  '));
  console.log(`  классика:${byEra.classic || 0}  2020-е:${byEra.modern || 0}`);
  // Длинный заголовок ломает крупную вёрстку — предупреждаем заранее
  if (longTitles.length) {
    console.log(`  ⚠ длинных заголовков (>32 симв.): ${longTitles.length}`);
    longTitles.slice(0, 6).forEach(x => console.log(`     ${x.slug} [${x.L}] ${x.n}`));
  }
  if (warn.length) {
    console.log('');
    console.log(`⚠ замечаний: ${warn.length}`);
    warn.slice(0, 25).forEach(w => console.log('  · ' + w));
    if (warn.length > 25) console.log(`  … и ещё ${warn.length - 25}`);
  }
}

build();
