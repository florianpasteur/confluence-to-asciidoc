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
            description: 'path to save the files',
        })
        .option('login', {
            type: 'boolean',
            description: 'run login mechanism',
            default: false,
        })
        .option('headed', {
            type: 'boolean',
            description: 'run with headed browser',
            default: false,
        })
        .option('devtools', {
            type: 'boolean',
            description: 'run with open devtools browser',
            default: false,
        })
        .parseAsync();


    if (!options.import.match(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi)) {
        console.error("url is not valid: --import", options.import);
        process.exit(1);
    }

    if (!existsSync(options.output)) {
        console.error("folder does not exist: --output", options.output);
        process.exit(1);
    }

    let stats = await fs.lstat(options.output);
    if (!(stats.isDirectory())) {
        console.error("path provided is not a folder: --output", options.output);
        process.exit(1);
    }

    if (!existsSync(path.join(__dirname, 'auth.json')) || options.login) {
        console.log("It seems that you're not login to confluence")
        console.log("We're going to open a page for you that you can login. Once done please close the browser.")
        await spawn('npm', ["run", "login", "--", options.import], {
            cwd: __dirname,
            stdioString: true,
            stdio: 'pipe',
        });
    }

    const {page, browser} = await launchBrowser(options);

    await page.goto(options.import);
    const titleSelector = await page.locator('#title-text').first();
    const contentSelector = await page.locator('#content').first();

    const kebabCase = string => {
        return string.replace(/\W+/g, " ")
            .split(/ +/)
            .map(word => word.toLowerCase())
            .join('-');
    };
    const title = await titleSelector.innerText();

    const tmpHtml = path.join(os.tmpdir(), 'tmp.html');
    await fs.writeFile(tmpHtml, await contentSelector.innerHTML())

    await browser.close();

    // pandoc --wrap=none -f html -t asciidoc myfile.html > myfile.adoc
    const pandoc = await spawn('pandoc/bin/pandoc', ["--wrap=none", "-f", "html", "-t", "asciidoc", tmpHtml], {
        cwd: __dirname,
        stdioString: true,
        stdio: 'pipe'
    });

    await fs.writeFile(path.join(options.output, `${kebabCase(title)}.adoc`), pandoc.stdout)
})()
