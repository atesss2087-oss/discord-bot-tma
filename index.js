
const fs = require('fs');

const HOLDER_ROLE_ID = '1532129489495130233';

const badWords = JSON.parse(
    fs.readFileSync('./badwords.json', 'utf8')
).map(word => word.toLocaleLowerCase('tr-TR'));

function normalize(text) {
    return text
        .normalize('NFKC')
        .toLocaleLowerCase('tr-TR')
        .replace(/[.\s_\-*]+/g, '');
}

client.on('messageCreate', async message => {
    if (!message.guild || message.author.bot || !message.member) return;

    // Holder rolü olanları muaf tut
    if (message.member.roles.cache.has(HOLDER_ROLE_ID)) return;

    const original = message.content;
    const letters = original.replace(/[^a-zA-ZçÇğĞıİöÖşŞüÜ]/g, '');

    const excessiveCaps =
        letters.length >= 6 &&
        letters === letters.toLocaleUpperCase('tr-TR');

    const normalized = normalize(original);

    const hasBadWord = badWords.some(word =>
        normalized.includes(normalize(word))
    );

    if (!excessiveCaps && !hasBadWord) return;

    // Mesajı sil
    await message.delete().catch(() => {});

    // 3 dakika sustur
    try {
        await message.member.timeout(
            3 * 60 * 1000,
            excessiveCaps
                ? 'Aşırı büyük harf kullanımı'
                : 'Yasaklı ifade kullanımı'
        );
    } catch (error) {
        console.error('Susturma uygulanamadı:', error.message);
    }
});
