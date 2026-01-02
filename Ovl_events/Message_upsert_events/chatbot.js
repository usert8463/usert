const axios = require('axios');
const { ChatbotConf } = require('../../DataBase/chatbot');

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
    
    const uniqueId = `${ms_org}-${auteur_Message}`

    const response = await axios.get('https://uta-f1kg.onrender.com/chatbot', {
      params: {
        user_id: uniqueId,
        text: texte
      }
    })
console.log(response.data)
    if (response.data?.text) return repondre(response.data.text)

  } catch (err) {
    console.error('Erreur chatbot WebAI :', err)
  }
}

module.exports = chatbot;
