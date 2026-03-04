const assert = require('assert');
const {
  cleanUrl,
  normalizeUrlForCompare,
  isCollectibleUrl,
  escapeCsvCell,
} = require('../url_utils.js');

function test(name, fn) {
  try {
    fn();
    process.stdout.write(`PASS ${name}\n`);
  } catch (err) {
    process.stderr.write(`FAIL ${name}\n${err.stack}\n`);
    process.exitCode = 1;
  }
}

test('cleanUrl strips tracking params and keeps business params', () => {
  const input = 'https://example.com/path?utm_source=x&foo=1&gclid=abc';
  const output = cleanUrl(input);
  assert.strictEqual(output, 'https://example.com/path?foo=1');
});

test('normalizeUrlForCompare normalizes host, default port, root slash, and query order', () => {
  const a = normalizeUrlForCompare('HTTPS://EXAMPLE.COM:443/?b=2&a=1');
  const b = normalizeUrlForCompare('https://example.com?a=1&b=2');
  assert.strictEqual(a, b);
});

test('isCollectibleUrl only allows http/https', () => {
  assert.strictEqual(isCollectibleUrl('https://example.com'), true);
  assert.strictEqual(isCollectibleUrl('http://example.com'), true);
  assert.strictEqual(isCollectibleUrl('chrome://settings'), false);
  assert.strictEqual(isCollectibleUrl('javascript:alert(1)'), false);
  assert.strictEqual(isCollectibleUrl('data:text/html,abc'), false);
});

test('escapeCsvCell quotes content and mitigates formula injection', () => {
  assert.strictEqual(escapeCsvCell('https://example.com'), '"https://example.com"');
  assert.strictEqual(escapeCsvCell('=HYPERLINK("https://evil")'), '"\'=HYPERLINK(""https://evil"")"');
  assert.strictEqual(escapeCsvCell('hello "world"'), '"hello ""world"""');
});
