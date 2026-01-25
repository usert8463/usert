const fs = require('fs');
const path = require('path');
const { delay, DisconnectReason, jidDecode } = require("@whiskeysockets/baileys");
const { execSync } = require("child_process");

let evt = require("../lib/ovlcmd");
const pkg = require('../package');
const config = require("../set");
const { manage_env } = require("../lib/manage_env");
const { installpg, reloadCommands } = require("../lib/plugin");

let restartCount = 0;
let wasOpen = false;

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
  const deps = { ...pkgJson.dependencies, ...pkgJson.devDependencies };
  const missing = [];

  for (const dep of Object.keys(deps || {})) {
    try {
      require.resolve(dep);
    } catch {
      missing.push(`${dep}@${deps[dep]}`);
    }
  }

  if (!missing.length) return;

  console.log(`⚙️ Installation des dépendances manquantes : ${missing.join(", ")}`);
  try {
    execSync(`npm install ${missing.join(" ")}`, { stdio: "inherit" });
    console.log("✅ Dépendances installées.");
  } catch (e) {
    console.error("❌ Erreur installation npm :", e.message);
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
│   🎉 OVL BOT ONLINE 🎉  
│                  
╰─────────────────╯
`);

      console.log("🔄 Synchronisation des variables d'environnement...");
      await manage_env();
      console.log("✅ Variables synchronisées.");

      await installpg();
      await installMissingDependencies();
      await reloadCommands();
      await delay(1000);

      if (!wasOpen) {
        const start_msg = `╭───〔 🤖 𝙊𝙑𝙇 𝘽𝙊𝙏 〕───⬣
│ ߷ *Etat*       ➜ Connecté ✅
│ ߷ *Préfixe*    ➜ ${config.PREFIXE}
│ ߷ *Mode*       ➜ ${config.MODE}
│ ߷ *Commandes*  ➜ ${evt.cmd.length}
│ ߷ *Version*    ➜ ${pkg.version}
│ ߷ *Développeur*➜ Ainz
╰──────────────⬣`;

        console.log(start_msg);
        await ovl.sendMessage(decodeJid(ovl.user.id), {
          text: start_msg,
          contextInfo: {
            forwardingScore: 1,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: '120363371282577847@newsletter',
              newsletterName: 'OVL-MD'
            }
          }
        });
      }

      wasOpen = true;
      restartCount = 0;

      await delay(10000);
      if (startNextSession) await startNextSession();
      break;

    case "close":
      const code = lastDisconnect?.error?.output?.statusCode;
      if (code === DisconnectReason.loggedOut) {
        console.log("⛔ Déconnecté : Session terminée.");
      } else {
        restartCount++;
        if (restartCount >= 3) return;
        console.log("⚠️ Connexion perdue, reconnexion...");
        await delay(5000);
        main();
      }
      break;
  }
}

module.exports = connection_update;
