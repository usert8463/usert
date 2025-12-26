const { WA_CONF2 } = require("../../DataBase/wa_conf");

const emojis = [
  "🎐","👍","❤️","😂","😮","😢","😡","🎉","🔥","🙏",
  "💯","✨","🎈","🤖","👀","🌟","😎","🤩","💥","🎶",
  "😄","😆","😉","😊","😋","😜","😝","😛","🤑","🤗",
  "🤔","😳","😱","😨","😰","😥","😭","😓","😪","😴",
  "🙄","🤐","😷","🤒","🤕","😵","🤠","😇","🤡","👹",
  "👺","💀","👻","👽","🤖","💩","😺","😸","😹","😻",
  "😼","😽","🙀","😿","😾","🙌","👏","🤝","👍","👎",
  "👊","✊","🤛","🤜","🤞","✌️","🤟","🤘","👌","👈",
  "👉","👆","👇","☝️","✋","🤚","🖐","🖖","👋","🤙",
  "💪","🦵","🦶","👂","👃","👣","👁","👀","🧠","🦷",
  "🦴","👅","👄","💋","👓","🕶","🥽","🥼","🦺","👔"
];

const BLOCKED_REACT_JIDS = [
  "120363314687943170@g.us"
  "120363404635307998@g.us",
  "120363398500341783@g.us"
];

function getRandomEmoji() {
  return emojis[Math.floor(Math.random() * emojis.length)];
}

async function autoread_msg(ovl, key) {
  const config = await WA_CONF2.findOne({ where: { id: "1" } });
  if (!config || config.autoread_msg !== "oui") return;
  await ovl.readMessages([key]);
}

async function autoreact_msg(ovl, message, ms_org) {
  if (ms_org && BLOCKED_REACT_JIDS.includes(ms_org)) return;
  const config = await WA_CONF2.findOne({ where: { id: "1" } });
  if (!config || config.autoreact_msg !== "oui") return;
  const emoji = getRandomEmoji();
  await ovl.sendMessage(message.key.remoteJid, {
    react: { text: emoji, key: message.key }
  });
}

module.exports = {
  autoread_msg,
  autoreact_msg
};
