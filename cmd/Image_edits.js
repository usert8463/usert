const fs = require("fs");
const { ovlcmd } = require("../lib/ovlcmd");
const canvacord = require("canvacord");
const axios = require("axios");

async function telechargerImage(url) {
  console.log("[LOG] Téléchargement de l'image :", url);
  try {
    const response = await axios.get(url, { responseType: "arraybuffer" });
    console.log("[LOG] Téléchargement réussi :", url);
    return Buffer.from(response.data, "binary");
  } catch (error) {
    console.error("[ERROR] Impossible de télécharger l'image :", url, error.message);
    throw new Error("Impossible de télécharger l'image.");
  }
}

function genererCommandeCanvacord(nomCommande, effet) {
  ovlcmd(
    {
      nom_cmd: nomCommande,
      classe: "Image_Edits",
      react: "🎨",
      desc: "Applique un effet sur une image",
    },
    async (ms_org, ovl, options) => {
      const { arg, ms, getJid, auteur_Msg_Repondu, msg_Repondu, auteur_Message } = options;
      console.log(`[LOG] Commande appelée : ${nomCommande}`);

      try {
        let imageBuffer;
        const cbl =
          auteur_Msg_Repondu ||
          (arg[0]?.includes("@") && `${arg[0].replace("@", "")}@lid`) ||
          auteur_Message;

        const cible = await getJid(cbl, ms_org, ovl);
        console.log("[LOG] JID cible :", cible);

        if (msg_Repondu?.imageMessage) {
          console.log("[LOG] Lecture de l'image répondue");
          const cheminFichier = await ovl.dl_save_media_ms(msg_Repondu.imageMessage);
          imageBuffer = fs.readFileSync(cheminFichier);
          console.log("[LOG] Image lue depuis fichier :", cheminFichier);
        } else if (cible) {
          try {
            console.log("[LOG] Tentative de récupération de la photo de profil");
            imageBuffer = await telechargerImage(await ovl.profilePictureUrl(cible, "image"));
          } catch {
            console.warn("[WARN] Photo de profil inaccessible, image par défaut utilisée");
            imageBuffer = await telechargerImage("https://files.catbox.moe/ulwqtr.jpg");
          }
        } else {
          console.log("[LOG] Pas de cible, image par défaut utilisée");
          imageBuffer = await telechargerImage("https://files.catbox.moe/ulwqtr.jpg");
        }

        console.log("[LOG] Application de l'effet :", nomCommande);
        const resultat = await effet(imageBuffer);
        console.log("[LOG] Effet appliqué avec succès :", nomCommande);

        await ovl.sendMessage(ms_org, { image: resultat }, { quoted: ms });
        console.log("[LOG] Message envoyé avec succès pour :", nomCommande);
      } catch (error) {
        console.error(`[ERROR] Erreur avec la commande "${nomCommande}":`, error);
      }
    }
  );
}

const effetsCanvacord = {
  shit: (img) => canvacord.canvacord.shit(img),
  wasted: (img) => canvacord.canvacord.wasted(img),
  wanted: (img) => canvacord.canvacord.wanted(img),
  trigger: (img) => canvacord.canvacord.trigger(img),
  trash: (img) => canvacord.canvacord.trash(img),
  rip: (img) => canvacord.canvacord.rip(img),
  sepia: (img) => canvacord.canvacord.sepia(img),
  rainbow: (img) => canvacord.canvacord.rainbow(img),
  hitler: (img) => canvacord.canvacord.hitler(img),
  invert1: (img) => canvacord.canvacord.invert(img),
  jail: (img) => canvacord.canvacord.jail(img),
  affect: (img) => canvacord.canvacord.affect(img),
  beautiful: (img) => canvacord.canvacord.beautiful(img),
  blur: (img) => canvacord.canvacord.blur(img),
  circle1: (img) => canvacord.canvacord.circle(img),
  facepalm: (img) => canvacord.canvacord.facepalm(img),
  greyscale: (img) => canvacord.canvacord.greyscale(img),
  jokeoverhead: (img) => canvacord.canvacord.jokeOverHead(img),
  delete_image: (img) => canvacord.canvacord.delete(img),
  distracted: (img) => canvacord.canvacord.distracted(img),
  colorfy: (img) => canvacord.canvacord.colorfy(img),
  filters: (img) => canvacord.canvacord.filters(img),
  fuse: (img) => canvacord.canvacord.fuse(img),
};

Object.entries(effetsCanvacord).forEach(([nom, effet]) =>
  genererCommandeCanvacord(nom, effet)
);
