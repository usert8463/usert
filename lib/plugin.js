const fs = require('fs');
const axios = require('axios');
const path = require('path');
const { exec } = require('child_process');
let evt = require("../lib/ovlcmd");
const { Plugin } = require('../DataBase/plugin');

function extractNpmModules(code) {
    const regex = /require\s*\(\s*['"]([^\.\/][^'"]*)['"]\s*\)/g;
    const modules = new Set();
    let match;

    while ((match = regex.exec(code)) !== null) {
        modules.add(match[1]);
    }

    let pkg = {};
    try {
        pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf-8'));
    } catch {}

    const deps = pkg.dependencies || {};
    const devDeps = pkg.devDependencies || {};

    return [...modules].filter(m => !deps[m] && !devDeps[m]);
}

function installModules(modules) {
    if (!modules.length) return Promise.resolve();

    return new Promise((resolve, reject) => {
        exec(
            `npm install ${modules.join(' ')}`,
            { cwd: path.resolve(__dirname, '../'), stdio: 'inherit' },
            err => err ? reject(err) : resolve()
        );
    });
}

async function installpg() {
    const pluginsDir = path.join(__dirname, "../plugins");
    if (!fs.existsSync(pluginsDir)) fs.mkdirSync(pluginsDir, { recursive: true });

    const plugins = await Plugin.findAll();

    for (const { name, url } of plugins) {
        const filePath = path.join(pluginsDir, `${name}.js`);
        if (fs.existsSync(filePath)) continue;

        try {
            const code = (await axios.get(url)).data;
            fs.writeFileSync(filePath, code);

            const missing = extractNpmModules(code);
            if (missing.length) await installModules(missing);
        } catch {}
    }
}

async function reloadCommands() {
    if (!Array.isArray(evt.cmd)) return;

    evt.cmd.length = 0;

    const loadDir = dir => {
        if (!fs.existsSync(dir)) return;
        for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.js'))) {
            const p = path.join(dir, file);
            try {
                delete require.cache[require.resolve(p)];
                require(p);
            } catch {}
        }
    };

    loadDir(path.join(__dirname, "../cmd"));
    loadDir(path.join(__dirname, "../plugins"));
}

module.exports = {
    extractNpmModules,
    installModules,
    installpg,
    reloadCommands
};
