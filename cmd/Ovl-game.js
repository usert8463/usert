const { ovlcmd } = require("../lib/ovlcmd");
const axios = require("axios");
const { delay } = require("@whiskeysockets/baileys");
const config = require('../set');
const fs = require('fs');
let activeGames = {};

ovlcmd(
    {
        nom_cmd: "tictactoe",
        classe: "OVL-GAMES",
        react: "🎮",
        desc: "Jeu du Tic-Tac-Toe",
        alias: ["ttt"],
    },
    async (ms_org, ovl, cmd_options) => {
        const { arg, ms, msg_Repondu, auteur_Msg_Repondu, auteur_Message, getJid } = cmd_options;
        let joueur1Nom = auteur_Message.split('@')[0];
        let joueur2Nom, joueur2ID;

        if (msg_Repondu) {
            joueur2Nom = auteur_Msg_Repondu.split('@')[0];
            joueur2ID = auteur_Msg_Repondu;
        } else if (arg.length > 0 && arg[0].includes('@')) {
            joueur2ID = await getJid(`${arg[0].replace("@", "")}@lid`, ms_org, ovl);
            joueur2Nom = joueur2ID.split("@")[0];
        } else {
            return ovl.sendMessage(ms_org, {
                text: '🙋‍♂️ Veuillez *mentionner* ou *répondre* au message du joueur pour lancer une partie.',
            }, { quoted: ms });
        }

        if (auteur_Message === joueur2ID) {
            return ovl.sendMessage(ms_org, {
                text: "🚫 Vous ne pouvez pas jouer contre vous-même !",
            }, { quoted: ms });
        }

        if (activeGames[auteur_Message] || activeGames[joueur2ID]) {
            delete activeGames[auteur_Message];
            delete activeGames[joueur2ID];
        }

        const gameID = `${Date.now()}-${auteur_Message}-${joueur2ID}`;
        activeGames[auteur_Message] = { opponent: joueur2ID, gameID };
        activeGames[joueur2ID] = { opponent: auteur_Message, gameID };

        await ovl.sendMessage(ms_org, {
            text: `🎮 *Tic-Tac-Toe Défi !*\n\n🔸 @${joueur1Nom} défie @${joueur2Nom} !\n\n✍️ Pour accepter, réponds *oui* dans les 60 secondes.`,
            mentions: [auteur_Message, joueur2ID]
        }, { quoted: ms });

        try {
            const rep = await ovl.recup_msg({
                auteur: joueur2ID,
                ms_org,
                temps: 60000
            });

            const reponse = rep?.message?.conversation || rep?.message?.extendedTextMessage?.text || "";
            if (reponse.toLowerCase() === 'oui') {

                let grid = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣'];
                let currentPlayer = 0;
                let symbols = ['❌', '⭕'];
                let players = [auteur_Message, joueur2ID];

                activeGames[auteur_Message] = { opponent: joueur2ID, grid, currentPlayer, gameID };
                activeGames[joueur2ID] = { opponent: auteur_Message, grid, currentPlayer, gameID };

                const displayGrid = (endGame = false) => {
                    let grille = `
╔═══╦═══╦═══╗
║ ${grid[0]}    ${grid[1]}    ${grid[2]}
╠═══╬═══╬═══╣
║ ${grid[3]}    ${grid[4]}    ${grid[5]}
╠═══╬═══╬═══╣
║ ${grid[6]}    ${grid[7]}    ${grid[8]}
╚═══╩═══╩═══╝

❌ : @${joueur1Nom}
⭕ : @${joueur2Nom}`;
                    if (!endGame) {
                        grille += `\n\n🎯 C'est au tour de @${players[currentPlayer].split('@')[0]} de jouer !`;
                    }
                    return grille;
                };

                const checkWin = (symbol) => {
                    const winningCombos = [
                        [0, 1, 2], [3, 4, 5], [6, 7, 8],
                        [0, 3, 6], [1, 4, 7], [2, 5, 8],
                        [0, 4, 8], [2, 4, 6]
                    ];
                    return winningCombos.some(combo => combo.every(index => grid[index] === symbol));
                };

                for (let turn = 0; turn < 9; turn++) {
                    let symbol = symbols[currentPlayer];
                    await ovl.sendMessage(ms_org, {
                        text: displayGrid(),
                        mentions: [auteur_Message, joueur2ID]
                    }, { quoted: ms });

                    let position, valide = false;
                    while (!valide) {
                        const rep = await ovl.recup_msg({
                            auteur: players[currentPlayer],
                            ms_org,
                            temps: 60000
                        });

                        let response = rep?.message?.conversation || rep?.message?.extendedTextMessage?.text || "";

                        if (!isNaN(response)) {
                            position = parseInt(response);
                            if (grid[position - 1] !== '❌' && grid[position - 1] !== '⭕' && position >= 1 && position <= 9) {
                                grid[position - 1] = symbol;
                                valide = true;
                            } else {
                                await ovl.sendMessage(ms_org, {
                                    text: "❗ *Position invalide !* Choisis une case encore libre (1 à 9).",
                                    mentions: players
                                }, { quoted: ms });
                            }
                        } else if (response.toLowerCase().startsWith(config.PREFIXE + "ttt")) {
                            // Ignorer relancement du jeu pendant la partie
                        } else {
                            await ovl.sendMessage(ms_org, {
                                text: "❌ *Entrée invalide !* Réponds avec un chiffre entre 1 et 9.",
                                mentions: players
                            }, { quoted: ms });
                        }
                    }

                    if (checkWin(symbol)) {
                        await ovl.sendMessage(ms_org, {
                            text: `🏆 *Victoire !*\n\n🎉 @${players[currentPlayer].split('@')[0]} a gagné la partie !\n${displayGrid(true)}`,
                            mentions: players
                        }, { quoted: ms });
                        delete activeGames[auteur_Message];
                        delete activeGames[joueur2ID];
                        return;
                    }

                    currentPlayer = 1 - currentPlayer;
                    activeGames[auteur_Message].currentPlayer = currentPlayer;
                    activeGames[joueur2ID].currentPlayer = currentPlayer;
                }

                await ovl.sendMessage(ms_org, {
                    text: `🤝 *Match Nul !*\n\nAucun gagnant cette fois-ci !\n${displayGrid(true)}`,
                    mentions: players
                }, { quoted: ms });

                delete activeGames[auteur_Message];
                delete activeGames[joueur2ID];

            } else {
                return ovl.sendMessage(ms_org, {
                    text: '❌ Invitation refusée par le joueur.',
                }, { quoted: ms });
            }

        } catch (error) {
            if (error.message === 'Timeout') {
                await ovl.sendMessage(ms_org, {
                    text: `⏱️ @${joueur2Nom} a mis trop de temps. Partie annulée.`,
                    mentions: [auteur_Message, joueur2ID]
                }, { quoted: ms });
            } else {
                console.error(error);
            }
            delete activeGames[auteur_Message];
            delete activeGames[joueur2ID];
        }
    }
);

