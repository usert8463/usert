const { ovlcmd } = require("../lib/ovlcmd");
const axios = require("axios");
const fs = require("fs");
const child_process = require("child_process");

const reactions = {
    embrasser: {
        endpoint: "kiss",
        caption: "embrasse"
    },
    caliner: {
        endpoint: "cuddle",
        caption: "fait un câlin à"
    },
    tapoter: {
        endpoint: "pat",
        caption: "tapote"
    },
    frapper: {
        endpoint: "slap",
        caption: "gifle"
    },
    donner_un_coup: {
        endpoint: "punch",
        caption: "donne un coup à"
    },
    mordre: {
        endpoint: "bite",
        caption: "mord"
    },
    pousser: {
        endpoint: "kick",
        caption: "donne un coup de pied à"
    },
    calin_oreiller: {
        endpoint: "lappillow",
        caption: "utilise comme oreiller"
    },
    tenir_la_main: {
        endpoint: "handhold",
        caption: "tient la main de"
    },
    faire_un_bisou: {
        endpoint: "peck",
        caption: "fait un bisou à"
    },
    faire_un_baiser: {
        endpoint: "blowkiss",
        caption: "envoie un baiser à"
    },
    lecher: {
        endpoint: "lick",
        caption: "lèche"
    },
    chatouiller: {
        endpoint: "tickle",
        caption: "chatouille"
    },
    mignon: {
        endpoint: "nya",
        caption: "fait nya nya avec"
    },
    rougir: {
        endpoint: "blush",
        caption: "rougit devant"
    },
    sourire: {
        endpoint: "smile",
        caption: "sourit à"
    },
    rire: {
        endpoint: "laugh",
        caption: "rit avec"
    },
    heureux: {
        endpoint: "happy",
        caption: "est heureux avec"
    },
    triste: {
        endpoint: "cry",
        caption: "pleure avec"
    },
    dormir: {
        endpoint: "sleep",
        caption: "dort avec"
    },
    penser: {
        endpoint: "think",
        caption: "réfléchit à propos de"
    },
    confus: {
        endpoint: "confused",
        caption: "est confus à propos de"
    },
    choque: {
        endpoint: "shocked",
        caption: "est choqué par"
    },
    ennuyer: {
        endpoint: "bored",
        caption: "s'ennuie avec"
    },
    bouder: {
        endpoint: "pout",
        caption: "boude contre"
    },
    jaloux: {
        endpoint: "angry",
        caption: "se fâche contre"
    },
    faire_un_doigt: {
        endpoint: "nope",
        caption: "refuse catégoriquement"
    },
    hausser_les_epaules: {
        endpoint: "shrug",
        caption: "hausse les épaules devant"
    },
    saluer: {
        endpoint: "wave",
        caption: "salue"
    },
    applaudir: {
        endpoint: "clap",
        caption: "applaudit"
    },
    taper_dans_la_main: {
        endpoint: "highfive",
        caption: "fait un high-five à"
    },
    serrer_la_main: {
        endpoint: "handshake",
        caption: "serre la main de"
    },
    saluer_militaire: {
        endpoint: "salute",
        caption: "fait un salut militaire à"
    },
    hocher_la_tete: {
        endpoint: "nod",
        caption: "hoche la tête devant"
    },
    secouer: {
        endpoint: "shake",
        caption: "secoue"
    },
    danser: {
        endpoint: "dance",
        caption: "danse avec"
    },
    tourner: {
        endpoint: "spin",
        caption: "tourne autour de"
    },
    courir: {
        endpoint: "run",
        caption: "court avec"
    },
    agiter_la_queue: {
        endpoint: "wag",
        caption: "agite la queue devant"
    },
    faire_un_signe: {
        endpoint: "wink",
        caption: "fait un clin d'œil à"
    },
    bailler: {
        endpoint: "yawn",
        caption: "baille devant"
    },
    regarder: {
        endpoint: "stare",
        caption: "fixe"
    },
    regarder_avec_mepris: {
        endpoint: "smug",
        caption: "regarde avec arrogance"
    },
    faire_facepalm: {
        endpoint: "facepalm",
        caption: "fait un facepalm à cause de"
    },
    faire_le_tableflip: {
        endpoint: "tableflip",
        caption: "retourne la table à cause de"
    },
    frapper_dans_le_vide: {
        endpoint: "shoot",
        caption: "tire dans la direction de"
    },
    lancer: {
        endpoint: "yeet",
        caption: "lance"
    },
    jeter_un_sort: {
        endpoint: "bonk",
        caption: "donne un bonk à"
    },
    nourrir: {
        endpoint: "feed",
        caption: "nourrit"
    },
    porter: {
        endpoint: "carry",
        caption: "porte"
    },
    poser_sur_le_mur: {
        endpoint: "kabedon",
        caption: "coince contre le mur"
    },
    tapoter_la_tete: {
        endpoint: "poke",
        caption: "pique"
    },
    donner_un_coup_de_poing: {
        endpoint: "punch",
        caption: "frappe"
    },
    faire_un_calin: {
        endpoint: "hug",
        caption: "fait un gros câlin à"
    },
    faire_un_coucou: {
        endpoint: "bleh",
        caption: "tire la langue à"
    },
    tirer_la_langue: {
        endpoint: "bleh",
        caption: "tire la langue à"
    },
    montrer_le_pouce: {
        endpoint: "thumbsup",
        caption: "fait un pouce levé à"
    },
    faire_un_bisou_sur_le_front: {
        endpoint: "peck",
        caption: "embrasse doucement"
    },
    faire_un_calin_doux: {
        endpoint: "cuddle",
        caption: "serre tendrement dans ses bras"
    },
    applaudir_fort: {
        endpoint: "clap",
        caption: "applaudit fortement"
    },
    dormir_sur: {
        endpoint: "lurk",
        caption: "observe discrètement"
    },
    faire_semblant: {
        endpoint: "teehee",
        caption: "rigole discrètement avec"
    },
    reflechir: {
        endpoint: "think",
        caption: "réfléchit avec"
    },
    faire_non: {
        endpoint: "nope",
        caption: "dit non à"
    },
    etre_fier: {
        endpoint: "smug",
        caption: "se montre fier devant"
    },
    etre_surpris: {
        endpoint: "shocked",
        caption: "est surpris par"
    },
    etre_fache: {
        endpoint: "angry",
        caption: "est énervé contre"
    },
    etre_triste: {
        endpoint: "cry",
        caption: "est triste avec"
    },
    etre_heureux: {
        endpoint: "happy",
        caption: "est heureux avec"
    },
    faire_un_saut: {
        endpoint: "yeet",
        caption: "fait un mouvement brusque vers"
    },
    saluer_joyeusement: {
        endpoint: "wave",
        caption: "salue joyeusement"
    },
    faire_un_calme: {
        endpoint: "sleep",
        caption: "se repose avec"
    }
};

