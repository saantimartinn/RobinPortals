'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const admin = require('../shared/contract-content.cjs');
const portal = require('../../portal/shared/contract-content.cjs');

test('Admin and Alumno show the same Mentoria price and later credit', () => {
  const priceBlocks = (variant) => variant.blocks.filter((block) =>
    /precio de la mentoría|descontarán de la primera cuota|inicio de la prestación/.test(block.text || ''));
  const adminPrice = priceBlocks(admin.VARIANTS.mentoria);
  const portalPrice = priceBlocks(portal.VARIANTS.mentoria);
  assert.deepEqual(adminPrice, portalPrice);
  const text = adminPrice.map((block) => block.text || '').join(' ');
  assert.match(text, /666,33 €/);
  assert.match(text, /descontarán de la primera cuota/);
});
