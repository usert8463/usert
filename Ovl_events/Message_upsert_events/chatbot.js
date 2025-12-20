const axios = require('axios');
const { ChatbotConf } = require('../../DataBase/chatbot');

const GPT_API_URL = "https://api-ovl.koyeb.app/gpt";

async function chatbot(ms_org, verif_Groupe, texte, repondre, mention_JID, id_Bot, auteur_Msg_Repondu, auteur_Message) {
  try {
    if (verif_Groupe) {
      if (!mention_JID.includes(id_Bot) && auteur_Msg_Repondu !== id_Bot) return;
    } else {
      if (!texte) return;
    }

    if (!texte) return;

    const config = await ChatbotConf.findByPk('1');
    if (!config) return;

    let enabledIds = [];
    try {
      enabledIds = JSON.parse(config.enabled_ids || '[]');
    } catch {
      enabledIds = [];
    }

    const localActif = enabledIds.includes(ms_org);
    const globalActif = verif_Groupe
      ? config.chatbot_gc === 'oui'
      : config.chatbot_pm === 'oui';

    if (!(localActif || globalActif)) return;

    const response = await axios.get(GPT_API_URL, {
      params: {
        texte,
        auteur: auteur_Message,
        groupe: verif_Groupe ? "true" : "false",
        jid: ms_org
      },
      timeout: 20000
    });

    const finalResponse = response.data?.response;

    if (finalResponse) {
      return repondre(finalResponse);
    }

  } catch (err) {
    console.error("Erreur chatbot API OVL :", err.message);
  }
}

module.exports = chatbot;