const aliases = {
    embeter: "poke",
    caliner: "cuddle",
    embrasser: "kiss",
    pleurer: "cry",
    rire: "laugh",
    dormir: "sleep",
    danser: "dance",
    frapper: "slap",
    mordre: "bite",
    pousser: "kick",
    tapoter: "pat",
    sourire: "smile",
    saluer: "wave",
    applaudir: "clap",
    regarder: "stare",
    penser: "think",
    nourrir: "feed",
    porter: "carry",
    courir: "run",
    secouer: "shake",
    rougir: "blush",
    bouder: "pout",
    choquer: "shocked",
    calin: "hug",
    highfive: "highfive",
    handshake: "handshake",
    clinoeil: "wink",
    bailler: "yawn",
    facepalm: "facepalm",
    tableflip: "tableflip",
    bonk: "bonk",
    tirer: "shoot",
    lancer: "yeet"
};

const headers = {
    "User-Agent": "OVL-MD-V2/1.0"
};

function generateCaption(action, auteur, cible) {
    return `@${auteur.split("@")[0]} ${action} @${cible.split("@")[0]}`;
}

function giftovidbuff(gifBuffer, outputPath) {
    return new Promise((resolve, reject) => {
        const inputPath = `${outputPath}.gif`;

        fs.writeFileSync(inputPath, gifBuffer);

        child_process.exec(
            `ffmpeg -y -i "${inputPath}" -movflags faststart -pix_fmt yuv420p "${outputPath}"`,
            (error) => {
                fs.unlink(inputPath, () => {});

                if (error) {
                    reject(error);
                    return;
                }

                resolve(outputPath);
            }
        );
    });
}

