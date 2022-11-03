const playwright = require('playwright');

async function launchBrowser() {
    const chrome = await playwright.chromium.launch({headless: false, devtools: true});
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
