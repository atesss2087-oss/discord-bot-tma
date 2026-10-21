```javascript
const { Client, GatewayIntentBits } = require('discord.js');
const http = require('http');

// Render'in uykuya gecmesini onleyen mini web sunucusu
http.createServer((req, res) => {
  res.write("Bot 7/24 Aktif!");
  res.end();
}).listen(process.env.PORT || 3000);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ]
});

client.once('ready', () => {
  console.log(`Bot basariyla aktif oldu! Logged in as ${client.user.tag}`);
});

client.on('messageCreate', (message) => {
  // Botlarin kendi mesajlarini veya diger botlari engelle
  if (message.author.bot) return;

  const originalContent = message.content.trim();
  const content = originalContent.toLowerCase();

  // 1. SA - AS Yaniti
  if (content === 'sa' || content === 'sa cumleten' || content === 'selamın aleyküm' || content === 'selamin aleykum' || content === 'selamun aleykum') {
    return message.reply('Aleykümselam, hoş geldin reis! 👋');
  }

  // 2. Caps Lock (Büyük Harf) Engeli
  if (originalContent.length > 5 && originalContent === originalContent.toUpperCase() && /[A-ZĞÜŞİÖÇ]/.test(originalContent)) {
    message.delete().catch(() => {});
    return message.channel.send(`⚠️ ${message.author}, lütfen tamamı büyük harflerle mesaj yazma!`);
  }

  // 3. Küfür & Yasaklı Kelime Filtresi
  const badWords = [
    'amk', 'aq', 'aw', 'mq', 'oe', 'oç', 'oc', 'sik', 'sikti', 'piç',
    'annen', 'anne', 'üvey kızkardeş', 'bebeğim', 'gülüm',
    'pipi', 'daşşak', 'testis', 'sperm', 'vajna', 'sex', 'doggy', '69', '31', 'meme', 'göğüs', 'mahrem',
    'porn', 'pornhub', 'hdabla', 'ifşa', 'turuncusite',
    'alkol', 'sigara', 'silah', 'steroid', 'çete', 'dalton',
    'balgam', 'sidik', 'sıçmak', 'sıçtım', 'ossurdum', 'kaka', 'tayt crop', 'don'
  ];

  if (badWords.some(word => content.includes(word))) {
    message.delete().catch(() => {});
    return message.channel.send(`⚠️ ${message.author}, lütfen yasaklı kelime / küfür kullanma!`);
  }
});

client.login(process.env.DISCORD_TOKEN);
```
