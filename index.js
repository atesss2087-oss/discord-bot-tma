```javascript
const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ]
});

client.once('ready', () => {
  console.log(`✅ Bot başarıyla aktif oldu: ${client.user.tag}`);
});

client.on('messageCreate', (message) => {
  // Botların kendi mesajlarını engelle
  if (message.author.bot) return;

  const originalContent = message.content;
  const content = originalContent.toLowerCase();

  // 1. SA-AS Yanıtı
  if (content === 'sa' || content === 'sa cümleten') {
    message.reply('Aleykümselam! Hoş geldin 👋');
  }

  // 2. Caps Lock / Tamamı Büyük Harf Engeli (Büyük harfle mesaj yazılmasını engeller)
  if (originalContent.length > 5 && originalContent === originalContent.toUpperCase() && /[A-ZĞÜŞİÖÇ]/.test(originalContent)) {
    message.delete().catch(() => {});
    return message.channel.send(`⚠️ ${message.author}, lütfen tamamı büyük harflerle mesaj yazma!`);
  }

  // 3. Küfür, Argo & Yasaklı Kelime Filtresi (Görsellerdeki Tüm Kelimeler Dahil)
  const badWords = [
    // Temel Küfürler & Kısaltmalar
    'amk', 'aq', 'aw', 'mq', 'oe', 'oç', 'oc', 'sik', 'sikti', 'piç',
    
    // Aile & Şahıs & Hitaplar
    'annen', 'anne', 'üvey kızkardeş', 'bebeğim', 'gülüm',
    
    // Organlar, Cinsellik & Argo
    'pipi', 'daşşak', 'testis', 'sperm', 'vajna', 'sex', 'doggy', '69', '31', 'meme', 'göğüs', 'mahrem',
    
    // Yetiskin Icerik / İfşa / Siteler
    'porn', 'pornhub', 'hdabla', 'ifşa', 'turuncusite',
    
    // Zararlı Maddeler, Şiddet & Gruplar
    'alkol', 'sigara', 'silah', 'steroid', 'çete', 'dalton',
    
    // Rahatsız Edici Sözler & Giysi/Doku
    'balgam', 'sidik', 'sıçmak', 'sıçtım', 'ossurdum', 'kaka', 'tayt crop', 'don'
  ];

  // Mesajın içinde yasaklı kelimelerden biri geçiyor mu kontrol et (Küçük/Büyük harf fark etmez)
  if (badWords.some(word => content.includes(word))) {
    message.delete().catch(() => {});
    return message.channel.send(`⚠️ ${message.author}, lütfen yasaklı kelime/küfür kullanma!`);
  }
});

// Render veya Environment Variables kısmındaki DISCORD_TOKEN ile giriş yapar
client.login(process.env.DISCORD_TOKEN);
```
