/*
 * Capture a client storefront for the case study laptop mockups.
 *
 * Why this exists: the screens placed in the Figma case-study file are too low
 * resolution to use. Figma downscales any placed image whose longest side goes
 * over 4096px, so a tall full-page screenshot loses width in proportion to its
 * height — Karma & Luck's came out 1088x4096 for a slot that needs 1810 wide,
 * and no export setting can put that detail back.
 *
 * The brand template shows the laptop screen at 905 CSS px, so 1440x900 at
 * deviceScaleFactor 2 gives 2880x1800 — about 3x what the slot needs, and the
 * same 16:10 the mockup expects.
 *
 * Caveat worth repeating to whoever asks for these: this captures the site as it
 * is today, not as it was when the case study was written. Promotions, prices and
 * products will differ from the design.
 *
 * Usage: edit PAGES, then `node tools/capture-screens.js`.
 */
const puppeteer = require('puppeteer-core');

// ?country=US puts the store in its US market, so prices read in dollars like the
// design does rather than the rupees a request from here gets by default.
const PAGES = [
  ['kl-live-home.png', 'https://www.karmaandluck.com/?country=US'],
  ['kl-live-plp.png',  'https://www.karmaandluck.com/collections/womens-earrings?country=US'],
  ['kl-live-pdp.png',  'https://www.karmaandluck.com/products/skyward-grace-hamsa-dangle-earrings?country=US'],
];

(async () => {
  const b = await puppeteer.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: 'new', args: ['--window-size=1440,900']
  });
  for (const [out, url] of PAGES) {
    const p = await b.newPage();
    await p.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });
    await p.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
    await p.goto(url, { waitUntil: 'networkidle2', timeout: 120000 });
    await p.evaluate(async () => {
      const wait = ms => new Promise(r => setTimeout(r, ms));
      for (let y = 0; y < 3200; y += 250) { window.scrollTo(0, y); await wait(260); }
      window.scrollTo(0, 0);
      await wait(1500);
      const kill = ['[id*="popup" i]', '[class*="popup" i]', '[class*="modal" i]',
                    '[id*="cookie" i]', '[class*="cookie" i]', '[class*="newsletter" i]',
                    '[class*="overlay" i]', '[role="dialog"]', 'iframe[id*="attentive" i]',
                    '[class*="drawer" i]'];
      for (const s of kill) {
        document.querySelectorAll(s).forEach(el => {
          const st = getComputedStyle(el);
          if (st.position === 'fixed' || st.position === 'absolute') el.style.display = 'none';
        });
      }
      await wait(600);
    });
    // only count what is actually on screen — the capture is the viewport, not the page
    const pending = await p.evaluate(() => [...document.images]
      .filter(i => i.getBoundingClientRect().top < 900 && i.getBoundingClientRect().bottom > 0)
      .filter(i => !i.complete || i.naturalWidth === 0).length);
    await p.screenshot({ path: out });
    console.log(out, 'captured, unloaded images in frame:', pending);
    await p.close();
  }
  await b.close();
})();
