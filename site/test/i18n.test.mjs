import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { t, setLanguage, getLanguage, getLocale, setTranslationsEnabled, subscribeLanguage } from '../../packages/i18n/language.js';

const require = createRequire(import.meta.url);
const english = JSON.parse(readFileSync(new URL('../../packages/i18n/en.json', import.meta.url)));

test('switches copy and formatting without changing interface parameters or unknown client content', () => {
  setLanguage('es');
  assert.equal(t('Hola, {0}', ['Ana']), 'Hola, Ana');
  assert.equal(t('  Pagos\n'), '  Pagos\n');
  setLanguage('en');
  assert.equal(getLocale(), 'en-GB');
  assert.equal(t('Hola, {0}', ['Ana']), 'Hi, Ana');
  assert.equal(t('  Pagos\n'), '  Payments\n');
  assert.equal(t('Ana Fernández'), 'Ana Fernández');
  assert.equal(t('Mi mensaje personal'), 'Mi mensaje personal');
  assert.equal(t(null), null);
  const element = { type: 'span' };
  assert.equal(t(element), element);
  assert.equal(t('constructor'), 'constructor');
  assert.equal(new Intl.DateTimeFormat(getLocale(), { month: 'long', timeZone: 'UTC' }).format(new Date('2026-11-23')), 'November');
  setLanguage('es');
  assert.equal(getLocale(), 'es-ES');
});

test('notifies mounted components and keeps administration Spanish without losing the client preference', () => {
  let changes = 0;
  const unsubscribe = subscribeLanguage(() => changes++);
  setLanguage('en');
  assert.equal(t('Pagos'), 'Payments');
  setTranslationsEnabled(false);
  assert.equal(t('Pagos'), 'Pagos');
  assert.equal(getLanguage(), 'es');
  setTranslationsEnabled(true);
  assert.equal(t('Pagos'), 'Payments');
  setLanguage('fr');
  assert.equal(getLanguage(), 'en');
  assert.equal(changes, 3);
  unsubscribe();
  setLanguage('es');
});

test('shares a persisted language across portal loads and handles storage changes or blocked storage', async () => {
  const values = new Map();
  const events = [];
  const savedWindow = globalThis.window;
  const savedDocument = globalThis.document;
  globalThis.document = { documentElement: { lang: 'es' } };
  globalThis.window = {
    localStorage: { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) },
    addEventListener: (name, callback) => events.push(callback),
  };
  try {
    const firstPortal = await import('../../packages/i18n/language.js?portal');
    firstPortal.setLanguage('en');
    const secondPortal = await import('../../packages/i18n/language.js?community');
    assert.equal(secondPortal.getLanguage(), 'en');
    assert.equal(document.documentElement.lang, 'en');
    values.set(firstPortal.LANGUAGE_KEY, 'es');
    events.forEach(callback => callback({ key: firstPortal.LANGUAGE_KEY }));
    assert.equal(firstPortal.getLanguage(), 'es');
    assert.equal(secondPortal.getLanguage(), 'es');
    values.clear();
    events.forEach(callback => callback({ key: null }));
    assert.equal(secondPortal.getLanguage(), 'es');
    Object.defineProperty(window, 'localStorage', { get() { throw new Error('Storage disabled'); } });
    const privatePortal = await import('../../packages/i18n/language.js?private');
    assert.equal(privatePortal.getLanguage(), 'es');
    privatePortal.setLanguage('en');
    assert.equal(privatePortal.t('Pagos'), 'Payments');
  } finally {
    if (savedWindow === undefined) delete globalThis.window; else globalThis.window = savedWindow;
    if (savedDocument === undefined) delete globalThis.document; else globalThis.document = savedDocument;
  }
});

test('catalogue covers every questionnaire label while retaining the original answer values and branches', async () => {
  for (const app of ['portal', 'robinjr']) {
    const questions = await import(`../../apps/${app}/portal-source/src/questionnaire-data.js`);
    for (const block of [questions.Q_GENERAL, questions.Q_VOCACIONAL, ...Object.values(questions.Q_AREAS), ...questions.Q_MASTER_BLOCKS]) {
      assert.ok(english[block.title], block.title);
      for (const question of block.questions) {
        for (const key of ['q', 'hint', 'left', 'right']) {
          const copy = question[key];
          if (copy && /[a-z]/i.test(copy)) assert.ok(Object.hasOwn(english, copy), copy);
        }
        for (const option of question.options || []) {
          const copy = typeof option === 'string' ? option : option.label;
          if (!/^(?:[ABC][12]|\d|Online|Marketing|Visual|Digital|Audiovisual|Conceptual|Freelance|Software|Networking|Civil|Industrial)$/.test(copy)) {
            assert.ok(Object.hasOwn(english, copy), copy);
          }
        }
      }
    }
    const certified = questions.Q_GENERAL.questions.find(question => question.id === 'g_certificado_nombre');
    assert.equal(certified.when.value, 'Sí');
    const { ACADEMIC_SYSTEMS } = require(`../../apps/${app}/shared/academic-systems.cjs`);
    for (const system of ACADEMIC_SYSTEMS) {
      for (const item of [system, ...system.levels]) assert.ok(Object.hasOwn(english, item.label), item.label);
    }
  }
});

test('covers built-in FAQs and contracts and preserves every interpolation placeholder', () => {
  for (const app of ['portal', 'robinjr']) {
    for (const faq of require(`../../apps/${app}/shared/portal-faqs.json`)) {
      for (const field of ['question', 'answer', 'category']) assert.ok(english[faq[field]], faq[field]);
    }
    const { VARIANTS, contractVariant } = require(`../../apps/${app}/shared/contract-content.cjs`);
    for (const variant of [...Object.values(VARIANTS), contractVariant('general', false, 'general-legacy-1700')]) {
      const copy = [variant.title, variant.acceptanceFooter, ...variant.blocks.flatMap(block => [block.text, ...(block.items || [])])].filter(Boolean);
      for (const text of copy) assert.ok(english[text.replace(/\s+/g, ' ').trim()], text);
    }
  }
  for (const [spanish, translated] of Object.entries(english)) {
    const slots = text => (text.match(/\{\{[A-Z_]+\}\}|\{\d+\}/g) || []).sort();
    assert.deepEqual(slots(translated), slots(spanish), spanish);
  }
});
