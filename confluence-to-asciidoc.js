#!/usr/bin/env node

const {hideBin} = require('yargs/helpers');
const spawn = require('@npmcli/promise-spawn');
const fs = require('fs/promises');
const yargs = require('yargs');

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
        .parseAsync();

    // pandoc --wrap=none -f html -t asciidoc myfile.html > myfile.adoc
    const pandoc = await spawn('pandoc/bin/pandoc', ["--wrap=none", "-f", "html", "-t", "asciidoc", options.import], {
        cwd: __dirname, // defaults to process.cwd()
        stdioString: true, // stdout/stderr as strings rather than buffers
        stdio: 'pipe', // any node spawn stdio arg is valid here
        // any other arguments to node child_process.spawn can go here as well,
    });

    await fs.writeFile(options.output, pandoc.stdout)
})()
