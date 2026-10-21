const fs = require('fs');
const { Client, GatewayIntentBits, Partials } = require('discord.js');

// Susturulmayacak rolün ID'si
const HOLDER_ROLE_ID = '1532129489495130233';

// Yasaklı kelimeler dosyası
const badWords = JSON.parse(
    fs.readFileSync('./badwords.json', 'utf8')
).map(word => normalize(word));

function normalize(text) {
    return text
        .normalize('NFKC')
        .toLocaleLowerCase('tr-TR')
        .replace(/[^\p{L}\p{N}]/gu, '');
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ],
    partials: [Partials.Channel]
});

client.on('messageCreate', async message => {
    if (!message.guild || message.author.bot || !message.member) return;

    // Belirtilen role sahip kullanıcıları muaf tut
    if (message.member.roles.cache.has(HOLDER_ROLE_ID)) return;

    const original = message.content;

    // Büyük harf kullanımını kontrol et
    const letters = original.replace(/[^\p{L}]/gu, '');
    const excessiveCaps =
        letters.length >= 6 &&
        letters === letters.toLocaleUpperCase('tr-TR');

    // Yasaklı kelime kontrolü
    const normalized = normalize(original);
    const hasBadWord = badWords.some(word =>
        word.length > 0 && normalized.includes(normalize(word))
    );

    if (!excessiveCaps && !hasBadWord) return;

    // Mesajı sil
    try {
        await message.delete();
    } catch (error) {
        console.error('Mesaj silinemedi:', error.message);
    }

    // 3 dakika sustur
    try {
        await message.member.timeout(
            3 * 60 * 1000,
            excessiveCaps
                ? 'Aşırı büyük harf kullanımı'
                : 'Yasaklı kelime kullanımı'
        );
    } catch (error) {
        console.error('Susturma uygulanamadı:', error.message);
    }
});

client.once('ready', () => {
    console.log(`${client.user.tag} aktif!`);
});

// Tokeni GitHub'a yazma.
// DISCORD_TOKEN ortam değişkenine ekle.
client.login(process.env.DISCORD_TOKEN);
