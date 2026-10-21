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
    "sidik", "pipi", "daşşak", "vajna", "tayt", "don"
];

client.once('clientReady', () => {
    console.log(`Bot çevrimiçi: ${client.user.tag}`);
});

// Yeni üye gelince karşılama mesajı
client.on('guildMemberAdd', (member) => {
    // Mesajın gönderileceği kanalın ID'sini buraya yazmalısın
    const kanalId = 'KANAL_ID_BURAYA'; 
    const kanal = member.guild.channels.cache.get(kanalId);
    if (kanal) {
        kanal.send(`Kampımıza hoş geldin reis, ${member}! :blue_heart:`);
    }
});

// Mesaj kontrolleri (Küfür, Büyük Harf ve "Sa" yanıtı)
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const content = message.content;
    const lowerContent = content.toLowerCase();

    // 1. Küfür Filtresi
    const isBadWord = badWords.some(word => lowerContent.includes(word));
    if (isBadWord) {
        try {
            await message.delete();
            message.channel.send(`${message.author}, bu kanalda küfür veya yasaklı kelime kullanamazsın!`).then(msg => {
                setTimeout(() => msg.delete().catch(() => {}), 5000);
            });
            return;
        } catch (err) {
            console.log("Mesaj silinemedi yetkim yok.");
        }
    }

    // 2. Aşırı Büyük Harf Filtresi (Örn: 15 karakterden uzun ve %70'i büyük harfse)
    if (content.length > 15) {
        const uppercaseCount = content.replace(/[^A-ZİĞÜŞÖÇ]/g, "").length;
        if ((uppercaseCount / content.length) > 0.7) {
            try {
                await message.delete();
                message.channel.send(`${message.author}, lütfen büyük harf bağırmarak yazma!`).then(msg => {
                    setTimeout(() => msg.delete().catch(() => {}), 5000);
                });
                return;
            } catch (err) {
                console.log("Büyük harf mesajı silinemedi.");
            }
        }
    }

    // 3. "Sa" yazınca yanıt verme
    if (lowerContent === 'sa' || lowerContent === 'selamün aleyküm' || lowerContent === 'selamun aleykum') {
        message.reply('Aleykümselam, hoş geldin reis :blue_heart:');
    }
    
    if (lowerContent === 'napiyonuz' || lowerContent === 'napıyonuz') {
        message.reply('İyi senden naber reis :sunglasses:');
    }
});

// Botunun token değerini buraya yapıştıracaksın
client.login(process.env.DISCORD_TOKEN);

