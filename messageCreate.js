const { EmbedBuilder } = require('discord.js');
const badWordsSchema = require('../../Models/badWordsSchema');
const FuzzySet = require('fuzzyset');

// Spam kontrolü için hafıza
const userMessageMap = new Map();

module.exports = {
    name: 'messageCreate',

    async execute(message) {
        if (!message.guild || message.author.bot) return;

        const userId = message.author.id;
        const content = message.content;
        const lowerContent = content.toLowerCase();

        // 1. SPAM VE ARD ARDA MESAJ KORUMASI
        if (message.member && !message.member.permissions.has('Administrator')) {
            const now = Date.now();
            if (!userMessageMap.has(userId)) userMessageMap.set(userId, []);
            const timestamps = userMessageMap.get(userId);
            timestamps.push(now);
            const recentMessages = timestamps.filter(time => now - time < 3000); // Son 3 saniye
            userMessageMap.set(userId, recentMessages);
            
            if (recentMessages.length >= 4) {
                try {
                    await message.delete();
                    if (message.member.moderatable) {
                        await message.member.timeout(2 * 60 * 1000, "Spam / Ard arda mesaj");
                    }
                    const warningMsg = await message.channel.send(`${message.author}, ard arda hızlı mesaj (spam) yaptığın için 2 dakika susturuldun!`);
                    setTimeout(() => warningMsg.delete().catch(() => {}), 5000);
                    return;
                } catch (err) {}
            }
        }

        // 2. VERİTABANI VE KÜFÜR KORUMA KONTROLÜ
        const settings = await badWordsSchema.findOne({ Guild: message.guild.id });
        if (!settings || !settings.ProtectionEnabled) return;

        // Eklediğin kısaltmalar (mq, aw, aq, hdabla vb.) dahil genişletilmiş küfür listesi
        const defaultBadWords = [
            "amk", "aq", "aw", "mq", "hdabla", "sik", "sikti", "siktir", "sikim", "sokuk", 
            "yarrak", "yarak", "orospu", "orosbu", "pezevenk", "şerefsiz", "kahpe", 
            "göt", "got", "ibne", "ipne", "puşt", "pust", "mal", "porno", "porn", 
            "sex", "seks", "31", "sidik", "meme", "göğüs", "ananı", "anani"
        ];

        const dbWords = settings.SwearWords || [];
        const allBadWords = [...new Set([...defaultBadWords, ...dbWords])];

        const swearWordsSet = FuzzySet(allBadWords);
        const threshold = 0.65; // Benzerlik eşik değeri (kaçakları önlemek için hassaslaştırıldı)

        const words = lowerContent.split(/\s+/);
        const logChannelId = settings.LogChannel;
        const logChannel = message.guild.channels.cache.get(logChannelId);

        let küfürBulundu = false;

        // Kelime kelime ve bütün cümle olarak tarama
        for (const word of words) {
            const result = swearWordsSet.get(word);
            if (result && result[0][0] >= threshold) {
                küfürBulundu = true;
                break;
            }
        }

        if (!küfürBulundu) {
            const result2 = swearWordsSet.get(lowerContent);
            if (result2 && result2[0][0] >= threshold) {
                küfürBulundu = true;
            }
        }

        if (küfürBulundu) {
            try {
                // Mesajı anında sil
                if (message.deletable) await message.delete();

                // Üyeye 3 dakika timeout (susturma) at
                if (message.member && message.member.moderatable) {
                    await message.member.timeout(3 * 60 * 1000, "Küfür / Uygunsuz Kelime");
                }

                // Uyarı mesajı (Sadece o anki kanala atılır, 5 saniye sonra otomatik silinir)
                const warningMsg = await message.channel.send(`${message.author}, uygunsuz kelime kullandığın için mesajın silindi ve 3 dakika susturuldun! 🛑`);
                setTimeout(() => warningMsg.delete().catch(() => {}), 5000);

                // Log kanalına gönderilecek embed raporu
                if (logChannel) {
                    const embed = new EmbedBuilder()
                        .setColor(0xFF0000)
                        .setTitle('⚠️ Küfür / Uygunsuz İçerik Tespit Edildi!')
                        .setDescription(`**Üye:** ${message.author.tag} (${message.author})\n**Kanal:** ${message.channel}\n**Mesaj:** \`${message.content}\``)
                        .setTimestamp();

                    await logChannel.send({ embeds: [embed] });
                }
            } catch (err) {
                console.error('Küfür engellenirken hata oluştu:', err);
            }
        }
    }
};
