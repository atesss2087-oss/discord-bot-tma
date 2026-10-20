const { Client, GatewayIntentBits } = require('discord.js');
const http = require('http');

// 1. Bot İzinleri (Intents)
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// 2. Bot Hazır Olduğunda Çalışacak Kısım
client.once('ready', () => {
  console.log(`Bot aktif: ${client.user.tag}`);
});

// 3. Mesaj Dinleyici
client.on('messageCreate', message => {
  if (message.author.bot) return;

  if (message.content === '!merhaba') {
    message.reply('Aleykümselam kraliçem!');
  }
});

// 4. Render'ın Kapanmasını Engelleyen Web Sunucusu
const PORT = process.env.PORT || 3000;
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Bot aktif ve çalışıyor!\n');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Web sunucusu ${PORT} portunda dinleniyor.`);
});

// 5. Discord'a Güvenli Giriş (Render Environment'tan Çeker)
client.login(process.env.DISCORD_TOKEN);
