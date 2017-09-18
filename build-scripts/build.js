const co = require('co');
const colors = require('colors/safe');
const NwBuilder = require('nw-builder')
const rmrf = require('rmrf-promise');
const fs = require('co-fs-extra');

co(function*() {
    try {

        const { version } = fs.readJsonSync('package.json');

        const { platform } = process;

        const buildDir = 'build';

        console.log('Clearing build directory.');

        yield rmrf(buildDir);
        yield fs.ensureDir(buildDir);

        const nw = new NwBuilder({
            appName: 'Markdown Editor',
            macPlist: {
                CFBundleDisplayName: 'Markdown Editor',
                CFBundleName: 'Markdown Editor',
                NSHumanReadableCopyright: `https://github.com/rBurgett/markdown-editor\n\nCopyright ${new Date().getFullYear()} by Ryan Burgett.`
            },
            files: './temp/**/**',
            platforms: (platform === 'darwin') ? ['osx64'] : (platform === 'win32') ? ['win'] : ['linux'],
            version: '0.17.5',
            // flavor: 'normal',
            flavor: 'sdk',
            cacheDir: './cache',
            forceDownload: false,
            buildDir: './build',
            buildType: 'default',
            zip: false,
            winIco: (platform === 'win32') ? './images/favicon.ico' : '',
            macIcns: (platform === 'darwin') ? './images/md_icon.icns' : ''
        });

        nw.on('log', console.log);

        yield nw.build();

        console.log(colors.green(`Application successfully built! `));

    } catch(err) {
        console.error(err);
    }
});
