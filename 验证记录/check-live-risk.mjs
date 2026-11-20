import { chromium } from 'file:///F:/ShuMei/多模态融合监控中枢-可转发完整包-20261019/web/node_modules/playwright/index.mjs';
import { writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' });
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('#app').__vue_app__?.config.globalProperties.$pinia?._s.get('cockpit')?.frame.source === 'live');
  await page.getByRole('tab', { name: /风险场/ }).click();
  await page.waitForFunction(() => {
    const store = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('cockpit');
    return store?.frame.riskField?.values.some(v => v > .1) && store.frame.targets.some(t => t.radar && t.risk);
  }, null, { timeout: 45000 });
  // Freeze only this test client's display, so the evidence pairs the field and targets.
  await page.evaluate(() => {
    const store = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('cockpit');
    store.playing = false;
  });
  await page.waitForTimeout(500);
  const report = await page.evaluate(() => {
    const store = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('cockpit');
    const f = store.frame;
    return {
      checkedAt: new Date().toISOString(), source: f.source, live: f.live,
      field: { width: f.riskField.width, height: f.riskField.height, scope: f.riskField.scope,
        model: f.riskField.model, peak: Math.max(...f.riskField.values),
        nonzero: f.riskField.values.filter(v => v > 0).length, timestamp: f.riskField.timestamp },
      radarTargets: f.targets.filter(t => t.radar).map(t => ({ id: t.id, radar: t.radar, risk: t.risk })),
      unassociatedVisualRisk: f.targets.filter(t => t.camera && !t.radar).some(t => t.risk !== undefined),
    };
  });
  assert.equal(await page.locator('canvas[data-view="risk"]').getAttribute('data-field-scope'), 'radar_only');
  assert.equal(report.source, 'live');
  assert.equal(report.live.radar.state, 'streaming');
  assert.ok(report.field.peak > 0 && report.field.peak <= 1);
  assert.equal(report.unassociatedVisualRisk, false);
  assert.deepEqual(errors, []);
  await page.screenshot({ path: fileURLToPath(new URL('./实时风险场修复-20261020.png', import.meta.url)), fullPage: true });
  await writeFile(new URL('./实时风险场验证-20261020.json', import.meta.url), JSON.stringify({ ...report, errors }, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
