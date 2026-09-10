const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');

(async () => {
  const root = path.resolve(__dirname, '..');
  const browser = await chromium.launch({headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  const page = await browser.newPage();
  await page.route('https://chatgpt.com/**', route => route.fulfill({contentType:'text/html', body:'<main><div id="conversation-header-actions"><div><button data-testid="share-chat-button">Share</button></div></div></main>'}));
  await page.goto('https://chatgpt.com/c/6aa023af-8a24-83ed-8e28-7229f939f99c');
  await page.evaluate(() => { window.TapBridge = {request: async (handler, args) => { window.__requests.push({handler,args}); return {message:'done'}; }}; window.__requests=[]; });
  await page.addScriptTag({content: fs.readFileSync(path.join(root, 'chatgpt-ui.js'), 'utf8')});
  await page.addScriptTag({content: fs.readFileSync(path.join(root, 'feature.js'), 'utf8')});
  await page.click('[data-cgq-id="tap-chatgpt-files-reveal"]');
  await page.click('[data-cgq-id="tap-chatgpt-files-copy-path"]');
  const result = await page.evaluate(() => ({requests:window.__requests, icons:[...document.querySelectorAll('[data-cgq-id^="tap-chatgpt-files-"] svg')].map(x => ({width:x.getAttribute('width'),stroke:x.getAttribute('stroke'),hidden:x.getAttribute('aria-hidden')})), order:[...document.querySelector('#conversation-header-actions').children].map(x => x.querySelector?.('[data-testid="share-chat-button"]') ? 'share' : x.dataset.cgqId)}));
  assert.deepEqual(result.requests.map(x => [x.handler,x.args.action]), [['chatgpt.files','reveal'],['chatgpt.files','copy_path']]);
  assert.deepEqual(result.icons, [{width:'18',stroke:'currentColor',hidden:'true'},{width:'18',stroke:'currentColor',hidden:'true'}]);
  assert.deepEqual(result.order, ['tap-chatgpt-files-reveal','tap-chatgpt-files-copy-path','share']);
  await browser.close();
  console.log('browser fixture OK');
})().catch(error => { console.error(error); process.exit(1); });