function getTargetJid(auteur_Message, getJid, auteur_Msg_Repondu) {
    if (auteur_Msg_Repondu) {
        return auteur_Msg_Repondu;
    }

    const mention = auteur_Message.match(/@(\d+)/);

    if (mention) {
        return getJid(`${mention[1]}@s.whatsapp.net`);
    }

    return null;
}

async function addReactionCommand(commandName, endpoint, captionText) {
    ovlcmd(
        {
            nom_cmd: commandName,
            categorie: "reactions",
            reaction: "🎭"
        },
        async (ms, arg, repondre, auteur_Message, getJid, auteur_Msg_Repondu) => {
            try {
                const cible = getTargetJid(
                    auteur_Message,
                    getJid,
                    auteur_Msg_Repondu
                );

                if (!cible) {
                    return repondre(
                        `Mentionne quelqu'un ou réponds à son message pour utiliser .${commandName}`
                    );
                }

                const apiUrl = `https://nekos.best/api/v2/${endpoint}`;

                const response = await axios.get(apiUrl, {
                    headers
                });

                const gifUrl = response.data?.results?.[0]?.url;

                if (!gifUrl) {
                    return repondre(
                        "Aucune animation n'a été trouvée pour cette réaction."
                    );
                }

                const gifResponse = await axios.get(gifUrl, {
                    responseType: "arraybuffer",
                    headers
                });

                const outputPath = `/tmp/ovl_${Date.now()}_${Math.random()
                    .toString(36)
                    .slice(2)}.mp4`;

                await giftovidbuff(
                    Buffer.from(gifResponse.data),
                    outputPath
                );

                const auteur = ms.key.participant || ms.key.remoteJid;

                const caption = generateCaption(
                    captionText,
                    auteur,
                    cible
                );

                await ms.sendMessage(
                    ms.key.remoteJid,
                    {
                        video: fs.readFileSync(outputPath),
                        gifPlayback: true,
                        caption,
                        mentions: [auteur, cible]
                    },
                    {
                        quoted: ms
                    }
                );

                fs.unlink(outputPath, () => {});
            } catch (error) {
                console.error(
                    `Erreur réaction ${commandName}:`,
                    error.message
                );

                repondre(
                    "Une erreur est survenue pendant la récupération de l'animation."
                );
            }
        }
    );
}

const registeredEndpoints = new Set();

(async () => {
    for (const [commandName, reaction] of Object.entries(reactions)) {
        const key = `${commandName}:${reaction.endpoint}`;

        if (registeredEndpoints.has(key)) {
            continue;
        }

        registeredEndpoints.add(key);

        await addReactionCommand(
            commandName,
            reaction.endpoint,
            reaction.caption
        );
    }

    for (const [commandName, endpoint] of Object.entries(aliases)) {
        const reaction = Object.values(reactions).find(
            item => item.endpoint === endpoint
        );

        if (!reaction) {
            continue;
        }

        const key = `${commandName}:${endpoint}`;

        if (registeredEndpoints.has(key)) {
            continue;
        }

        registeredEndpoints.add(key);

        await addReactionCommand(
            commandName,
            endpoint,
            reaction.caption
        );
    }
})();

