const fs = require('fs');
const axios = require('axios');
const path = require('path');
const { exec } = require('child_process');
const { Plugin } = require('../DataBase/plugin');

function extractNpmModules(code) {
  const regex = /require\s*\(\s*['"]([^\.\/][^'"]*)['"]\s*\)/g;
  const modules = new Set();
  let match;

  while ((match = regex.exec(code)) !== null) {
    modules.add(match[1]);
  }

  const packageJsonPath = path.resolve(__dirname, '../package.json');
  let packageJson;
  try {
    packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  } catch {
    packageJson = {};
  }

  const deps = packageJson.dependencies || {};
  const devDeps = packageJson.devDependencies || {};

  const toInstall = Array.from(modules).filter(m => !deps[m] && !devDeps[m]);
  return toInstall;
}

async function installModules(modules) {
  if (modules.length === 0) return;

  return new Promise((resolve, reject) => {
    const cmd = `npm install ${modules.join(' ')}`;
    exec(cmd, { cwd: path.resolve(__dirname, '../') }, (error, stdout, stderr) => {
      if (error) {
        reject(stderr || stdout || error.message);
      } else {
        resolve(stdout);
      }
    });
  });
}

async function installpg() {
    const pluginsDir = path.join(__dirname, "../plugins");

    if (!fs.existsSync(pluginsDir)) fs.mkdirSync(pluginsDir, { recursive: true });

    console.log("📦 Chargement des plugins...\n");

    const plugins = await Plugin.findAll();

    for (const { name, url } of plugins) {
        const filePath = path.join(pluginsDir, `${name}.js`);
        try {
            if (!fs.existsSync(filePath)) {
                const res = await axios.get(url);
                await fs.promises.writeFile(filePath, res.data);
            }
            console.log(`√ ${name}`);
        } catch {
            console.log(`✗ ${name}`);
        }
    }

    console.log("\n✅ Chargement des plugins terminé.");
}

module.exports = { extractNpmModules, installModules, installpg };
