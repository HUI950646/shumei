import { chromium } from 'file:///F:/ShuMei/多模态融合监控中枢-可转发完整包-20261019/web/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' });
try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  await page.addInitScript(() => {
    const clear = CanvasRenderingContext2D.prototype.clearRect;
    CanvasRenderingContext2D.prototype.clearRect = function(...args) {
      if (this.canvas.dataset.view === 'camera') window.cameraPaint = { texts: [], boxes: [] };
      return clear.apply(this, args);
    };
    const fillText = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function(...args) {
      if (this.canvas.dataset.view === 'camera') window.cameraPaint.texts.push(args[0]);
      return fillText.apply(this, args);
    };
    const strokeRect = CanvasRenderingContext2D.prototype.strokeRect;
    CanvasRenderingContext2D.prototype.strokeRect = function(...args) {
      if (this.canvas.dataset.view === 'camera') window.cameraPaint.boxes.push(args);
      return strokeRect.apply(this, args);
    };
    const draw = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function(...args) {
      if (this.canvas.dataset.view === 'camera' && args[0] instanceof HTMLImageElement && args.length === 5)
        window.overviewCameraDraw = { x: args[1], y: args[2], w: args[3], h: args[4], canvasWidth: this.canvas.clientWidth, canvasHeight: this.canvas.clientHeight };
      if (this.canvas.dataset.view === 'risk' && args[0] instanceof HTMLCanvasElement && args.length === 5) {
        const transform = this.getTransform();
        window.overviewRiskDraw = { scaleX: Math.hypot(transform.a, transform.b), scaleY: Math.hypot(transform.c, transform.d) };
      }
      return draw.apply(this, args);
    };
  });
  const errors = [], sockets = [], imageRequests = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('websocket', socket => sockets.push(socket.url()));
  page.on('request', request => {
    if (/\/api\/live\/camera\/\d+\.jpg/.test(request.url())) imageRequests.push(request.url());
  });
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => {
    const store = document.querySelector('#app').__vue_app__?.config.globalProperties.$pinia?._s.get('cockpit');
    return store?.frame.source === 'live' && store.frame.riskField && store.frame.cameraFrame &&
      document.querySelector('canvas[data-view="camera"]')?.dataset.cameraSequence;
  }, null, { timeout: 45000 });
  assert.equal(await page.getByRole('tab', { name: /总览/ }).getAttribute('aria-selected'), 'true');
  assert.equal(await page.locator('canvas[data-view]').count(), 3);
  await page.waitForTimeout(3000);
  await page.waitForFunction(() => window.cameraPaint?.boxes.length > 0);
  const cameraPaint = await page.evaluate(() => window.cameraPaint);
  assert.deepEqual(cameraPaint.texts, [], 'camera draws only detection boxes, including on the selected target');
  const cover = await page.evaluate(() => window.overviewCameraDraw);
  assert.ok(cover.x <= 0 && cover.y <= 0 && cover.w >= cover.canvasWidth - 1 && cover.h >= cover.canvasHeight - 1);
  assert.ok(Math.abs(cover.w / cover.h - 800 / 448) < .01, 'camera fills without geometric stretching');
  assert.equal(await page.locator('canvas[data-view="risk"]').getAttribute('data-framing'), 'metric');
  const riskTransform = await page.evaluate(() => window.overviewRiskDraw);
  assert.ok(Math.abs(riskTransform.scaleX - riskTransform.scaleY) < .0001, 'risk heatmap uses square metres, no axis stretching');
  await page.getByRole('button', { name: '完整画面', exact: true }).click();
  await page.waitForTimeout(150);
  const contain = await page.evaluate(() => window.overviewCameraDraw);
  assert.ok(contain.x >= -1 && contain.y >= -1 && contain.w <= contain.canvasWidth + 1 && contain.h <= contain.canvasHeight + 1);
  await page.getByRole('button', { name: '铺满画面', exact: true }).click();
  assert.equal(new Set(imageRequests).size, imageRequests.length, 'one image decoder, no duplicate fetches from radar/risk panes');
  const initialImageRequestCount = imageRequests.length;
  const metrics = await page.locator('.global-metrics [data-value]').allTextContents();
  assert.ok(metrics.every(value => value.trim() === '—' || Number(value) >= 0), 'animated values never extrapolate below zero');
  const evidence = await page.evaluate(() => {
    const store = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('cockpit');
    const frame = store.frame;
    return { source: frame.source, radarState: frame.live.radar.state, cameraState: frame.live.camera.state,
      radarCycles: frame.live.radar.cycles, cameraSequence: frame.cameraFrame.sequence,
      fieldScope: frame.riskField.scope, fieldPeak: Math.max(...frame.riskField.values), fieldBounds: frame.bounds,
      views: [...document.querySelectorAll('canvas[data-view]')].map(c => c.dataset.view) };
  });
  await page.getByRole('button', { name: '冻结实时显示' }).click();
  await page.waitForTimeout(500);
  const frozenSequence = await page.locator('canvas[data-view="camera"]').getAttribute('data-camera-sequence');
  await page.waitForTimeout(500);
  assert.equal(await page.locator('canvas[data-view="camera"]').getAttribute('data-camera-sequence'), frozenSequence);
  assert.equal(await page.getByText('显示已暂停', { exact: true }).count(), 3);
  const selectionPoint = await page.evaluate(() => {
    const store = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('cockpit');
    const canvas = document.querySelector('canvas[data-view="camera"]'), rect = canvas.getBoundingClientRect();
    const minimap = document.querySelector('.radar-minimap').getBoundingClientRect(), box = window.overviewCameraDraw;
    const targets = store.frame.targets.filter(t => t.camera).sort((a,b) => Number(a.id === store.selectedId) - Number(b.id === store.selectedId));
    const bounds = t => {
      const [x,y,w,h] = t.camera.bbox;
      return { x: box.x + x*box.w, y: box.y + y*box.h, w: w*box.w, h: h*box.h };
    };
    for (const target of targets) {
      const b = bounds(target), x = Math.max(0,b.x) + (Math.min(canvas.clientWidth,b.x+b.w)-Math.max(0,b.x))/2;
      const y = Math.max(0,b.y) + (Math.min(canvas.clientHeight,b.y+b.h)-Math.max(0,b.y))/2;
      if (x < 8 || x > canvas.clientWidth-8 || y < 50 || y > canvas.clientHeight-70) continue;
      const px = rect.x+x*rect.width/canvas.clientWidth, py = rect.y+y*rect.height/canvas.clientHeight;
      if (px >= minimap.x && px <= minimap.right && py >= minimap.y && py <= minimap.bottom) continue;
      const expected = [...targets].reverse().find(t => {
        const r = bounds(t);return x >= r.x-4 && x <= r.x+r.w+4 && y >= r.y-4 && y <= r.y+r.h+4;
      });
      if (expected && expected.id !== store.selectedId) return {x:px,y:py,id:expected.id};
    }
  });
  assert.ok(selectionPoint, 'a visible camera box outside the minimap is available');
  await page.mouse.click(selectionPoint.x, selectionPoint.y);
  assert.equal(await page.locator('canvas[data-view="camera"]').getAttribute('data-selected-target'), selectionPoint.id, 'boxes remain selectable without labels');
  const expectedCenter = await page.evaluate(() => {
    const f = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('cockpit').frame.riskField;
    const col = (f.width-1)/2, row = (f.height-1)/2;
    const x = Math.floor(col), y = Math.floor(row), u = col-x, v = row-y;
    return (f.values[y*f.width+x]*(1-u)*(1-v)+f.values[y*f.width+x+1]*u*(1-v)
      +f.values[(y+1)*f.width+x]*(1-u)*v+f.values[(y+1)*f.width+x+1]*u*v).toFixed(3);
  });
  const riskBox = await page.locator('canvas[data-view="risk"]').boundingBox();
  await page.mouse.move(riskBox.x+riskBox.width/2, riskBox.y+riskBox.height/2);
  await page.waitForTimeout(100);
  assert.ok((await page.locator('.overview-risk .field-tooltip').textContent()).includes(expectedCenter), 'field hover matches the resized plot');
  await page.mouse.move(0, 0);
  await page.getByRole('button', { name: '继续实时显示' }).click();
  await page.waitForFunction(seq => document.querySelector('canvas[data-view="camera"]').dataset.cameraSequence !== seq, frozenSequence);
  for (const [mode, title] of [['radar', '雷达探测'], ['camera', '摄像头感知'], ['risk', '风险场']]) {
    await page.getByRole('button', { name: '展开' + title }).click();
    assert.equal(await page.locator('canvas[data-view]').count(), 1);
    assert.equal(await page.locator('canvas[data-view]').getAttribute('data-view'), mode);
    if (mode === 'camera') {
      await page.waitForFunction(() => window.cameraPaint?.boxes.length > 0 && document.querySelector('canvas[data-view="camera"]').dataset.cameraSequence);
      assert.deepEqual(await page.evaluate(() => window.cameraPaint.texts), [], 'expanded camera also has no detection labels');
    }
    await page.getByRole('tab', { name: /总览/ }).click();
    assert.equal(await page.locator('canvas[data-view]').count(), 3);
  }
  await page.waitForFunction(() => document.querySelector('canvas[data-view="camera"]').dataset.cameraSequence);
  await page.screenshot({ path: fileURLToPath(new URL('./三路总览-1920.png', import.meta.url)), fullPage: true });
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.waitForTimeout(600);
  const boxes = await page.locator('.overview-card').evaluateAll(cards => cards.map(card => {
    const r = card.getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
  }));
  assert.ok(boxes.every(b => b.x >= 0 && b.y >= 0 && b.right <= 1366 && b.bottom <= 768 && b.width > 400 && b.height > 150));
  const [camera, risk] = boxes;
  assert.ok(risk.x > camera.right && Math.abs(risk.y - camera.y) < 1 && Math.abs(risk.bottom - camera.bottom) < 1, 'camera and risk each occupy a full half');
  assert.ok(Math.abs(risk.width - camera.width) < 1, 'equal width halves');
  const minimap = await page.locator('.radar-minimap').boundingBox();
  const cameraViewport = await page.locator('canvas[data-view="camera"]').boundingBox();
  assert.ok(minimap.x > cameraViewport.x && minimap.y > cameraViewport.y && minimap.x-cameraViewport.x < 20 && minimap.y-cameraViewport.y < 20, 'minimap overlays the top left of the camera');
  assert.ok(minimap.width < cameraViewport.width*.4 && minimap.height < cameraViewport.height*.4, 'minimap leaves most of the camera unobstructed');
  assert.ok(await page.evaluate(() => {
    const radar = document.querySelector('.radar-minimap canvas').getBoundingClientRect();
    return document.elementFromPoint(radar.x+radar.width/2, radar.y+radar.height/2)?.dataset.view === 'radar';
  }), 'minimap receives its own pointer events above the camera');
  await page.screenshot({ path: fileURLToPath(new URL('./三路总览-1366.png', import.meta.url)), fullPage: true });
  assert.equal(sockets.length, 1, 'all views and tab switches share one WebSocket');
  assert.deepEqual(errors, []);
  const report = { checkedAt: new Date().toISOString(), ...evidence, websocketCount: sockets.length,
    initialImageRequests: initialImageRequestCount, compactCardBounds: boxes, minimap, cameraCover: cover, cameraComplete: contain, cameraBoxCount: cameraPaint.boxes.length, cameraLabelCount: cameraPaint.texts.length, selectionPoint, riskTransform, fieldCenter: expectedCenter, metrics, errors };
  await writeFile(new URL('./三路总览验证-20261020.json', import.meta.url), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally { await browser.close(); }
