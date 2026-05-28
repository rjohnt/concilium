const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const outDir = path.resolve('/Users/openclaw/projects/concilium-worktrees/DEV-74/public/screenshots');
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const viewport = { width: 1280, height: 900 };

  try {
    // ── Screenshot 1: No filters active (button hidden) ───────────────
    console.log('Taking screenshot 1: no filters active...');
    const page1 = await browser.newPage();
    await page1.setViewport(viewport);
    await page1.goto('http://localhost:3001', { waitUntil: 'networkidle0' });
    
    const btn1 = await page1.$('[aria-label="Clear all filters"]');
    console.log('  Clear all filters button present:', btn1 !== null, '(expected: false)');
    
    await page1.screenshot({ path: path.join(outDir, 'DEV-74-no-filters.png'), fullPage: true });
    console.log('  Saved DEV-74-no-filters.png');
    await page1.close();

    // ── Screenshot 2: Filter active (button visible) ─────────────────
    console.log('Taking screenshot 2: filter active...');
    const page2 = await browser.newPage();
    await page2.setViewport(viewport);
    await page2.goto('http://localhost:3001', { waitUntil: 'networkidle0' });
    
    await page2.click('button[aria-label^="In Review"]');
    await new Promise(r => setTimeout(r, 300));
    
    const btn2 = await page2.$('[aria-label="Clear all filters"]');
    console.log('  Clear all filters button present:', btn2 !== null, '(expected: true)');
    
    await page2.screenshot({ path: path.join(outDir, 'DEV-74-filter-active.png'), fullPage: true });
    console.log('  Saved DEV-74-filter-active.png');
    await page2.close();

    console.log('\nAll screenshots saved successfully.');
  } finally {
    await browser.close();
  }
})();
