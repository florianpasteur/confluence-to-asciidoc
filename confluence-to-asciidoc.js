#!/usr/bin/env node

const {hideBin} = require('yargs/helpers');
const spawn = require('@npmcli/promise-spawn');
const fs = require('fs/promises');
const {existsSync} = require('fs');
const yargs = require('yargs');
const path = require('path');
const os = require('os');
const {launchBrowser} = require("./libs/utils");

(async function () {

    const options = await yargs(hideBin(process.argv))
        .option('import', {
            type: 'string',
            description: 'url of the page to import',
        })
        .option('output', {
            type: 'string',
            description: 'file output to save',
        })
        .option('login', {
            type: 'boolean',
            description: 'run login mechanism',
            default: false,
        })
        .parseAsync();

    if (!existsSync(path.join(__dirname, 'auth.json')) || options.login) {
        console.log("It seems that you're not login to confluence")
        console.log("We're going to open a page for you that you can login. Once done please close the browser.")
        await spawn('npm', ["run", "login", "--", options.import], {
            cwd: __dirname,
            stdioString: true,
            stdio: 'pipe',
        });
    }

    const {page, browser} = await launchBrowser({headed: false, devtools: false});

    await page.goto(options.import);
    const contentSelector = await page.locator('#content').first();

    const tmpHtml = path.join(os.tmpdir(), 'tmp.html');
    await fs.writeFile(tmpHtml, await contentSelector.innerHTML())

    await browser.close();

    // pandoc --wrap=none -f html -t asciidoc myfile.html > myfile.adoc
    const pandoc = await spawn('pandoc/bin/pandoc', ["--wrap=none", "-f", "html", "-t", "asciidoc", tmpHtml], {
        cwd: __dirname,
        stdioString: true,
        stdio: 'pipe'
    });

    await fs.writeFile(options.output, pandoc.stdout)
})()
