// Automated checks for faq knowledge test; external services should remain outside this test boundary.
const test = require('node:test');
const assert = require('node:assert/strict');
const { FAQ_ITEMS, FAQ_TEXT } = require('../lib/faq-knowledge');
const { extractFaqCitations, formatFaqKnowledge } = require('../lib/faq-citations');

test('las FAQs oficiales están normalizadas, completas y ordenadas', () => {
  assert.equal(FAQ_ITEMS.length, 56);
  assert.deepEqual(FAQ_ITEMS.map((faq) => faq.sort_order), Array.from({ length: 56 }, (_, index) => index + 1));
  assert.ok(FAQ_ITEMS.every((faq) => faq.question.endsWith('?')));
  assert.ok(FAQ_ITEMS.every((faq) => faq.answer && faq.category));
  assert.ok(!FAQ_TEXT.includes('🔄'));
  assert.ok(!FAQ_TEXT.includes('4. Tasas universitarias y coste de estudiar'));
});

test('las FAQs oficiales se organizan en las ocho categorías previstas', () => {
  assert.deepEqual([...new Set(FAQ_ITEMS.map((faq) => faq.category))], [
    'Universidades y sistema educativo',
    'Admisión y requisitos',
    'Costes y financiación',
    'Visados y trámites',
    'Alojamiento',
    'Salud y vida práctica',
    'Vida estudiantil',
    'Trabajo y futuro profesional',
  ]);
});

test('las citas de la IA se validan y se convierten en metadatos enlazables', () => {
  const parsed = extractFaqCitations('Consulta esta información. [[FAQ:23]] [[FAQ:999]] [[FAQ:23]]');
  assert.equal(parsed.content, 'Consulta esta información.');
  assert.deepEqual(parsed.citations, [{
    number: 23,
    question: FAQ_ITEMS[22].question,
    category: FAQ_ITEMS[22].category,
  }]);
  assert.match(formatFaqKnowledge(), /\[\[FAQ:23\]\]\nPregunta: ¿Cuánto cuesta la matrícula/);
});