ovlcmd(
  {
    nom_cmd: "anime-quizz",
    classe: "OVL-GAMES",
    react: "📺",
    desc: "Lance un quiz anime.",
    alias: ["a-quizz"]
  },
  async (ms_org, ovl, { repondre, auteur_Message, verif_Groupe, prenium_id, getJid }) => {
     
    if (!verif_Groupe) return repondre("❌ Cette commande fonctionne uniquement dans les groupes.");

    const createur = auteur_Message || prenium_id;

    const choixMsg =
      "🎯 *Anime Quiz*\n\n" +
      "Choisis le nombre de questions :\n" +
      "1️⃣ 10 questions\n" +
      "2️⃣ 20 questions\n" +
      "3️⃣ 30 questions\n\n" +
      "✋ Envoie *stop* à tout moment pour annuler (créateur uniquement).";

    await ovl.sendMessage(ms_org, { text: choixMsg });

    let totalQuestions = 10;
    try {
      const rep = await ovl.recup_msg({ ms_org, auteur: createur, temps: 30000 });
      const txt = (rep?.message?.conversation || rep?.message?.extendedTextMessage?.text || "").trim().toLowerCase();

      if (txt === "stop") return repondre("🛑 Quiz annulé.");
      if (txt === "1") totalQuestions = 10;
      else if (txt === "2") totalQuestions = 20;
      else if (txt === "3") totalQuestions = 30;
      else return repondre("❗ Choix invalide. Réponds par 1, 2 ou 3.");
    } catch {
      return repondre("⏱️ Temps écoulé. Relance la commande pour recommencer.");
    }

    let questions;
    try {
      const rawData = fs.readFileSync('./lib/aquizz.json', 'utf8');
      questions = JSON.parse(rawData).sort(() => 0.5 - Math.random()).slice(0, totalQuestions);
    } catch {
      return repondre("❌ Impossible de récupérer les questions.");
    }

    const numbersToLetters = { "1": "a", "2": "b", "3": "c", "4": "d" };
    const scores = {};

    for (let i = 0; i < totalQuestions; i++) {
      const { question, options, answer } = questions[i];
      const correctAnswerLetter = answer.toLowerCase();
      const correctAnswerText = options[correctAnswerLetter];

      const optionList = Object.values(options)
        .map((text, i) => `${i + 1}. ${text}`)
        .join("\n");

      const questionMsg =
        `📺 *Question ${i + 1}/${totalQuestions}*\n\n` +
        `${question}\n\n` +
        `${optionList}\n\n` +
        "⏳ *15 secondes* — Réponds avec 1, 2, 3 ou 4\n" +
        "🛑 Le créateur peut envoyer *stop* pour annuler.";

      await ovl.sendMessage(ms_org, { text: questionMsg });

      const debut = Date.now();
      let bonneRéponse = false;

      while (Date.now() - debut < 15000 && !bonneRéponse) {
        try {
          const reponse = await ovl.recup_msg({ ms_org, temps: 15000 - (Date.now() - debut) });
          const txt = (reponse?.message?.conversation || reponse?.message?.extendedTextMessage?.text || "").trim().toLowerCase();
          const lid = reponse.key.participant || reponse.key.remoteJid;
          const jid = await getJid(lid, ms_org, ovl);

          if (txt === "stop" && jid === createur) {
            return ovl.sendMessage(ms_org, {
              text: `🛑 Quiz annulé par le créateur @${jid.split("@")[0]}`,
              mentions: [jid]
            });
          }

          if (!["1", "2", "3", "4"].includes(txt)) continue;

          const lettre = numbersToLetters[txt];
          if (lettre === correctAnswerLetter) {
            scores[jid] = (scores[jid] || 0) + 1;
            await ovl.sendMessage(ms_org, {
              text: `✅ Bonne réponse @${jid.split("@")[0]} ! C'était *${correctAnswerText}*`,
              quoted: reponse,
              mentions: [jid]
            });
            bonneRéponse = true;
          }
        } catch {
          break;
        }
      }

      if (!bonneRéponse) {
        await ovl.sendMessage(ms_org, {
          text: `⌛ Temps écoulé ! La bonne réponse était *${correctAnswerText}*`
        });
      }

      await delay(1000);
    }

    if (!Object.keys(scores).length) {
      return ovl.sendMessage(ms_org, { text: "😢 Personne n'a marqué de point. Fin du quiz." });
    }

    const classement = Object.entries(scores)
      .sort(([, a], [, b]) => b - a)
      .map(([jid, score], i) => `${i + 1}. @${jid.split("@")[0]} — *${score}* point${score > 1 ? "s" : ""}`)
      .join("\n");

    const finalMsg = `🏁 *Fin du Quiz Anime !*\n\n📊 *Classement final :*\n\n${classement}`;
    await ovl.sendMessage(ms_org, { text: finalMsg, mentions: Object.keys(scores) });
  }
);

