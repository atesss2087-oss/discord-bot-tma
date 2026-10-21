const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');

// --- 1. RENDER İÇİN EXPRESS SUNUCUSU ---
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Bot is running!');
});

app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});

// --- 2. DİSCORD BOTU AYARLARI ---
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
    ],
});

// Engellenecek kelimeler listesi
const badWords = [
    "amk", "aq", "aw", "mq", "öç", "oc", "oe", "öe", "piç", "pic",
    "pij", "sik", "sikti", "siktir", "sikim", "sikimden", "sikis",
    "sikiş", "sokuk", "yarrak", "yarak", "orospu", "orosbu", "pezevenk",
    "şerefsiz", "serefsiz", "kahpe", "göt", "got", "götveren", "dalyarak",
    "amcık", "amcik", "ibne", "ipne", "puşt", "pust", "testis", "penis",
    "vajina", "sperm", "porno", "porn", "seks", "sex", "sikik", "yarram",
    "ananı", "anani", "ananı sikeyim", "siktigimin", "fahişe", "fahise",
    "fuck", "shit", "bitch", "ass", "asshole", "bastard", "dick", "cunt",
    "pussy", "cock", "whore", "slut", "nsfw", "kill yourself", "kys",
    "sidik", "pipi", "daşşak", "vajna", "tayt", "don", "mal"
];

// Spam ve Seviye takibi için hafıza
const userMessageMap = new Map();
const userMessageCounts = new Map();
const userLevels = new Map();

// Yetkili Rol ID'si (Bu rol ve üstü komut kullanabilir)
const YETKILI_ROL_ID = '1533059872655151116';

client.once('clientReady', () => {
    console.log(`Bot çevrimiçi: ${client.user.tag}`);
});

// Yeni üye gelince karşılama mesajı
client.on('guildMemberAdd', (member) => {
    const kanalId = 'KANAL_ID_BURAYA'; // Kanal ID'ni buraya yazmalısın
    const kanal = member.guild.channels.cache.get(kanalId);
    if (kanal) {
        kanal.send(`Kampımıza hoş geldin reis, ${member}! :blue_heart:`);
    }
});

