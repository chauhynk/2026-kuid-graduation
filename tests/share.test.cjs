const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const code = fs.readFileSync(path.join(__dirname, '../js/share.js'), 'utf8');

function setup(navigator = {}) {
  const events = [];
  const context = {
    window: {}, navigator, File, Blob,
    console: { warn() {} }, setTimeout() {},
    URL: {
      createObjectURL(blob) { events.push({ type: 'blob', blob }); return 'blob:test-image'; },
      revokeObjectURL() {},
    },
    document: {
      createElement() { return { click() { events.push({ type: 'download', href: this.href, filename: this.download }); } }; },
      body: { appendChild() {}, removeChild() {} },
    },
  };
  vm.runInNewContext(code, context);
  return { manager: new context.window.ShareManager({ exhibition: { title: 'STANDBY', hashtags: [] } }), events };
}
const photo = new Blob(['captured-original-jpeg'], { type: 'image/jpeg' });

test('save invokes native sharing immediately with only the original JPEG file', async () => {
  let payload;
  const { manager, events } = setup({ canShare: () => true, share: data => { payload = data; return Promise.resolve(); } });
  const pending = manager.saveImage(photo, 'capture.jpg');
  assert.ok(payload, 'share must run before awaiting any work to retain user activation');
  assert.deepEqual(Object.keys(payload), ['files']);
  assert.equal(payload.files[0].name, 'capture.jpg');
  assert.equal(payload.files[0].type, 'image/jpeg');
  assert.equal(await payload.files[0].text(), await photo.text());
  assert.equal((await pending).method, 'web-share');
  assert.equal(events.length, 0);
});

test('cancelling the native menu does not trigger a download', async () => {
  const { manager, events } = setup({ canShare: () => true, share: async () => { throw { name: 'AbortError' }; } });
  assert.equal((await manager.saveImage(photo)).aborted, true);
  assert.equal(events.length, 0);
});

test('blocked native sharing provides a preview instead of a false success', async () => {
  const { manager, events } = setup({ canShare: () => true, share: async () => { throw { name: 'NotAllowedError' }; } });
  const result = await manager.saveImage(photo);
  assert.equal(result.method, 'preview');
  assert.equal(result.success, false);
  assert.equal(events.length, 0);
});

for (const browser of [
  { userAgent: 'Mozilla/5.0 (iPhone) Instagram 400.0', canShare: () => false, share() {} },
  { userAgent: 'Mozilla/5.0 (Android)' },
  { userAgent: 'Mozilla/5.0 (Macintosh)', platform: 'MacIntel', maxTouchPoints: 5 },
  { userAgent: 'iPhone', canShare() { throw new Error('unavailable'); }, share() {} },
]) {
  test(`unsupported mobile saving keeps the image available: ${browser.userAgent}`, async () => {
    const { manager, events } = setup(browser);
    assert.equal((await manager.saveImage(photo)).method, 'preview');
    assert.equal(events.length, 0);
    assert.equal((await manager.shareImage(photo)).method, 'preview');
    assert.equal(events.length, 0);
  });
}

test('desktop fallback downloads the original Blob and reports only a request', async () => {
  const { manager, events } = setup({ userAgent: 'Mozilla/5.0 (Macintosh)' });
  const result = await manager.saveImage(photo, 'capture.jpg');
  assert.equal(result.method, 'download');
  assert.equal(result.success, false);
  assert.equal(events[0].blob, photo);
  assert.deepEqual(events[1], { type: 'download', href: 'blob:test-image', filename: 'capture.jpg' });
});
