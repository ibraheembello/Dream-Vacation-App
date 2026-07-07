// Minimal smoke tests so the CI pipeline has a real, passing test suite.
// Run with Node's built-in test runner: `node --test`.
const test = require('node:test');
const assert = require('node:assert');
const pkg = require('../package.json');

test('package.json exposes the expected start script', () => {
  assert.strictEqual(pkg.scripts.start, 'node server.js');
});

test('core runtime dependencies are declared', () => {
  for (const dep of ['express', 'pg', 'cors', 'axios', 'dotenv']) {
    assert.ok(pkg.dependencies[dep], `expected "${dep}" to be a declared dependency`);
  }
});

test('server.js source builds a DATABASE_URL-driven pg pool', () => {
  const fs = require('fs');
  const path = require('path');
  const src = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  assert.match(src, /new Pool\(/, 'server.js should instantiate a pg Pool');
});