// Mesaj kontrolleri ve Komutlar
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const content = message.content;
    const lowerContent = content.toLowerCase();
    const userId = message.author.id;

    // --- RÜTBE (ROL) VER / AL KOMUTLARI ---
    if (content.startsWith('!')) {
        const args = content.slice(1).trim().split(/ +/);
        const command = args.shift().toLowerCase();

        // Yetki kontrolü (Belirtilen rol ID'ye sahip mi veya Yönetici mi?)
        const hasPermission = message.member.permissions.has('Administrator') || message.member.roles.cache.has(YETKILI_ROL_ID);

        if (command === 'rütbever' || command === 'rolver') {
            if (!hasPermission) {
                return message.reply('Bu komutu kullanmak için yeterli yetkin yok reis!');
            }

            const targetMember = message.mentions.members.first();
            const targetRole = message.mentions.roles.first();

            if (!targetMember || !targetRole) {
                return message.reply('Kullanım yanlış! Örnek: `!rütbever @kullanici @rol`');
            }

            try {
                await targetMember.roles.add(targetRole);
                return message.reply(`Başarıyla ${targetMember} adlı üyeye **${targetRole.name}** rütbesi verildi! :white_check_mark:`);
            } catch (err) {
                return message.reply('Rol verilemedi! Botun rolü verilecek rolden yukarıda olmalı.');
            }
        }

        if (command === 'rütbeal' || command === 'rolal') {
            if (!hasPermission) {
                return message.reply('Bu komutu kullanmak için yeterli yetkin yok reis!');
            }

            const targetMember = message.mentions.members.first();
            const targetRole = message.mentions.roles.first();

            if (!targetMember || !targetRole) {
                return message.reply('Kullanım yanlış! Örnek: `!rütbeal @kullanici @rol`');
            }

            try {
                await targetMember.roles.remove(targetRole);
                return message.reply(`Başarıyla ${targetMember} adlı üyeden **${targetRole.name}** rütbesi alındı! :x:`);
            } catch (err) {
                return message.reply('Rol alınamadı! Botun yetkisi yetersiz olabilir.');
            }
        }
    }

    // 0. Spam Koruması
    if (message.member && !message.member.permissions.has('Administrator')) {
        const now = Date.now();
        if (!userMessageMap.has(userId)) {
            userMessageMap.set(userId, []);
        }
        
        const timestamps = userMessageMap.get(userId);
        timestamps.push(now);
        const recentMessages = timestamps.filter(time => now - time < 3000);
        userMessageMap.set(userId, recentMessages);
        
        if (recentMessages.length >= 4) {
            try {
                await message.delete();
                if (message.member.moderatable) {
                    await message.member.timeout(2 * 60 * 1000, "Spam yapma");
                }
                const msg = await message.channel.send(`${message.author}, spam yaptığın için 2 dakika süreyle susturuldun!`);
                setTimeout(() => msg.delete().catch(() => {}), 5000);
                return;
            } catch (err) {
                console.log("Spam mesajı engellenemedi.");
            }
        }
    }

    // 1. Küfür Filtresi ve 3 Dakika Mute
    const isBadWord = badWords.some(word => lowerContent.includes(word));
    if (isBadWord) {
        try {
            await message.delete();
            if (message.member && message.member.moderatable) {
                await message.member.timeout(3 * 60 * 1000, "Yasaklı kelime kullanımı");
            }
            const msg = await message.channel.send(`${message.author}, küfür/yasaklı kelime kullandığın için 3 dakika süreyle susturuldun!`);
            setTimeout(() => msg.delete().catch(() => {}), 5000);
            return;
        } catch (err) {
            console.log("Küfür mesajı silinemedi.");
        }
    }

    // 2. Aşırı Büyük Harf Filtresi
    if (content.length > 15) {
        const uppercaseCount = content.replace(/[^A-ZİĞÜŞÖÇ]/g, "").length;
        if ((uppercaseCount / content.length) > 0.7) {
            try {
                await message.delete();
                const msg = await message.channel.send(`${message.author}, lütfen büyük harfle bağırma!`);
                setTimeout(() => msg.delete().catch(() => {}), 5000);
                return;
            } catch (err) {
                console.log("Büyük harf mesajı silinemedi.");
            }
        }
    }

    // 3. Seviye Sistemi
    let count = (userMessageCounts.get(userId) || 0) + 1;
    userMessageCounts.set(userId, count);

    let currentLevel = userLevels.get(userId) || 0;
    let newLevel = currentLevel;

    if (count >= 300) newLevel = 10;
    else if (count >= 200) newLevel = 9;
    else if (count >= 180) newLevel = 8;
    else if (count >= 150) newLevel = 7;
    else if (count >= 100) newLevel = 6;
    else if (count >= 90) newLevel = 5;
    else if (count >= 70) newLevel = 4;
    else if (count >= 50) newLevel = 3;
    else if (count >= 30) newLevel = 2;
    else if (count >= 10) newLevel = 1;

    if (newLevel > currentLevel) {
        userLevels.set(userId, newLevel);
        message.channel.send(`Tebrikler ${message.author}! Seviye atladın ve **Level ${newLevel}** oldun! :tada:`);
    }

    // 4. "Sa" ve "Napıyonuz" Yanıtları
    if (lowerContent === 'sa' || lowerContent === 'selamün aleyküm' || lowerContent === 'selamun aleykum') {
        return message.reply('Aleykümselam, hoş geldin reis :blue_heart:');
    }
    
    if (lowerContent === 'napiyonuz' || lowerContent === 'napıyonuz') {
        return message.reply('İyi senden naber reis :sunglasses:');
    }
});

client.login(process.env.DISCORD_TOKEN);
