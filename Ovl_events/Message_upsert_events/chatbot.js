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

    await axios.get(
      'https://c1877.webapi.ai/cmc/user_message',
      {
        params: {
          auth_token: "25qsdt8c",
          text: texte,
          user_id: auteur_Message
        }
      }
    );

    await new Promise(r => setTimeout(r, 500));
    
    const response = await axios.get(
      'https://api-ovl.koyeb.app/response',
      {
        params: { user_id: auteur_Message }
      }
    );

    const data = response.data;

    if (data?.text) {
      return repondre(data.text);
    }

  } catch (err) {
    console.error("Erreur chatbot WebAI :", err.message);
  }
}

module.exports = chatbot;

