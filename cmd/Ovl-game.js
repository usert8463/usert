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

          const tempsReponse = ((Date.now() - debutReponse) / 1000).toFixed(1);

          if (normaliserTexte(txt) === normaliserTexte(mot)) {
            joueur.score++;
            correct = true;
            reussitesCeTour++;
            await ovl.sendMessage(ms_org, {
              text: `✅ Excellent @${joueur.id.split("@")[0]} ! Le mot était *${mot}* (${tempsReponse}s)`,
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