ovlcmd(
  {
    nom_cmd: "dmots",
    classe: "OVL-GAMES",
    react: "🪹",
    desc: "Jouez à plusieurs au jeu du Mot Mélangé",
  },
  async (ms_org, ovl, { repondre, auteur_Message, prenium_id, getJid }) => {
    const joueurs = new Map();
    const debutInscription = Date.now();
    let mots = [];
    const motsUtilises = new Set();

    try {
      const rawData = fs.readFileSync('./lib/mots.json', 'utf8');
      mots = JSON.parse(rawData);
      mots = mots.sort(() => Math.random() - 0.5);
    } catch (e) {
      return repondre("❌ Impossible de récupérer les mots.");
    }

    function normaliserTexte(texte) {
      return texte
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "")
        .trim();
    }

    const melangerMot = (mot) => {
      let melange;
      let essais = 0;
      const motNormalise = mot.toLowerCase();
      
      do {
        const arr = mot.split("");
        for (let i = arr.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        melange = arr.join("");
        essais++;
      } while (
        essais < 20 && 
        (melange.toLowerCase() === motNormalise || 
         melange === mot.split("").reverse().join("") ||
         melange.toLowerCase() === mot.split("").reverse().join("").toLowerCase())
      );
      
      return melange;
    };

    const choisirMotUnique = (motsDispo) => {
      const motsDisponibles = motsDispo.filter(m => !motsUtilises.has(normaliserTexte(m)));
      
      if (motsDisponibles.length === 0) {
        motsUtilises.clear();
        return motsDispo[Math.floor(Math.random() * motsDispo.length)];
      }
      
      const motChoisi = motsDisponibles[Math.floor(Math.random() * motsDisponibles.length)];
      motsUtilises.add(normaliserTexte(motChoisi));
      return motChoisi;
    };

    joueurs.set(auteur_Message, { id: auteur_Message, score: 0 });
    const createur = auteur_Message || prenium_id;

    await ovl.sendMessage(ms_org, {
      text:
        "🎮 *Jeu du Mot Mélangé - MULTIJOUEURS* 🎮\n\n" +
        "Tapez 'join' pour participer !\n" +
        "🆕 Tapez 'start' pour commencer immédiatement (créateur)\n" +
        "❌ Tapez 'stop' pour annuler (créateur)\n" +
        "⏳ Temps max d'inscription : 60s\n" +
        "🎯 Dernier survivant gagne !",
    });

    const rappelTemps = [45000, 30000, 15000];
    const rappelEnvoyes = new Set();
    let partieCommencee = false;
    let partieAnnulee = false;

    const timerInterval = setInterval(async () => {
      const restant = 60000 - (Date.now() - debutInscription);
      if (restant <= 0 || partieCommencee || partieAnnulee) return clearInterval(timerInterval);
      const secondesRestantes = Math.floor(restant / 1000);
      for (let t of rappelTemps) {
        if (secondesRestantes === t / 1000 && !rappelEnvoyes.has(t)) {
          rappelEnvoyes.add(t);
          await ovl.sendMessage(ms_org, {
            text: `⏳ Temps restant : ${t / 1000}s ! Tapez *join* pour participer ou *start* pour commencer.`,
          });
        }
      }
    }, 1000);

    while (Date.now() - debutInscription < 60000 && !partieCommencee && !partieAnnulee) {
      try {
        const rep = await ovl.recup_msg({ ms_org, temps: 60000 - (Date.now() - debutInscription) });
        const msg = (rep?.message?.conversation || rep?.message?.extendedTextMessage?.text || "").trim().toLowerCase();
        const auteurLid = rep?.key?.participant || rep?.key?.remoteJid || rep?.message?.senderKey;
        const auteur = await getJid(auteurLid, ms_org, ovl);
        
        if (msg === "join" && auteur && !joueurs.has(auteur)) {
          joueurs.set(auteur, { id: auteur, score: 0 });
          await ovl.sendMessage(ms_org, {
            text: `✅ @${auteur.split("@")[0]} a rejoint la partie ! (${joueurs.size} joueur${joueurs.size > 1 ? 's' : ''})`,
            mentions: [auteur],
          });
        } else if (msg === "start" && auteur === createur) {
          if (joueurs.size < 2) {
            await ovl.sendMessage(ms_org, {
              text: `❌ Il faut au moins 2 joueurs pour démarrer. (Actuellement : ${joueurs.size})`,
              mentions: [auteur],
            });
          } else {
            partieCommencee = true;
            clearInterval(timerInterval);
            break;
          }
        } else if (msg === "stop" && auteur === createur) {
          partieAnnulee = true;
          clearInterval(timerInterval);
          await ovl.sendMessage(ms_org, {
            text: `🛑 Partie annulée par @${auteur.split("@")[0]}`,
            mentions: [auteur],
          });
          return;
        }
      } catch {}
    }

    if (partieAnnulee) return;

    if (!partieCommencee) {
      if (joueurs.size < 2) {
        await repondre("❌ Pas assez de joueurs (minimum 2). Partie annulée.");
        return;
      }
      partieCommencee = true;
      clearInterval(timerInterval);
    }

    await ovl.sendMessage(ms_org, {
      text:
        `🚀 *Début de la Partie*\n` +
        `👥 Joueurs (${joueurs.size}) : ${[...joueurs.values()].map(j => `@${j.id.split("@")[0]}`).join(", ")}\n` +
        `⏱️ 20 secondes par mot\n` +
        `Bonne chance à tous 🍀`,
      mentions: [...joueurs.keys()],
    });

    let tour = 1;
    let joueursActifs = [...joueurs.values()];

    const motsParTour = (t) => {
      if (t === 1) return mots.filter(m => m.length >= 4 && m.length <= 5);
      if (t === 2) return mots.filter(m => m.length >= 6 && m.length <= 7);
      if (t === 3) return mots.filter(m => m.length >= 8 && m.length <= 9);
      return mots.filter(m => m.length >= 10);
    };

    while (joueursActifs.length > 1 && !partieAnnulee) {
      const joueursCeTour = [...joueursActifs];
      let reussitesCeTour = 0;

      await ovl.sendMessage(ms_org, {
        text: `📢 *Tour ${tour}* - ${joueursActifs.length} joueur${joueursActifs.length > 1 ? 's' : ''} en lice !`,
      });

      for (const joueur of joueursCeTour) {
        const motsDispo = motsParTour(tour);
        if (!motsDispo.length) {
          await ovl.sendMessage(ms_org, {
            text: `❌ Plus de mots disponibles pour ce tour. Fin de partie !`,
          });
          break;
        }

        const mot = choisirMotUnique(motsDispo);
        const motMelange = melangerMot(mot);

        await ovl.sendMessage(ms_org, {
          text:
            `🎯 Tour de @${joueur.id.split("@")[0]}\n` +
            `🔀 Mot mélangé : *${motMelange}*\n` +
            `💡 Indice : ${mot.length} lettres, commence par *${mot[0].toUpperCase()}*\n` +
            `⏱️ 20 secondes pour répondre !`,
          mentions: [joueur.id],
        });

        let correct = false;
        const debutReponse = Date.now();
        
        try {
          const rep = await ovl.recup_msg({ 
            ms_org, 
            auteur: joueur.id, 
            temps: 20000 
          });
          
          const txt = (rep?.message?.conversation || rep?.message?.extendedTextMessage?.text || "").trim();
          const auteurRep = await getJid(rep?.key?.participant || rep?.key?.remoteJid || rep?.message?.senderKey, ms_org, ovl);

          if (auteurRep !== joueur.id) {
            throw new Error("Mauvais joueur");
          }

          if (txt.toLowerCase() === "stop" && auteurRep === createur) {
            partieAnnulee = true;
            await ovl.sendMessage(ms_org, {
              text: `🛑 Partie arrêtée par @${createur.split("@")[0]}`,
              mentions: [createur],
            });
            return;
          }

          if (normaliserTexte(txt) === normaliserTexte(mot)) {
            joueur.score++;
            correct = true;
            reussitesCeTour++;
            await ovl.sendMessage(ms_org, {
              text: `✅ Excellent @${joueur.id.split("@")[0]} ! Le mot était *${mot}*`,
              mentions: [joueur.id],
            });
          } else {
            await ovl.sendMessage(ms_org, {
              text: `❌ Dommage @${joueur.id.split("@")[0]} ! Vous avez dit "${txt}" mais c'était *${mot}*`,
              mentions: [joueur.id],
            });
          }
        } catch (error) {
          await ovl.sendMessage(ms_org, {
            text: `⏰ Temps écoulé ! @${joueur.id.split("@")[0]} est éliminé... Le mot était *${mot}*`,
            mentions: [joueur.id],
          });
        }

        if (!correct) joueur.elimine = true;
        
        await new Promise(resolve => setTimeout(resolve, 1500));
      }

      joueursActifs = joueursActifs.filter(j => !j.elimine);

      if (partieAnnulee) return;

      if (reussitesCeTour === 0) {
        await ovl.sendMessage(ms_org, {
          text: `💥 Aucun joueur n'a trouvé au tour ${tour}. Fin de la partie !`,
        });
        break;
      }

      if (joueursActifs.length > 1) {
        tour++;
        await ovl.sendMessage(ms_org, {
          text: 
            `📊 *Fin du tour ${tour - 1}*\n` +
            `✅ Survivants : ${joueursActifs.map(j => `@${j.id.split("@")[0]}`).join(", ")}\n` +
            `⬆️ Tour ${tour} - Difficulté accrue !`,
          mentions: joueursActifs.map(j => j.id),
        });
        
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }

    let final = "";
    
    if (joueursActifs.length === 1) {
      final = `🏆 *VICTOIRE !*\n\n` +
              `👑 Vainqueur : @${joueursActifs[0].id.split("@")[0]}\n` +
              `🎯 Score final : ${joueursActifs[0].score} point(s)\n` +
              `📈 Tours complétés : ${tour}\n\n`;
    } else if (joueursActifs.length === 0) {
      final = `💥 *Fin de Partie - Aucun survivant !*\n\n`;
    } else {
      final = `🏁 *Fin de Partie*\n\n`;
    }

    final += `📊 *Classement Final :*\n`;
    const scoresTries = [...joueurs.values()].sort((a, b) => b.score - a.score);
    
    scoresTries.forEach((j, index) => {
      const medaille = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "  ";
      final += `${medaille} @${j.id.split("@")[0]} : ${j.score} point(s)\n`;
    });

    final += `\n🎮 Merci d'avoir joué ! Tapez *dmots* pour rejouer.`;

    await ovl.sendMessage(ms_org, {
      text: final,
      mentions: [...joueurs.keys()],
    });
  }
);

ovlcmd(
  {
    nom_cmd: "wcg",
    classe: "OVL-GAMES",
    react: "🎯",
    desc: "Word Chain Game - Survivez en trouvant des mots !",
  },
  async (ms_org, ovl, { repondre, auteur_Message, prenium_id, getJid }) => {
    const joueurs = new Map();
    const debutInscription = Date.now();
    const motsUtilises = new Set();

    async function verifierMotExiste(mot) {
  try {
    const motNormalise = mot;
    const url = `https://fr.wiktionary.org/wiki/${encodeURIComponent(motNormalise)}`;

    const response = await fetch(url);
    if (!response.ok) return false;

    const html = await response.text();

    if (html.includes("Pas de résultat pour")) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

    joueurs.set(auteur_Message, { id: auteur_Message, score: 0 });
    const createur = auteur_Message || prenium_id;

    await ovl.sendMessage(ms_org, {
      text:
        "╔════════════════╗\n" +
        "   🎮 WORD CHAIN GAME\n" +
        "╚════════════════╝\n\n" +
        "📝 Trouvez des mots valides\n" +
        "🎯 Dernier survivant gagne\n" +
        "💬 'join' pour rejoindre\n" +
        "🚀 'start' pour lancer\n" +
        "🛑 'stop' pour annuler\n\n" +
        "⏳ Inscription : 60s",
    });

    const rappelTemps = [45000, 30000, 15000];
    const rappelEnvoyes = new Set();
    let partieCommencee = false;
    let partieAnnulee = false;

    const timerInterval = setInterval(async () => {
      const restant = 60000 - (Date.now() - debutInscription);
      if (restant <= 0 || partieCommencee || partieAnnulee) return clearInterval(timerInterval);
      const secondesRestantes = Math.floor(restant / 1000);
      for (let t of rappelTemps) {
        if (secondesRestantes === t / 1000 && !rappelEnvoyes.has(t)) {
          rappelEnvoyes.add(t);
          await ovl.sendMessage(ms_org, {
            text: `⏰ Plus que ${t / 1000}s pour rejoindre !`,
          });
        }
      }
    }, 1000);

    while (Date.now() - debutInscription < 60000 && !partieCommencee && !partieAnnulee) {
      try {
        const rep = await ovl.recup_msg({ ms_org, temps: 60000 - (Date.now() - debutInscription) });
        const msg = (rep?.message?.conversation || rep?.message?.extendedTextMessage?.text || "").trim().toLowerCase();
        const auteurLid = rep?.key?.participant || rep?.key?.remoteJid || rep?.message?.senderKey;
        const auteur = await getJid(auteurLid, ms_org, ovl);
        
        if (msg === "join" && auteur && !joueurs.has(auteur)) {
          joueurs.set(auteur, { id: auteur, score: 0 });
          await ovl.sendMessage(ms_org, {
            text: `✅ @${auteur.split("@")[0]} a rejoint la partie !\n👥 Total : ${joueurs.size} joueur${joueurs.size > 1 ? 's' : ''}`,
            mentions: [auteur],
          });
        } else if (msg === "start" && auteur === createur) {
          if (joueurs.size < 2) {
            await ovl.sendMessage(ms_org, {
              text: `❌ Minimum 2 joueurs requis\n📊 Actuellement : ${joueurs.size}`,
            });
          } else {
            partieCommencee = true;
            clearInterval(timerInterval);
            break;
          }
        } else if (msg === "stop" && auteur === createur) {
          partieAnnulee = true;
          clearInterval(timerInterval);
          await ovl.sendMessage(ms_org, {
            text: `🛑 Partie annulée par @${auteur.split("@")[0]}`,
            mentions: [auteur],
          });
          return;
        }
      } catch {}
    }

    if (partieAnnulee) return;

    if (!partieCommencee) {
      if (joueurs.size < 2) {
        await repondre("❌ Pas assez de joueurs");
        return;
      }
      partieCommencee = true;
      clearInterval(timerInterval);
    }

    await ovl.sendMessage(ms_org, {
      text:
        `╔═════════════╗\n` +
        `    🚀 DÉBUT DU JEU\n` +
        `╚═════════════╝\n\n` +
        `👥 Joueurs (${joueurs.size}) :\n` +
        `${[...joueurs.values()].map(j => `  • @${j.id.split("@")[0]}`).join('\n')}\n\n` +
        `🎯 Bonne chance à tous !`,
      mentions: [...joueurs.keys()],
    });

    await new Promise(resolve => setTimeout(resolve, 2000));

    let tour = 1;
    let joueursActifs = [...joueurs.values()];
    let victoire25Lettres = false;

    const getLongueursParTour = (t) => {
      if (t === 1) return [3, 4];
      if (t === 2) return [4, 5, 6];
      if (t === 3) return [5, 6, 7];
      if (t === 4) return [6, 7, 8];
      if (t === 5) return [7, 8, 9];
      if (t === 6) return [8, 9, 10];
      if (t === 7) return [9, 10, 11];
      if (t === 8) return [10, 11, 12];
      if (t === 9) return [11, 12, 13];
      if (t === 10) return [12, 13, 14];
      if (t === 11) return [13, 14, 15];
      if (t === 12) return [14, 15, 16];
      if (t === 13) return [15, 16, 17];
      if (t === 14) return [16, 17, 18];
      if (t === 15) return [18, 19, 20];
      if (t === 16) return [20, 21, 22];
      if (t === 17) return [22, 23, 24];
      return [25];
    };

    const getTempsParTour = (t) => {
      if (t <= 4) return 10000;
      if (t <= 6) return 15000;
      if (t <= 8) return 18000;
      if (t <= 10) return 20000;
      if (t <= 14) return 25000;
      return 30000;
    };

    while (joueursActifs.length > 1 && !partieAnnulee && !victoire25Lettres) {
      const joueursCeTour = [...joueursActifs];
      let reussitesCeTour = 0;
      const tempsReponse = getTempsParTour(tour);
      const secondes = Math.floor(tempsReponse / 1000);

      await ovl.sendMessage(ms_org, {
        text:
          `\n━━━━━━━━━━━━━━━\n` +
          `   🎯 TOUR ${tour}\n` +
          `━━━━━━━━━━━━━━━━\n` +
          `👥 ${joueursActifs.length} survivant${joueursActifs.length > 1 ? 's' : ''}\n` +
          `⏱️ ${secondes}s par mot`,
      });

      await new Promise(resolve => setTimeout(resolve, 1500));

      for (const joueur of joueursCeTour) {
        const longueursDisponibles = getLongueursParTour(tour);
        const longueurDemandee = longueursDisponibles[Math.floor(Math.random() * longueursDisponibles.length)];

        await ovl.sendMessage(ms_org, {
          text:
            `┌────── TOUR ─────┐\n` +
            `│ @${joueur.id.split("@")[0]}\n` +
            `│ Longueur : ${longueurDemandee} lettres\n` +
            `└───────────────┘\n` +
            `⏰ ${secondes} secondes !`,
          mentions: [joueur.id],
        });

        let correct = false;
        
        try {
          const rep = await ovl.recup_msg({ 
            ms_org, 
            auteur: joueur.id, 
            temps: tempsReponse
          });
          
          const txt = (rep?.message?.conversation || rep?.message?.extendedTextMessage?.text || "").trim();
          const auteurRep = await getJid(rep?.key?.participant || rep?.key?.remoteJid || rep?.message?.senderKey, ms_org, ovl);

          if (auteurRep !== joueur.id) {
            throw new Error("Mauvais joueur");
          }

          if (txt.toLowerCase() === "stop" && auteurRep === createur) {
            partieAnnulee = true;
            await ovl.sendMessage(ms_org, {
              text: `🛑 Partie interrompue`,
            });
            return;
          }

          const motPropose = normaliserTexte(txt);

          if (motPropose.length < longueurDemandee) {
            await ovl.sendMessage(ms_org, {
              text:
                `❌ Éliminé : @${joueur.id.split("@")[0]}\n` +
                `Raison : Longueur incorrecte (${motPropose.length} < ${longueurDemandee})`,
              mentions: [joueur.id],
            });
          } else if (motsUtilises.has(motPropose)) {
            await ovl.sendMessage(ms_org, {
              text:
                `❌ Éliminé : @${joueur.id.split("@")[0]}\n` +
                `Raison : Mot déjà utilisé`,
              mentions: [joueur.id],
            });
          } else {
            const existe = await verifierMotExiste(motPropose);
            
            if (existe) {
              motsUtilises.add(motPropose);
              joueur.score++;
              correct = true;
              reussitesCeTour++;
              
              if (longueurDemandee === 25) {
                victoire25Lettres = true;
                await ovl.sendMessage(ms_org, {
                  text:
                    `\n🏆🏆🏆 EXPLOIT ! 🏆🏆🏆\n\n` +
                    `@${joueur.id.split("@")[0]} a trouvé un mot de 25 lettres !\n` +
                    `Mot : *${txt.toUpperCase()}*\n\n` +
                    `🎉 VICTOIRE ABSOLUE !`,
                  mentions: [joueur.id],
                });
                break;
              } else {
                await ovl.sendMessage(ms_org, {
                  text: `✅ *${txt.toUpperCase()}* validé !`,
                });
              }
            } else {
              await ovl.sendMessage(ms_org, {
                text:
                  `❌ Éliminé : @${joueur.id.split("@")[0]}\n` +
                  `Raison : Mot inexistant`,
                mentions: [joueur.id],
              });
            }
          }
        } catch (error) {
          await ovl.sendMessage(ms_org, {
            text:
              `⏰ Temps écoulé : @${joueur.id.split("@")[0]}\n` +
              `Éliminé !`,
            mentions: [joueur.id],
          });
        }

        if (!correct) joueur.elimine = true;
        
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      if (victoire25Lettres) break;

      joueursActifs = joueursActifs.filter(j => !j.elimine);

      if (partieAnnulee) return;

      if (reussitesCeTour === 0) {
        await ovl.sendMessage(ms_org, {
          text: `\n💥 Aucun survivant au tour ${tour}\nFin de partie !`,
        });
        break;
      }

      if (joueursActifs.length > 1) {
        tour++;
        await ovl.sendMessage(ms_org, {
          text:
            `\n✅ Survivants :\n` +
            `${joueursActifs.map(j => `  • @${j.id.split("@")[0]}`).join('\n')}\n\n` +
            `⏭️ Passage au tour ${tour}...`,
          mentions: joueursActifs.map(j => j.id),
        });
        await new Promise(resolve => setTimeout(resolve, 2500));
      }
    }

    let final = "";
    
    if (victoire25Lettres) {
      const vainqueurs = joueursActifs.filter(j => !j.elimine);
      if (vainqueurs.length === 1) {
        final =
          `\n╔══════════════════╗\n` +
          `   🏆 VICTOIRE TOTALE 🏆\n` +
          `╚══════════════════╝\n\n` +
          `👑 Champion ultime : @${vainqueurs[0].id.split("@")[0]}\n` +
          `🎯 Score : ${vainqueurs[0].score} mot${vainqueurs[0].score > 1 ? 's' : ''}\n` +
          `📈 Tours : ${tour}\n` +
          `🏅 Exploit : Mot de 25 lettres !\n\n`;
      } else {
        final =
          `\n╔══════════════════╗\n` +
          `   🏆 VICTOIRE TOTALE 🏆\n` +
          `╚══════════════════╝\n\n` +
          `👑 Champions : ${vainqueurs.map(v => `@${v.id.split("@")[0]}`).join(', ')}\n` +
          `📈 Tours : ${tour}\n` +
          `🏅 Exploit : Mots de 25 lettres !\n\n`;
      }
    } else if (joueursActifs.length === 1) {
      final =
        `\n╔══════════════════╗\n` +
        `     👑 VICTOIRE ! 👑\n` +
        `╚══════════════════╝\n\n` +
        `🏆 Vainqueur : @${joueursActifs[0].id.split("@")[0]}\n` +
        `🎯 Score : ${joueursActifs[0].score} mot${joueursActifs[0].score > 1 ? 's' : ''}\n` +
        `📈 Tours complétés : ${tour}\n\n`;
    } else {
      final = `\n💥 Fin de partie - Aucun survivant\n\n`;
    }

    const scoresTries = [...joueurs.values()].sort((a, b) => b.score - a.score);
    
    final += `━━━━━━━━━━━━━━━━━━━\n📊 CLASSEMENT FINAL\n━━━━━━━━━━━━━━━━━━━\n\n`;
    
    scoresTries.forEach((j, index) => {
      const medaille = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `${index + 1}.`;
      final += `${medaille} @${j.id.split("@")[0]} : ${j.score} mot${j.score > 1 ? 's' : ''}\n`;
    });

    final += `\n🎮 Tapez 'wcg' pour rejouer !`;

    await ovl.sendMessage(ms_org, {
      text: final,
      mentions: [...joueurs.keys()],
    });
  }
);

ovlcmd(
  {
    nom_cmd: "pendu",
    classe: "OVL-GAMES",
    react: "🎯",
    desc: "Jouez à plusieurs au jeu du Pendu",
  },
  async (ms_org, ovl, { repondre, auteur_Message, prenium_id, getJid }) => {
    const joueurs = new Map();
    const debutInscription = Date.now();
    let mots = [];

    try {
      const rawData = fs.readFileSync('./lib/mots.json', 'utf8');
      mots = JSON.parse(rawData);
      mots = mots.filter(m => m.length >= 5 && m.length <= 10).sort(() => Math.random() - 0.5);
    } catch (e) {
      return repondre("❌ Impossible de récupérer les mots.");
    }

    function normaliserTexte(texte) {
      return texte
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z]/g, "")
        .trim();
    }

    const dessinerPendu = (erreurs) => {
      const etapes = [
        `
  ____
  |  |
  |  
  | 
  | 
  |
__|__`,
        `
  ____
  |  |
  |  O
  | 
  | 
  |
__|__`,
        `
  ____
  |  |
  |  O
  |  |
  | 
  |
__|__`,
        `
  ____
  |  |
  |  O
  | /|
  | 
  |
__|__`,
        `
  ____
  |  |
  |  O
  | /|\\
  | 
  |
__|__`,
        `
  ____
  |  |
  |  O
  | /|\\
  | /
  |
__|__`,
        `
  ____
  |  |
  |  O
  | /|\\
  | / \\
  |
__|__ 💀`
      ];
      return etapes[erreurs] || etapes[0];
    };

    joueurs.set(auteur_Message, { id: auteur_Message, score: 0, elimine: false });
    const createur = auteur_Message || prenium_id;

    await ovl.sendMessage(ms_org, {
      text:
        "🎮 *Jeu du PENDU - MULTIJOUEURS* 🎮\n\n" +
        "Devinez le mot lettre par lettre !\n" +
        "Tapez 'join' pour participer !\n" +
        "🆕 Tapez 'start' pour commencer (créateur)\n" +
        "❌ Tapez 'stop' pour annuler (créateur)\n" +
        "⏳ Temps d'inscription : 60s\n" +
        "💀 Maximum 6 erreurs par mot !",
    });

    const rappelTemps = [45000, 30000, 15000];
    const rappelEnvoyes = new Set();
    let partieCommencee = false;
    let partieAnnulee = false;

    const timerInterval = setInterval(async () => {
      const restant = 60000 - (Date.now() - debutInscription);
      if (restant <= 0 || partieCommencee || partieAnnulee) return clearInterval(timerInterval);
      const secondesRestantes = Math.floor(restant / 1000);
      for (let t of rappelTemps) {
        if (secondesRestantes === t / 1000 && !rappelEnvoyes.has(t)) {
          rappelEnvoyes.add(t);
          await ovl.sendMessage(ms_org, {
            text: `⏰ Plus que ${t / 1000}s pour rejoindre !`,
          });
        }
      }
    }, 1000);

    while (Date.now() - debutInscription < 60000 && !partieCommencee && !partieAnnulee) {
      try {
        const rep = await ovl.recup_msg({ ms_org, temps: 60000 - (Date.now() - debutInscription) });
        const msg = (rep?.message?.conversation || rep?.message?.extendedTextMessage?.text || "").trim().toLowerCase();
        const auteurLid = rep?.key?.participant || rep?.key?.remoteJid || rep?.message?.senderKey;
        const auteur = await getJid(auteurLid, ms_org, ovl);
        
        if (msg === "join" && auteur && !joueurs.has(auteur)) {
          joueurs.set(auteur, { id: auteur, score: 0, elimine: false });
          await ovl.sendMessage(ms_org, {
            text: `✅ @${auteur.split("@")[0]} a rejoint ! (${joueurs.size} joueur${joueurs.size > 1 ? 's' : ''})`,
            mentions: [auteur],
          });
        } else if (msg === "start" && auteur === createur) {
          if (joueurs.size < 2) {
            await ovl.sendMessage(ms_org, {
              text: `❌ Minimum 2 joueurs requis. (Actuellement : ${joueurs.size})`,
              mentions: [auteur],
            });
          } else {
            partieCommencee = true;
            clearInterval(timerInterval);
            break;
          }
        } else if (msg === "stop" && auteur === createur) {
          partieAnnulee = true;
          clearInterval(timerInterval);
          await ovl.sendMessage(ms_org, {
            text: `🛑 Partie annulée par @${auteur.split("@")[0]}`,
            mentions: [auteur],
          });
          return;
        }
      } catch {}
    }

    if (partieAnnulee) return;

    if (!partieCommencee) {
      if (joueurs.size < 2) {
        await repondre("❌ Pas assez de joueurs. Partie annulée.");
        return;
      }
      partieCommencee = true;
      clearInterval(timerInterval);
    }

    await ovl.sendMessage(ms_org, {
      text:
        `🚀 *Début de la Partie*\n` +
        `👥 Joueurs (${joueurs.size}) : ${[...joueurs.values()].map(j => `@${j.id.split("@")[0]}`).join(", ")}\n` +
        `📝 Proposez des lettres à tour de rôle\n` +
        `⏱️ 15 secondes par lettre\n` +
        `🎯 Dernier survivant gagne !\n` +
        `Bonne chance ! 🍀`,
      mentions: [...joueurs.keys()],
    });

    let manche = 1;
    const motsUtilises = new Set();
    let joueursActifs = [...joueurs.values()];

    while (joueursActifs.length > 1 && !partieAnnulee) {
      const motsDisponibles = mots.filter(m => !motsUtilises.has(normaliserTexte(m)));
      if (motsDisponibles.length === 0) break;

      const motSecret = motsDisponibles[Math.floor(Math.random() * motsDisponibles.length)];
      motsUtilises.add(normaliserTexte(motSecret));
      
      const motNormalise = normaliserTexte(motSecret);
      let lettresTrouvees = new Set();
      let lettresEssayees = new Set();
      let erreurs = 0;
      const maxErreurs = 6;
      
      const afficherMot = () => {
        return motSecret.split('').map(c => {
          const cn = normaliserTexte(c);
          return lettresTrouvees.has(cn) ? c.toUpperCase() : '_';
        }).join(' ');
      };

      const motComplet = () => {
        return motSecret.split('').every(c => lettresTrouvees.has(normaliserTexte(c)));
      };

      await ovl.sendMessage(ms_org, {
        text:
          `\n━━━━━━━━━━━━━━━━━━\n` +
          `🎯 *MANCHE ${manche}*\n` +
          `━━━━━━━━━━━━━━━━━━\n\n` +
          `👥 ${joueursActifs.length} survivant${joueursActifs.length > 1 ? 's' : ''}\n` +
          `📏 Longueur : ${motSecret.length} lettres\n` +
          `❤️ Vies : ${maxErreurs}\n\n` +
          `Mot : ${afficherMot()}\n\n` +
          `🎮 Proposez une lettre !`,
      });

      let indexJoueur = 0;
      let motTrouve = false;
      const joueursEliminairesCeMot = new Set();

      while (erreurs < maxErreurs && !motComplet() && !partieAnnulee) {
        const joueur = joueursActifs[indexJoueur % joueursActifs.length];

        if (joueursEliminairesCeMot.has(joueur.id)) {
          indexJoueur++;
          continue;
        }

        await ovl.sendMessage(ms_org, {
          text:
            `\n${dessinerPendu(erreurs)}\n\n` +
            `Mot : ${afficherMot()}\n` +
            `❌ Erreurs : ${erreurs}/${maxErreurs}\n` +
            `📝 Essayées : ${lettresEssayees.size > 0 ? Array.from(lettresEssayees).join(', ').toUpperCase() : 'aucune'}\n\n` +
            `🎯 Tour de @${joueur.id.split("@")[0]}\n` +
            `💬 Proposez UNE lettre (15s)`,
          mentions: [joueur.id],
        });

        try {
          const rep = await ovl.recup_msg({ 
            ms_org, 
            auteur: joueur.id, 
            temps: 15000 
          });
          
          const txt = (rep?.message?.conversation || rep?.message?.extendedTextMessage?.text || "").trim();
          const auteurRep = await getJid(rep?.key?.participant || rep?.key?.remoteJid || rep?.message?.senderKey, ms_org, ovl);

          if (auteurRep !== joueur.id) {
            indexJoueur++;
            continue;
          }

          if (txt.toLowerCase() === "stop" && auteurRep === createur) {
            partieAnnulee = true;
            await ovl.sendMessage(ms_org, {
              text: `🛑 Partie arrêtée par @${createur.split("@")[0]}`,
              mentions: [createur],
            });
            return;
          }

          const lettre = normaliserTexte(txt);

          if (lettre.length !== 1) {
            await ovl.sendMessage(ms_org, {
              text: `⚠️ @${joueur.id.split("@")[0]}, une seule lettre SVP !`,
              mentions: [joueur.id],
            });
            continue;
          }

          if (lettresEssayees.has(lettre)) {
            await ovl.sendMessage(ms_org, {
              text: `⚠️ @${joueur.id.split("@")[0]}, "${lettre.toUpperCase()}" déjà essayée !`,
              mentions: [joueur.id],
            });
            continue;
          }

          lettresEssayees.add(lettre);

          if (motNormalise.includes(lettre)) {
            lettresTrouvees.add(lettre);
            joueur.score++;
            await ovl.sendMessage(ms_org, {
              text: `✅ Bien joué @${joueur.id.split("@")[0]} ! "${lettre.toUpperCase()}" est dans le mot ! (+1 pt)`,
              mentions: [joueur.id],
            });
          } else {
            erreurs++;
            await ovl.sendMessage(ms_org, {
              text: `❌ Dommage @${joueur.id.split("@")[0]}... "${lettre.toUpperCase()}" n'est pas dans le mot.`,
              mentions: [joueur.id],
            });
          }

          if (motComplet()) {
            motTrouve = true;
            joueur.score += 3;
            await ovl.sendMessage(ms_org, {
              text:
                `\n🎉 *MOT TROUVÉ !* 🎉\n\n` +
                `Mot : *${motSecret.toUpperCase()}*\n\n` +
                `👑 @${joueur.id.split("@")[0]} a trouvé la dernière lettre ! (+3 pts bonus)\n` +
                `✅ Erreurs : ${erreurs}/${maxErreurs}`,
              mentions: [joueur.id],
            });
            break;
          }

          indexJoueur++;
        } catch {
          joueursEliminairesCeMot.add(joueur.id);
          joueur.elimine = true;
          await ovl.sendMessage(ms_org, {
            text: `⏰ Temps écoulé ! @${joueur.id.split("@")[0]} est éliminé !`,
            mentions: [joueur.id],
          });
          indexJoueur++;
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      if (partieAnnulee) return;

      if (!motTrouve && erreurs >= maxErreurs) {
        await ovl.sendMessage(ms_org, {
          text:
            `\n${dessinerPendu(maxErreurs)}\n\n` +
            `💀 *PENDU !*\n\n` +
            `Le mot était : *${motSecret.toUpperCase()}*\n` +
            `Tous les survivants continuent...`,
        });
      }

      joueursActifs = joueursActifs.filter(j => !j.elimine);

      if (joueursActifs.length <= 1) break;

      manche++;
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      await ovl.sendMessage(ms_org, {
        text:
          `\n━━━━━━━━━━━━━━━━━━\n` +
          `📊 Fin de la manche ${manche - 1}\n` +
          `━━━━━━━━━━━━━━━━━━\n\n` +
          `✅ Survivants : ${joueursActifs.map(j => `@${j.id.split("@")[0]}`).join(', ')}\n\n` +
          `⏭️ Manche ${manche} dans 3s...`,
        mentions: joueursActifs.map(j => j.id),
      });
      
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    let final = `\n━━━━━━━━━━━━━━━━━━━━━━\n🏆 *FIN DE LA PARTIE* 🏆\n━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    const scoresTries = [...joueurs.values()].sort((a, b) => b.score - a.score);
    
    if (joueursActifs.length === 1) {
      final += `👑 *VAINQUEUR* : @${joueursActifs[0].id.split("@")[0]} avec ${joueursActifs[0].score} points !\n`;
      final += `📈 Manches jouées : ${manche}\n\n`;
    } else if (joueursActifs.length > 1) {
      final += `🏆 *SURVIVANTS* : ${joueursActifs.map(j => `@${j.id.split("@")[0]}`).join(', ')}\n`;
      final += `📈 Manches jouées : ${manche}\n\n`;
    } else {
      final += `💀 Aucun survivant !\n📈 Manches jouées : ${manche}\n\n`;
    }

    final += `📊 *Classement Final :*\n`;
    scoresTries.forEach((j, index) => {
      const medaille = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "  ";
      final += `${medaille} @${j.id.split("@")[0]} : ${j.score} point(s)\n`;
    });

    final += `\n🎮 GG à tous ! Tapez *pendu* pour rejouer.`;

    await ovl.sendMessage(ms_org, {
      text: final,
      mentions: [...joueurs.keys()],
    });
  }
);

