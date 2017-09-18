const co = require('co');
const colors = require('colors/safe');
const rmrf = require('rmrf-promise');
const path = require('path');
const fs = require('co-fs-extra');

co(function*() {
    try {

        const tempDir = 'temp';

        console.log('Clearing temp directory.');

        yield rmrf(tempDir);
        yield fs.ensureDir(tempDir);

        const filesToCopy = [
            'css',
            'dist',
            'fonts',
            'images',
            'index.html',
            'LICENSE',
            'package.json',
            'package-lock.json',
            'preview.html'
        ];

        console.log('Copying build files and folders:');

        for(const file of filesToCopy) {
            yield fs.copy(file, path.join(tempDir, file));
            console.log(`+ ${file}`);
        }

        console.log(colors.green('All files successfully copied'));

    } catch(err) {
        console.error(err);
    }
});
