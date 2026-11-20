import { chromium } from 'file:///F:/ShuMei/多模态融合监控中枢-可转发完整包-20261019/web/node_modules/playwright/index.mjs';
import { writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const label = process.argv[2] ?? 'baseline';
const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' });
try {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  const slowImageMs = Number(process.argv[3] ?? 0);
  let activeImages=0, maxActiveImages=0;
  if(slowImageMs)await page.route('**/api/live/camera/*.jpg',async route=>{
    activeImages++;maxActiveImages=Math.max(maxActiveImages,activeImages);
    await new Promise(resolve=>setTimeout(resolve,slowImageMs));
    try{await route.continue();}finally{activeImages--;}
  });
  await page.addInitScript(() => {
    window.cameraTiming = { stamps: {}, displayed: [], ages: [], sequence: null, errors: [] };
    const NativeWebSocket = window.WebSocket;
    window.WebSocket = class extends NativeWebSocket {
      constructor(...args) {
        super(...args);
        this.addEventListener('message', event => {
          try {
            const f = JSON.parse(event.data);
            if (f.vision) window.cameraTiming.stamps[f.vision.sequence] = Date.parse(f.vision.captured_utc);
          } catch {}
        });
      }
    };
    const draw = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function(...args) {
      if (this.canvas.dataset.view === 'camera' && args[0] instanceof HTMLImageElement) {
        const sequence = /\/camera\/(\d+)\.jpg/.exec(args[0].src)?.[1], data = window.cameraTiming;
        const stamp = data.stamps[sequence];
        if (stamp) {
          const now = Date.now(), ageMs = now - stamp;
          if (data.sequence !== sequence) {
            data.displayed.push({ sequence: Number(sequence), now, ageMs });
            data.sequence = sequence;
          }
          data.ages.push(ageMs);
        }
      }
      return draw.apply(this, args);
    };
  });
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.cameraTiming.displayed.length > 3);
  await page.evaluate(() => { window.cameraTiming.displayed = []; window.cameraTiming.ages = []; });
  await page.waitForTimeout(15000);
  const data = await page.evaluate(() => window.cameraTiming);
  const stats = values => {
    const sorted = [...values].sort((a,b) => a-b);
    return { count: sorted.length, mean: Math.round(values.reduce((a,b)=>a+b,0)/values.length),
      p50: sorted[Math.floor(sorted.length*.5)], p95: sorted[Math.floor(sorted.length*.95)], max: sorted.at(-1) };
  };
  const status = await (await fetch('http://127.0.0.1:3001/api/live/status')).json();
  const report = { checkedAt:new Date().toISOString(), label, scope:'Local post-decode timestamp to browser paint; excludes camera encoder/network/decoder buffering',
    firstPaintAgeMs:stats(data.displayed.map(d=>d.ageMs)), displayedAgeMs:stats(data.ages),
    displayedFps: +(data.displayed.length/15).toFixed(2), slowImageMs, maxActiveImages,
    frameGapMs:stats(data.displayed.slice(1).map((d,i)=>d.now-data.displayed[i].now)), camera:status.camera };
  await writeFile(new URL(`./camera-latency-${label}.json`,import.meta.url),JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
  if(slowImageMs){
    assert.ok(report.displayedFps>2,'slow image loads still produce fresh frames instead of starving');
    assert.ok(maxActiveImages<=1,'there is at most one in-flight image request');
    assert.ok(report.firstPaintAgeMs.p95<700,'old frames do not accumulate behind newer ones');
  }
} finally { await browser.close(); }
