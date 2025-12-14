const fs = require('fs');
const axios = require('axios');
const path = require('path');
const { exec } = require('child_process');
const { Plugin } = require('../DataBase/plugin');

function extractNpmModules(code) {
    const regex = /require\s*\(\s*['"]([^\.\/][^'"]*)['"]\s*\)/g;
    const modules = new Set();
    let match;
    while ((match = regex.exec(code)) !== null) modules.add(match[1]);
    const packageJsonPath = path.resolve(__dirname, '../package.json');
    let packageJson;
    try { packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8')); } catch { packageJson = {}; }
    const deps = packageJson.dependencies || {};
    const devDeps = packageJson.devDependencies || {};
    return Array.from(modules).filter(m => !deps[m] && !devDeps[m]);
}

async function installModules(modules) {
    if (!modules.length) return;
    return new Promise((resolve, reject) => {
        const cmd = `npm install ${modules.join(' ')}`;
        exec(cmd, { cwd: path.resolve(__dirname, '../') }, (error, stdout, stderr) => {
            if (error) reject(stderr || stdout || error.message);
            else resolve(stdout);
        });
    });
}

async function installpg() {
    const pluginsDir = path.join(__dirname, "../plugins");
    if (!fs.existsSync(pluginsDir)) fs.mkdirSync(pluginsDir, { recursive: true });
    const plugins = await Plugin.findAll();
    for (const { name, url } of plugins) {
        const filePath = path.join(pluginsDir, `${name}.js`);
        try {
            if (!fs.existsSync(filePath)) {
                const code = (await axios.get(url)).data;
                fs.writeFileSync(filePath, code);
                const missingModules = extractNpmModules(code);
                if (missingModules.length) await installModules(missingModules);
            }
        } catch {}
    }
}

const reloadCommands = async () => {
    const commandes = fs.readdirSync(path.join(__dirname, "../cmd"))
        .filter(f => path.extname(f).toLowerCase() === ".js");

    for (const fichier of commandes) {
        await delay(100);
        const modulePath = path.join(__dirname, "../cmd", fichier);
        delete require.cache[require.resolve(modulePath)];
        require(modulePath);
    }

    const pluginsDir = path.join(__dirname, "../plugins");
    if (fs.existsSync(pluginsDir)) {
        const pluginsFiles = fs.readdirSync(pluginsDir)
            .filter(f => path.extname(f).toLowerCase() === ".js");

        for (const fichier of pluginsFiles) {
            await delay(100);
            const modulePath = path.join(pluginsDir, fichier);
            delete require.cache[require.resolve(modulePath)];
            require(modulePath);
        }
    }
};

module.exports = { extractNpmModules, installModules, installpg, reloadCommands };

