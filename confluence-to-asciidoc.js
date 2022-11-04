#!/usr/bin/env node

const {hideBin} = require('yargs/helpers');
const spawn = require('@npmcli/promise-spawn');
const fs = require('fs/promises');
const {existsSync} = require('fs');
const yargs = require('yargs');
const path = require('path');
const os = require('os');
const {launchBrowser, wait} = require("./libs/utils");

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


    const kebabCase = string => {
        return string.replace(/\W+/g, " ")
            .split(/ +/)
            .map(word => word.toLowerCase())
            .join('-');
    };
    const titleSelector = await page.locator('#title-text').first();
    const title = kebabCase(await titleSelector.innerText()) || 'confluence-page';

    await page.evaluate(async () => {
        const download = async (url, name, i) => {
            console.log("ddd");
            new Promise(resolve =>  {
                setTimeout(() => {
                    const a = document.createElement('a');

                    a.download = name;
                    a.href = url;
                    a.style.display = 'none';
                    a.target = '_blank';
                    document.body.append(a);
                    a.click();

                    console.log("Download");

                    resolve();
                }, i * 30);
            })
        };

        const jobs = []
        document.querySelectorAll('#content img').forEach((image, index) => {
            const filename = index + ".png";
            jobs.push(download(image.src, filename, index))
            //image.src = './' + filename;
        })

        return await Promise.all(jobs);
    });

    const nbOfImgs = await page.locator('#content img').count();
    await wait(nbOfImgs * 60);
    const contentSelector = await page.locator('#content').first();


    const tmpHtml = path.join(os.tmpdir(), 'tmp.html');
    const rawHtml = await contentSelector.innerHTML();
    // const downloadedFiles = await fs.readdir(options.output);
    // for (const file of downloadedFiles.filter(name => name.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/))) {
    //     console.log(file);
    //     const src = new RegExp(`src="blob:.*${file}.*"`).exec(rawHtml);
    //   //  await fs.rename(path.join(options.output, file), )
    // }
    await fs.writeFile(tmpHtml, rawHtml)

    await browser.close();

    // pandoc --wrap=none -f html -t asciidoc myfile.html > myfile.adoc
    const pandoc = await spawn('pandoc/bin/pandoc', ["--wrap=none", "-f", "html", "-t", "asciidoc", tmpHtml], {
        cwd: __dirname,
        stdioString: true,
        stdio: 'pipe'
    });

    await fs.writeFile(path.join(options.output, `${kebabCase(title)}.adoc`), pandoc.stdout)
})()
