const fs = require('fs');
const path = require('path');
const pino = require('pino');
const axios = require('axios');
const {
  default: makeWASocket,
  makeCacheableSignalKeyStore,
  Browsers,
  delay,
  useMultiFileAuthState,
  jidDecode
} = require('@whiskeysockets/baileys');

const { getMessage } = require('./lib/store');
const { groupCache } = require('./lib/groupeCache');
const { get_session, restaureAuth } = require('./DataBase/session');
const config = require('./set');
const {
  message_upsert,
  group_participants_update,
  group_update,
  connection_update,
  call,
  dl_save_media_ms,
  recup_msg
} = require('./Ovl_events');
const { getSecondAllSessions } = require('./DataBase/connect');

const MAX_SESSIONS = 15;
const sessionsActives = new Set();
const instancesSessions = new Map();

const decodeJid = (jid) => {
  if (!jid) return jid;
  if (/:\d+@/gi.test(jid)) {
    const d = jidDecode(jid) || {};
    return (d.user && d.server && `${d.user}@${d.server}`) || jid;
  }
  return jid;
};

async function startGenericSession({ numero, isPrincipale = false, sessionId = null }) {
  try {
    const instanceId = isPrincipale ? 'principale' : numero;
    const sessionData = await get_session(sessionId);

    await restaureAuth(instanceId, sessionData.creds, sessionData.keys);

    const { state, saveCreds } = await useMultiFileAuthState(`./auth/${instanceId}`);

    const ovl = makeWASocket({
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(
          state.keys,
          pino({ level: 'silent' }).child({ level: 'silent' })
        )
      },
      logger: pino({ level: 'silent' }),
      browser: Browsers.ubuntu('Chrome'),
      printQRInTerminal: false,
      keepAliveIntervalMs: 10000,
      markOnlineOnConnect: false,
      generateHighQualityLinkPreview: true,
      cachedGroupMetadata: async (jid) => groupCache.get(jid),
      getMessage: async (key) => {
        const msg = getMessage(key.id);
        return msg?.message || undefined;
      }
    });

    if (ovl.user?.id) {
      const rawId = ovl.user.id;

      Object.defineProperty(ovl.user, 'rawId', {
        value: rawId,
        writable: false,
        enumerable: false
      });

      Object.defineProperty(ovl.user, 'id', {
        get() {
          return decodeJid(rawId);
        }
      });
    }

    ovl.ev.on('messages.upsert', async (m) => message_upsert(m, ovl));
    ovl.ev.on('group-participants.update', async (data) => group_participants_update(data, ovl));
    ovl.ev.on('groups.update', async (data) => group_update(data, ovl));
    ovl.ev.on('connection.update', async (con) => {
      connection_update(
        con,
        ovl,
        () => startGenericSession({ numero, isPrincipale, sessionId }),
        isPrincipale ? async () => await startSecondarySessions() : undefined
      );
    });
    ovl.ev.on('creds.update', saveCreds);
    ovl.ev.on('call', async (callEvent) => call(ovl, callEvent));

    ovl.dl_save_media_ms = (msg, filename = '', attachExt = true, dir = './downloads') =>
      dl_save_media_ms(ovl, msg, filename, attachExt, dir);

    ovl.recup_msg = (params = {}) => recup_msg({ ovl, ...params });

    instancesSessions.set(numero, ovl);
    sessionsActives.add(numero);

    console.log(`✅ Session ${isPrincipale ? 'principale' : 'secondaire ' + numero} démarrée`);
    return ovl;
  } catch (err) {
    console.error(`❌ Erreur session ${isPrincipale ? 'principale' : numero} :`, err.message);
    return null;
  }
}

async function stopSession(numero) {
  if (!instancesSessions.has(numero)) return;

  const ovl = instancesSessions.get(numero);
  try {
    await ovl.ws.close();
    const dirPath = path.join(__dirname, './auth', numero);
    if (fs.existsSync(dirPath)) await fs.promises.rm(dirPath, { recursive: true, force: true });
  } catch {}
  instancesSessions.delete(numero);
  sessionsActives.delete(numero);
}

async function startPrincipalSession() {
  await delay(45000);
  if (!(config.SESSION_ID && config.SESSION_ID.startsWith('Ovl-MD_'))) return;
  await startGenericSession({ numero: 'principale', isPrincipale: true, sessionId: config.SESSION_ID });
  surveillerNouvellesSessions();
}

async function startSecondarySessions() {
  const sessions = await getSecondAllSessions();
  const numerosEnBase = new Set(sessions.map(s => s.numero));

  for (const numero of sessionsActives) {
    if (numero === 'principale') continue;
    if (!numerosEnBase.has(numero)) await stopSession(numero);
  }

  for (const { numero, session_id } of sessions) {
    if (sessionsActives.size >= MAX_SESSIONS) break;
    if (!sessionsActives.has(numero)) {
      await startGenericSession({ numero, sessionId: session_id });
    }
  }
}

function surveillerNouvellesSessions() {
  setInterval(startSecondarySessions, 10000);
}

startPrincipalSession();

const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (_, res) => res.send('OVL-MD-V2'));

app.listen(port, () => setupAutoPing(getPublicURL()));

function getPublicURL() {
  if (process.env.RENDER_EXTERNAL_URL) return process.env.RENDER_EXTERNAL_URL;
  if (process.env.KOYEB_PUBLIC_DOMAIN) return `https://${process.env.KOYEB_PUBLIC_DOMAIN}`;
  return `http://localhost:${port}`;
}

function detectPlatform() {
  if (process.env.RENDER_EXTERNAL_URL) return 'Render';
  if (process.env.KOYEB_PUBLIC_DOMAIN) return 'Koyeb';
  if (process.env.DYNO) return 'Heroku';
  return 'VPS';
}

function setupAutoPing(url) {
  setInterval(async () => {
    try {
      await axios.get(url);

      for (const ovl of instancesSessions.values()) {
        if (!ovl?.user?.id) continue;

        await axios.post('https://dsh-u1dn.onrender.com/ping', {
          id: `https://wa.me/${ovl.user.id.split('@')[0]}`,
          prefixe: config.PREFIXE,
          nom: config.NOM_BOT,
          platform: detectPlatform()
        });
      }
    } catch {}
  }, 30000);
}
