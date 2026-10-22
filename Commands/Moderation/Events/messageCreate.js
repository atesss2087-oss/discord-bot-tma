const { EmbedBuilder } = require('discord.js');
const badWordsSchema = require('../../Models/badWordsSchema');
const FuzzySet = require('fuzzyset');

module.exports = {
    name: 'messageCreate',

    async execute(message) {
        if (!message.guild || message.author.bot) return;

        const settings = await badWordsSchema.findOne({ Guild: message.guild.id });
        if (!settings || !settings.ProtectionEnabled) return;

        const swearWords = settings.SwearWords || [];
        if (swearWords.length === 0) return;

        const swearWordsSet = FuzzySet(swearWords);
        const threshold = 0.7; // Benzerlik eşik değeri

        const messageContent = message.content.toLowerCase();
        const words = messageContent.split(/\s+/);

        const logChannelId = settings.LogChannel;
        const logChannel = message.guild.channels.cache.get(logChannelId);

        const embed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('⚠️ Küfür Tespit Edildi!')
            .setDescription(`**Üye:** ${message.author.tag} (${message.author})\n**Mesaj:** \`${message.content}\``)
            .setTimestamp();

        let küfürBulundu = false;

        // Kelime kelime kontrol
        if (words.length >= 1) {
            for (const word of words) {
                const result = swearWordsSet.get(word);
                if (result && result[0][0] >= threshold) {
                    küfürBulundu = true;
                    break;
                }
            }
        }

        // Tüm cümlenin bütün olarak kontrolü
        if (!küfürBulundu) {
            const result2 = swearWordsSet.get(messageContent);
            if (result2 && result2[0][0] >= threshold) {
                küfürBulundu = true;
            }
        }

        if (küfürBulundu) {
            try {
                if (message.deletable) await message.delete();
                await message.channel.send(`${message.author}, küfür etmek yasaktır! 🛑`).then(msg => {
                    setTimeout(() => msg.delete().catch(() => {}), 5000);
                });

                if (logChannel) {
                    await logChannel.send({ embeds: [embed] });
                }
            } catch (err) {
                console.error('Küfür engellenirken hata oluştu:', err);
            }
        }
    }
};
