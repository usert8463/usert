const { WA_CONF } = require('../../DataBase/wa_conf');

async function antidelete(ovl, ms, auteur_Message, mtype, getMessage, ms_org, id_bot) {
  const settings = await WA_CONF.findOne({ where: { id: '1' } });
  if (!settings) return;

  try {
    const antideleteConfig = settings.antidelete;
    const modesSansTiret = ['pm', 'gc', 'status', 'all', 'pm/gc', 'pm/status', 'gc/status'];
    const isModeValide = modesSansTiret.some(mode => antideleteConfig.startsWith(mode));
    if (!isModeValide) return;

    if (mtype === 'protocolMessage') {

      const deletedMsgKey = ms.message.protocolMessage;
      if (!deletedMsgKey?.key?.id) return;

      const deletedMsg = getMessage(deletedMsgKey.key.id);
      if (!deletedMsg) return;

      const realJid = deletedMsg.key.remoteJid;
      const altJid = deletedMsg.key.remoteJidAlt || '';

      const jid = altJid || realJid;

      const isStatus = realJid === 'status@broadcast';
      const isGc = realJid.endsWith('@g.us');
      const isPm = !isStatus && altJid.endsWith('@s.whatsapp.net');

      const isGroup = isGc;

      const sender = isGroup
        ? (deletedMsg.key.participant || deletedMsg.participant)
        : jid;

      const deletionTime = new Date().toISOString().substr(11, 8);

      if (!deletedMsg.key.fromMe) {

        function modeMatch(mode) {
          return antideleteConfig.includes(mode);
        }

        const shouldSend =
          (modeMatch('gc') && isGc) ||
          (modeMatch('pm') && isPm) ||
          (modeMatch('status') && isStatus) ||
          modeMatch('all') ||
          (modeMatch('pm/gc') && (isGc || isPm)) ||
          (modeMatch('pm/status') && (isStatus || isPm)) ||
          (modeMatch('gc/status') && (isGc || isStatus));

        if (!shouldSend) return;

        const provenance = isGroup
          ? `👥 Groupe : ${(await ovl.groupMetadata(realJid)).subject}`
          : isStatus
            ? `📢 Status WhatsApp`
            : `📩 Chat : @${jid.split('@')[0]}`;

        const header = `
✨ OVL-MD ANTI-DELETE MSG ✨
👤 Envoyé par : @${sender.split('@')[0]}
❌ Supprimé par : @${auteur_Message.split('@')[0]}
⏰ Heure de suppression : ${deletionTime}
${provenance}
        `.trim();

        if (antideleteConfig.includes('-org')) {

          if (!ms_org) return;

          await ovl.sendMessage(ms_org, {
            text: header,
            mentions: [sender, auteur_Message]
          }, { quoted: deletedMsg });

          const contenu = deletedMsg.message;
          const typeMsg = Object.keys(contenu || {})[0];

          if (typeMsg === 'conversation' || typeMsg === 'extendedTextMessage') {

            const texte =
              contenu?.conversation ||
              contenu?.extendedTextMessage?.text ||
              '📝 Message supprimé (vide)';

            await ovl.sendMessage(ms_org, {
              text: texte
            }, { quoted: deletedMsg });

          } else {

            await ovl.sendMessage(ms_org, {
              forward: deletedMsg
            }, { quoted: deletedMsg });

          }

        } else {

          await ovl.sendMessage(id_bot, {
            text: header,
            mentions: [sender, auteur_Message]
          }, { quoted: deletedMsg });

          await ovl.sendMessage(id_bot, {
            forward: deletedMsg
          }, { quoted: deletedMsg });

        }
      }
    }

  } catch (err) {
    console.error('❌ Une erreur est survenue dans antidelete :', err);
  }
}

module.exports = antidelete;
