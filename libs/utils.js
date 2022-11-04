const playwright = require('playwright');

async function launchBrowser(options) {
    const chrome = await playwright.chromium.launch({
        headless: !(options.headed || Boolean(process.env.HEADED)),
        devtools: options.devtools || Boolean(process.env.DEVTOOLS),
        downloadsPath: options.output
    });
    const context = await chrome.newContext({storageState: __dirname + '/../auth.json'});
    const page = await context.newPage();
    const browser = context.browser();
    await page.setViewportSize({
        width: 1900,
        height: 1080,
    });
    return {page, browser, context};
}

async function wait(time) {
    return new Promise(resolve => setTimeout(resolve, time))
}

module.exports = {launchBrowser, wait};
