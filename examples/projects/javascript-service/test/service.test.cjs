const { test } = require('node:test');
const assert = require('node:assert/strict');
const { greeting } = require('../src/service.cjs');
test('service preserves the requested recipient', () => {
  assert.equal(greeting('operator'), 'Hello, operator!');
});
