const fs = require('fs');
const path = require('path');
const { delay, DisconnectReason, jidDecode } = require("@whiskeysockets/baileys");
const { execSync } = require("child_process");
let evt = require("../lib/ovlcmd");
const pkg = require('../package');
const config = require("../set");
const { manage_env } = require("../lib/manage_env");
const { installpg } = require("../lib/plugin");

const realConsoleLog = console.log;

const decodeJid = (jid) => {
  if (!jid) return jid;
  if (/:\d+@/gi.test(jid)) {
    const d = jidDecode(jid) || {};
    return (d.user && d.server && `${d.user}@${d.server}`) || jid;
  }
  return jid;
};

async function installMissingDependencies() {
  const pkgJson = require('../package.json');
  const dependencies = { ...pkgJson.dependencies, ...pkgJson.devDependencies };
  const missing = [];

  for (const dep of Object.keys(dependencies)) {
    try {
      require.resolve(dep);
    } catch {
      missing.push(dep);
    }
  }

  if (missing.length > 0) {
    console.log(`⚙️ Installation des modules manquants : ${missing.join(", ")}`);
    try {
      execSync(`npm install ${missing.join(" ")}`, { stdio: "inherit" });
      console.log("✅ Modules manquants installés avec succès.");
    } catch (e) {
      console.error("❌ Erreur lors de l'installation des modules :", e);
    }
  }
}

async function connection_update(con, ovl, main, startNextSession = null) {
  const { connection, lastDisconnect } = con;

  switch (connection) {
    case "connecting":
      console.log("🌍 Connexion en cours...");
      break;

    case "open":
      console.log(`
╭─────────────────╮
│                      
│    🎉  OVL BOT ONLINE 🎉    
│                      
╰─────────────────╯
`);

      console.log("🔄 Synchronisation des variables d'environnement...");
      await manage_env();
      console.log("✅ Variables synchronisées.");

      await installpg();

      // Vérifier et installer les dépendances manquantes
      await installMissingDependencies();

      const commandes = fs.readdirSync(path.join(__dirname, "../cmd"))
        .filter(f => path.extname(f).toLowerCase() === ".js");

      console.log("📂 Chargement des commandes :");
      for (const fichier of commandes) {
        await delay(100);
        const cmdPath = path.join(__dirname, "../cmd", fichier);
        try {
          delete require.cache[require.resolve(cmdPath)];
          require(cmdPath);
          console.log(`  ✓ ${fichier}`);
        } catch (e) {
          console.log(`  ✗ ${fichier} — erreur : ${e.message}`);
        }
        console.log = realConsoleLog;
      }

      const pluginsDir = path.join(__dirname, "../plugins");
      if (fs.existsSync(pluginsDir)) {
        const pluginsFiles = fs.readdirSync(pluginsDir)
          .filter(f => path.extname(f).toLowerCase() === ".js");

        console.log("📂 Chargement des plugins :");
        for (const fichier of pluginsFiles) {
          await delay(100);
          const pluginPath = path.join(pluginsDir, fichier);
          try {
            delete require.cache[require.resolve(pluginPath)];
            require(pluginPath);
            console.log(`  ✓ ${fichier}`);
          } catch (e) {
            console.log(`  ✗ ${fichier} — erreur : ${e.message}`);
          }
          console.log = realConsoleLog;
        }
      }

      await delay(1000);

      const start_msg = `╭───〔 🤖 𝙊𝙑𝙇 𝘽𝙊𝙏 〕───⬣
│ ߷ *Etat*       ➜ Connecté ✅
│ ߷ *Préfixe*    ➜ ${config.PREFIXE}
│ ߷ *Mode*       ➜ ${config.MODE}
│ ߷ *Commandes*  ➜ ${evt.cmd.length}
│ ߷ *Version*    ➜ ${pkg.version}
│ ߷ *Développeur*➜ Ainz
╰──────────────⬣`;

      await ovl.sendMessage(decodeJid(ovl.user.id), {
        text: start_msg,
        contextInfo: {
          forwardingScore: 1,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: '120363371282577847@newsletter',
            newsletterName: 'OVL-MD-V2'
          }
        }
      });

      await delay(10000);
      if (startNextSession) await startNextSession();
      break;

    case "close":
      const code = lastDisconnect?.error?.output?.statusCode;
      if (code === DisconnectReason.loggedOut) {
        console.log("⛔ Déconnecté : Session terminée.");
      } else {
        console.log("⚠️ Connexion perdue, tentative de reconnexion...");
        await delay(5000);
        main();
      }
      break;

    default:
  }
}

module.exports = connection_update;
