'use strict';
/* Dependency-free unit tests for the /demos API contract.
   Run: node builder/lib/demos-api.test.js   (exit 0 = pass)            */

const assert = require('assert');
const {
  validateConfig, buildRecord, toPublic, openapiSpec,
} = require('./demos-api');

let passed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('  PASS  ' + name); }
  catch (e) { console.error('  FAIL  ' + name + '\n        ' + e.message); process.exitCode = 1; }
}

const validConfig = () => ({
  vertical: 'fins',
  tenant: {
    name: 'Hillside',
    customerName: 'Aster Capital',
    colors: { primary: '#3FDA99' },
    systemsOfRecord: ['Salesforce FSC', 'nCino'],
  },
  story: {
    scaffold: 'onboarding',
    vignettes: ['idv-clear', 'web-forms', 'esignature'],
    narration: {
      'idv-clear': { tag: 'Identity', headline: 'Verified once', lede: 'CLEAR binds identity.',
        beats: [{ head: 'IAL2', lede: 'One verification' }] },
    },
  },
  capabilities: { idv: true, workspaces: false },
  mode: 'demo',
});

console.log('demos-api contract:');

test('valid config passes with no errors', () => {
  assert.deepStrictEqual(validateConfig(validConfig()).errors, []);
});

test('buildRecord maps vignettes -> demo: scene templates in order', () => {
  const rec = buildRecord(validConfig(), { ttlDays: 30 });
  assert.strictEqual(rec.scenes.length, 3);
  assert.deepStrictEqual(rec.scenes.map(s => s.template),
    ['demo:idv-clear', 'demo:web-forms', 'demo:esignature']);
  // narration applied where supplied
  assert.strictEqual(rec.scenes[0].headline, 'Verified once');
  assert.strictEqual(rec.scenes[0].beats[0].head, 'IAL2');
  // brand + mapping fields the player reads
  assert.strictEqual(rec.tenant, 'Hillside');
  assert.strictEqual(rec.customer, '× Aster Capital');
  assert.strictEqual(rec.tenantColor, '#3FDA99');
  assert.strictEqual(rec.sourceVertical, 'banking'); // fins -> banking pack
  assert.strictEqual(rec.usecase, 'default');        // onboarding -> default
  assert.strictEqual(rec.sor, 'Salesforce FSC · nCino');
  // round-trip config retained
  assert.strictEqual(rec._api.config.vertical, 'fins');
});

test('toPublic returns id, shareUrl, ISO expiresAt, config', () => {
  const rec = buildRecord(validConfig(), { ttlDays: 30 });
  const pub = toPublic(rec, { id: 'abc123', origin: 'https://tgk-deux.replit.app' });
  assert.strictEqual(pub.id, 'abc123');
  assert.strictEqual(pub.shareUrl, 'https://tgk-deux.replit.app/stories/custom-abc123/');
  assert.ok(/^\d{4}-\d{2}-\d{2}T/.test(pub.expiresAt), 'expiresAt is ISO');
  assert.strictEqual(pub.config.vertical, 'fins');
});

test('unknown vignette id -> structured error', () => {
  const c = validConfig(); c.story.vignettes = ['idv-clear', 'not-a-real-vignette'];
  const { errors } = validateConfig(c);
  assert.ok(errors.some(e => e.field === 'story.vignettes[1]'), JSON.stringify(errors));
});

test('missing / invalid primary color -> structured error', () => {
  const c1 = validConfig(); delete c1.tenant.colors.primary;
  assert.ok(validateConfig(c1).errors.some(e => e.field === 'tenant.colors.primary'));
  const c2 = validConfig(); c2.tenant.colors.primary = 'green';
  assert.ok(validateConfig(c2).errors.some(e => e.field === 'tenant.colors.primary'));
});

test('bad vertical -> structured error', () => {
  const c = validConfig(); c.vertical = 'space';
  assert.ok(validateConfig(c).errors.some(e => e.field === 'vertical'));
});

test('empty vignettes -> structured error', () => {
  const c = validConfig(); c.story.vignettes = [];
  assert.ok(validateConfig(c).errors.some(e => e.field === 'story.vignettes'));
});

test('discovery mode rejected (not yet a share-URL surface)', () => {
  const c = validConfig(); c.mode = 'discovery';
  assert.ok(validateConfig(c).errors.some(e => e.field === 'mode'));
});

test('legacy vignette id resolves (workspace -> workspaces)', () => {
  const c = validConfig(); c.story.vignettes = ['workspace'];
  assert.deepStrictEqual(validateConfig(c).errors, []);
  const rec = buildRecord(c, {});
  assert.strictEqual(rec.scenes[0].template, 'demo:workspaces');
});

test('non-object body -> single root error', () => {
  assert.deepStrictEqual(validateConfig(null).errors, [{ field: '(root)', message: 'Body must be a JSON object.' }]);
});

test('openapi spec is 3.1 and only lists implemented paths', () => {
  const s = openapiSpec();
  assert.strictEqual(s.openapi, '3.1.0');
  assert.deepStrictEqual(Object.keys(s.paths).sort(), ['/demos', '/demos/{id}', '/openapi.json']);
  assert.ok(s.components.securitySchemes.ApiKeyAuth);
});

console.log(`\n${passed} checks passed.`);
