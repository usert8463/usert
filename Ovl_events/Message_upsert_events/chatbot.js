const axios = require('axios');
const { ChatbotConf } = require('../../DataBase/chatbot');
const config = require('../../set');

async function chatbot(
  ms_org,
  verif_Groupe,
  texte,
  repondre,
  mention_JID,
  id_Bot,
  auteur_Msg_Repondu,
  auteur_Message
) {
  try {
    if (verif_Groupe) {
      if (!mention_JID.includes(id_Bot) && auteur_Msg_Repondu !== id_Bot) return;
    } else {
      if (!texte) return;
    }

    if (!texte) return;

    const conf = await ChatbotConf.findByPk('1');
    if (!conf) return;

    let enabledIds = [];
    try {
      enabledIds = JSON.parse(conf.enabled_ids || '[]');
    } catch {
      enabledIds = [];
    }

    const localActif = enabledIds.includes(ms_org);
    const globalActif = verif_Groupe
      ? conf.chatbot_gc === 'oui'
      : conf.chatbot_pm === 'oui';

    if (!(localActif || globalActif)) return;

    const prompt = `Tu es un assistant intelligent appelé OVL.
Ton créateur se nomme Ainz.
Répond clairement, précisément et chaleureusement.
Répond toujours dans la langue du message.
Message :
"${texte}"`;

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${config.GEMINI_API_KEY}`,
      {
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
      },
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );

    const data = response.data;

    if (data?.candidates?.length > 0) {
      const reponseTexte =
        data.candidates[0]?.content?.parts?.[0]?.text || "";

      if (reponseTexte) {
        return repondre(reponseTexte);
      }
    }

  } catch (err) {
    console.error("Erreur chatbot Gemini :", err.message);
  }
}

module.exports = chatbot;
