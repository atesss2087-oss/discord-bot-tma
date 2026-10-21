const { Client, GatewayIntentBits } = require('discord.js');
const http = require('http');

// Render'in uykuya geçmesini önleyen mini web sunucusu
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
  console.log('Bot basariyla aktif oldu!');
});

client.on('messageCreate', (message) => {
  // Botlarin kendi mesajlarini engelle
  if (message.author.bot) return;

  const originalContent = message.content;
  const content = originalContent.toLowerCase();

  // 1. SA-AS Yaniti
  if (content === 'sa' || content === 'sa cumleten') {
    message.reply('Aleykümselam! Hoş geldin 👋');
  }

  // 2. Caps Lock Engeli
  if (originalContent.length > 5 && originalContent === originalContent.toUpperCase() && /[A-ZĞÜŞİÖÇ]/.test(originalContent)) {
    message.delete().catch(() => {});
    return message.channel.send('⚠️ Lütfen tamamı büyük harflerle mesaj yazma!');
  }

  // 3. Küfür & Yasakli Kelime Filtresi
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
    return message.channel.send('⚠️ Lütfen yasaklı kelime/küfür kullanma!');
  }
});

client.login(process.env.DISCORD_TOKEN);
```
