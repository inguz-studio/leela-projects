import { chromium } from '@playwright/test';
const OUT = process.argv[2];
const B = 'http://127.0.0.1:4602';
const shots = [
  { url: `${B}/?preview=castelo`, vp: { width: 1440, height: 900 }, f: 'vg-desktop.png', full: true },
  { url: `${B}/?preview=castelo`, vp: { width: 375, height: 812 }, f: 'vg-375.png', full: false },
  { url: `${B}/eventos/mock-campeche-run/lotes?preview=castelo`, vp: { width: 1440, height: 900 }, f: 'modalidades-desktop.png', full: true },
  { url: `${B}/eventos/mock-campeche-run/lotes?preview=castelo`, vp: { width: 375, height: 812 }, f: 'modalidades-375.png', full: false },
  { url: `${B}/eventos/mock-campeche-run/credenciamento?preview=castelo`, vp: { width: 1440, height: 900 }, f: 'cred-desktop.png', full: true },
];
const browser = await chromium.launch();
for (const s of shots) {
  const page = await browser.newPage({ viewport: s.vp });
  await page.goto(s.url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(8000);
  await page.screenshot({ path: `${OUT}/${s.f}`, fullPage: s.full });
  await page.close();
  console.log('ok', s.f);
}
await browser.close();
