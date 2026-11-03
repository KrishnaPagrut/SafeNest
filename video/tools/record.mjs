// Records each demo beat as its own 1920x1080 clip. Each clip = one browser context, so the
// video file starts when the context opens. Marks (seconds since context open) go to marks.json.
import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'
const OUT = '/Users/krishnapagrut/Developer/SafeNest/video/assets/rec'
const BASE = 'http://localhost:5173'
const browser = await chromium.launch()
const marks = {}

async function clip(name, fn) {
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, recordVideo: { dir: OUT, size: { width: 1920, height: 1080 } } })
  const t0 = Date.now()
  const page = await ctx.newPage()
  const m = []
  const mark = (label) => m.push({ label, t: (Date.now() - t0) / 1000 })
  await fn(page, mark)
  mark('end')
  const v = page.video()
  await ctx.close()
  const p = await v.path()
  fs.renameSync(p, path.join(OUT, `${name}.webm`))
  marks[name] = m
  console.log(name, JSON.stringify(m))
}

const wait = (page, ms) => page.waitForTimeout(ms)
// A visible cursor so clicks read on camera.
const cursorCss = `
  #hf-cursor{position:fixed;z-index:99999;width:26px;height:26px;pointer-events:none;transform:translate(-4px,-2px);
  background:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path d='M5 3l14 9-6 1.5L16 20l-2.5 1-3-6.5L6 18z' fill='%23f2ece2' stroke='%231c1a17' stroke-width='1.5'/></svg>") no-repeat;}`
async function arm(page) {
  await page.addStyleTag({ content: cursorCss })
  await page.evaluate(() => { const c = document.createElement('div'); c.id = 'hf-cursor'; document.body.appendChild(c)
    document.addEventListener('mousemove', (e) => { c.style.left = e.clientX + 'px'; c.style.top = e.clientY + 'px' }) })
}
async function glideClick(page, locator, mark, label) {
  const box = await locator.boundingBox()
  const x = box.x + box.width / 2, y = box.y + Math.min(box.height / 2, 24)
  await page.mouse.move(x - 160, y + 90)
  await page.mouse.move(x, y, { steps: 18 })
  await wait(page, 250)
  mark(label)
  await page.mouse.click(x, y)
}
async function review(page) {
  await page.goto(`${BASE}/review/mock_before`); await arm(page)
  await wait(page, 21000)
}

await clip('upload', async (page, mark) => {
  await page.goto(`${BASE}/`); await arm(page); await page.mouse.move(600, 500); await wait(page, 1500)
  mark('loaded')
  await glideClick(page, page.getByText('Try the sample walkthrough').first(), mark, 'click-demo')
  await wait(page, 1200); mark('review-start')
  await wait(page, 22000); mark('review-done')
  await wait(page, 1500)
})

await clip('rejected', async (page, mark) => {
  await review(page); mark('ready')
  await glideClick(page, page.getByText('Loose stair handrail'), mark, 'click-rejected')
  await wait(page, 5000)
})

await clip('track', async (page, mark) => {
  await review(page); mark('ready')
  await glideClick(page, page.getByText('Loose throw rug in the hallway'), mark, 'click-rug')
  await wait(page, 1800)
  await glideClick(page, page.getByText('Track in video'), mark, 'click-track')
  await wait(page, 2400); mark('tracking')
  await wait(page, 6000)
})

await clip('needs-check', async (page, mark) => {
  await review(page); mark('ready')
  await glideClick(page, page.getByText('Bathtub with no grab bar'), mark, 'click-tub')
  await wait(page, 4500)
})

await clip('fixed', async (page, mark) => {
  await review(page); mark('ready')
  await glideClick(page, page.getByText('Loose throw rug in the hallway'), mark, 'click-rug')
  await wait(page, 1200)
  await glideClick(page, page.getByText('Show it fixed'), mark, 'click-fixed')
  await wait(page, 2400); mark('preview')
  const slider = page.getByLabel('Reveal the fixed room')
  const b = await slider.boundingBox()
  const y = b.y + b.height / 2
  await page.mouse.move(b.x + b.width * 0.5, y); await page.mouse.down()
  for (let i = 0; i <= 30; i++) { await page.mouse.move(b.x + b.width * (0.5 - 0.42 * i / 30), y); await wait(page, 40) }
  for (let i = 0; i <= 30; i++) { await page.mouse.move(b.x + b.width * (0.08 + 0.84 * i / 30), y); await wait(page, 40) }
  await page.mouse.up(); mark('slid')
  await wait(page, 2000)
})

await clip('compare', async (page, mark) => {
  await page.goto(`${BASE}/compare/mock_after/mock_before`); await arm(page); await page.mouse.move(900, 700); await wait(page, 1500)
  mark('loaded')
  const s = page.getByLabel('Scrub both walkthroughs'); const b = await s.boundingBox(); const y = b.y + b.height / 2
  await page.mouse.move(b.x + b.width * (4 / 24), y, { steps: 10 }); await page.mouse.down()
  for (let i = 0; i <= 40; i++) { await page.mouse.move(b.x + b.width * (4 / 24 + (8 / 24) * i / 40), y); await wait(page, 50) }
  await page.mouse.up(); mark('scrubbed')
  await wait(page, 800)
  await glideClick(page, page.getByText('Extension cord across the walking path'), mark, 'click-still')
  await wait(page, 3500)
  await glideClick(page, page.getByText('Shoes left on the stairs'), mark, 'click-fixed')
  await wait(page, 3000)
})

await clip('report', async (page, mark) => {
  await page.goto(`${BASE}/report/mock_before`); await arm(page); await page.mouse.move(1200, 600); await wait(page, 1500)
  mark('loaded'); await wait(page, 4000)
})

fs.writeFileSync(path.join(OUT, 'marks.json'), JSON.stringify(marks, null, 2))
await browser.close()
