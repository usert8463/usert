const express = require("express");
const axios = require("axios");
const multer = require("multer");
const canvacord = require("canvacord");
const { createCanvas } = require("canvas");
const GIFEncoder = require("gifencoder");

const upload = multer();
const app = express();

async function telechargerImage(url) {
  const res = await axios.get(url, { responseType: "arraybuffer" });
  return Buffer.from(res.data);
}

function wrapText(ctx, text, maxWidth) {
  const words = text.split(" ");
  let lines = [];
  let line = "";
  for (const word of words) {
    const testLine = line + word + " ";
    if (ctx.measureText(testLine).width > maxWidth && line !== "") {
      lines.push(line);
      line = word + " ";
    } else {
      line = testLine;
    }
  }
  lines.push(line);
  return lines;
}

const effetsCanvacord = {
  shit: img => canvacord.Canvacord.shit(img),
  wasted: img => canvacord.Canvacord.wasted(img),
  wanted: img => canvacord.Canvacord.wanted(img),
  trigger: img => canvacord.Canvacord.trigger(img),
  trash: img => canvacord.Canvacord.trash(img),
  rip: img => canvacord.Canvacord.rip(img),
  sepia: img => canvacord.Canvacord.sepia(img),
  rainbow: img => canvacord.Canvacord.rainbow(img),
  invert: img => canvacord.Canvacord.invert(img),
  jail: img => canvacord.Canvacord.jail(img),
  affect: img => canvacord.Canvacord.affect(img),
  beautiful: img => canvacord.Canvacord.beautiful(img),
  blur: img => canvacord.Canvacord.blur(img),
  circle: img => canvacord.Canvacord.circle(img),
  greyscale: img => canvacord.Canvacord.greyscale(img),
  darkness: img => canvacord.Canvacord.darkness(img, "50"),
  pixelate: img => canvacord.Canvacord.pixelate(img),
};

app.all("/img-effect/:effet", upload.single("file"), async (req, res) => {
  try {
    const run = effetsCanvacord[req.params.effet];
    if (!run) return res.json({ error: "Effet inconnu" });
    let img;
    if (req.file) img = req.file.buffer;
    else if (req.query.url) img = await telechargerImage(req.query.url);
    else return res.json({ error: "Envoyez ?url= ou form-data file" });
    const result = await run(img);
    res.setHeader("Content-Type", "image/png");
    res.send(result);
  } catch (e) {
    res.json({ error: e.message });
  }
});

app.get("/ttp", async (req, res) => {
  const { texte } = req.query;
  if (!texte) return res.json({ error: "texte manquant" });
  const canvas = createCanvas(600, 400);
  const ctx = canvas.getContext("2d");
  ctx.font = "bold 40px Sans";
  ctx.textAlign = "center";
  ctx.fillStyle = "#fff";
  const lines = wrapText(ctx, texte, 520);
  const lineHeight = 45;
  let y = (canvas.height - lines.length * lineHeight) / 2;
  for (const line of lines) {
    ctx.fillText(line, canvas.width / 2, y);
    y += lineHeight;
  }
  res.setHeader("Content-Type", "image/png");
  res.send(canvas.toBuffer());
});

const COLORS = ["#FF5733","#33FF57","#3357FF","#FF33F6","#F6FF33","#33FFF9"];

app.get("/attp", async (req, res) => {
  const { texte } = req.query;
  if (!texte) return res.json({ error: "texte manquant" });
  const width = 600;
  const height = 300;
  const encoder = new GIFEncoder(width, height);
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  ctx.font = "bold 40px Sans";
  ctx.textAlign = "center";
  encoder.start();
  encoder.setRepeat(0);
  encoder.setDelay(80);
  encoder.setQuality(10);
  const lines = wrapText(ctx, texte, 520);
  const lineHeight = 45;
  for (const color of COLORS) {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = color;
    let y = (height - lines.length * lineHeight) / 2;
    for (const line of lines) {
      ctx.fillText(line, width / 2, y);
      y += lineHeight;
    }
    encoder.addFrame(ctx);
  }
  encoder.finish();
  res.setHeader("Content-Type", "image/gif");
  res.send(Buffer.from(encoder.out.getData()));
});

app.get("/gpt", async (req, res) => {
  try {
    const { texte, auteur, groupe, jid } = req.query;
    if (!texte) return res.json({ error: "texte manquant" });
    const apiKeys = [
      process.env.GEMINI_KEY_1,
      process.env.GEMINI_KEY_2,
      process.env.GEMINI_KEY_3,
      process.env.GEMINI_KEY_4,
      process.env.GEMINI_KEY_5,
      process.env.GEMINI_KEY_6,
      process.env.GEMINI_KEY_7,
      process.env.GEMINI_KEY_8,
      process.env.GEMINI_KEY_9,
      process.env.GEMINI_KEY_10
    ].filter(Boolean);
    const auteur_Message = auteur || "ovl-user";
    const ms_org = jid || "inconnu";
    const verif_Groupe = groupe === "true";
    const prompt = `Tu es un assistant intelligent appelé OVL. Ton créateur se nomme Ainz. Répond clairement, chaleureusement et sans longs paragraphes. Répond toujours dans la langue du message. Message venant d'un ${verif_Groupe ? "groupe" : "privé"} (${ms_org}). Utilisateur : ${auteur_Message}. Message : "${texte}"`;
    for (const key of apiKeys) {
      try {
        const r = await axios.post(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
          { contents: [{ parts: [{ text: prompt }] }] }
        );
        const rep = r.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rep) return res.json({ response: rep.trim() });
      } catch {}
    }
    res.json({ error: "aucune reponse" });
  } catch (e) {
    res.json({ error: e.message });
  }
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`API online ${PORT}`));
