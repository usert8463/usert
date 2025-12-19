const { WA_CONF } = require('../../DataBase/wa_conf');

async function like_status(ovl, ms, ms_org, id_Bot, auteur_Message) {
    try {
        const settings = await WA_CONF.findOne({ where: { id: '1' } });
        if (!settings) return;

        const emoji = settings.like_status;
        const isValid = emoji && emoji !== "non";

        if (ms_org === "status@broadcast" && isValid) {
            await ovl.sendMessage(ms_org, {
                react: {
                    key: ms.key,
                    text: emoji
                }
            }, {
                statusJidList: [auteur_Message, id_Bot],
                broadcast: true
            });
        }
    } catch (err) {
        console.error("Erreur dans like_status :", err);
    }
}

module.exports = like_status;
