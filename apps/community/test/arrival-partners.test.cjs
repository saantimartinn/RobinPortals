const test = require('node:test');
const assert = require('node:assert/strict');
const { partnersForArrival } = require('../backend/lib/arrival-partners');
const english = require('../../../packages/i18n/en.json');
const names = ['CJP', 'Revolut', 'The Social Hub', 'Linkmaas', 'The Circo', 'Student Experience', 'Scope Maastricht', 'Hispania Groningen', 'Swapfiets', 'Translayte', 'British Council'];

test('the eleven Llegada partners have brief translated descriptions and the requested priority without altering stored content', () => {
  const rows = Object.freeze(names.map((name, id) => Object.freeze({ id, name, description: 'Descripción gestionada por el equipo', benefits: 'Beneficio existente', sort_order: id, products: ['pack_llegada'] })));
  const result = partnersForArrival(rows);
  assert.deepEqual(result.map(p => p.name), ['Translayte', 'Revolut', 'The Social Hub', 'British Council', 'CJP', 'Linkmaas', 'The Circo', 'Student Experience', 'Scope Maastricht', 'Hispania Groningen', 'Swapfiets']);
  assert.equal(result.length, rows.length);
  for (const partner of result) {
    assert.ok(partner.arrival_description.length >= 100 && partner.arrival_description.length <= 150, partner.name);
    assert.ok(english[partner.arrival_description], partner.name);
    assert.equal(partner.arrival_description.split('. ').length, 2);
    assert.equal(partner.description, rows[partner.id].description);
    assert.equal(partner.benefits, rows[partner.id].benefits);
    assert.equal(partner.sort_order, rows[partner.id].sort_order);
    assert.ok(!Object.hasOwn(rows[partner.id], 'arrival_description'));
  }
  assert.deepEqual(rows.map(p => p.name), names);
});

test('Revolut and TSH expose no contact or booking URL in Llegada, including known spelling variants', () => {
  for (const name of ['Revolut', ' REVOLUT ', 'The Social Hub', 'Social Hub', 'TSH']) {
    const original = { name, contact_url: 'https://partner.example/contact', booking_url: 'https://partner.example/book' };
    const [partner] = partnersForArrival([original]);
    assert.equal(partner.contact_url, null);
    assert.equal(partner.booking_url, null);
    assert.equal(partner.link_unavailable, true);
    assert.equal(original.contact_url, 'https://partner.example/contact');
    assert.equal(original.booking_url, 'https://partner.example/book');
  }
});

test('other links, referral parameters, discounts and unrecognised partners retain their data and relative order', () => {
  const rows = [{ name: 'Future partner', description: 'Contenido propio', contact_url: 'https://partner.example' }, { name: 'Swapfiets', discount: 'ROBIN', contact_url: 'https://swapfiets.nl/students' }, { name: 'Translayte', contact_url: 'https://translayte.com/certified-translations?ref=281516' }, { name: 'Other partner', description: 'Otra descripción' }];
  const result = partnersForArrival(rows);
  assert.equal(result[0].contact_url, rows[2].contact_url);
  assert.deepEqual(result.slice(1).map(p => p.name), ['Future partner', 'Swapfiets', 'Other partner']);
  assert.deepEqual(result[1], rows[0]);
  assert.equal(result[2].discount, 'ROBIN');
  assert.equal(result[2].contact_url, rows[1].contact_url);
  assert.deepEqual(partnersForArrival([]), []);
});
