import {Browser, Page} from '@playwright/test';
import {chromium} from 'playwright';

export async function launchBrowser(options: {headed: boolean, devtools: boolean}) {
    const chrome: Browser = await chromium.launch({
        headless: !(options.headed || Boolean(process.env.HEADED)),
        devtools: options.devtools || Boolean(process.env.DEVTOOLS),
    });
    const context = await chrome.newContext({storageState: __dirname + '/../auth.json'});
    const otherTab: Page = await context.newPage();
    const page: Page = await context.newPage();
    const browser = context.browser();
    await page.setViewportSize({
        width: 1900,
        height: 1080,
    });
    return {page, otherTab, browser, context};
}

export async function wait(time: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, time))
}
