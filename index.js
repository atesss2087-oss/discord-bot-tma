const { Client, GatewayIntentBits } = require('discord.js');
const http = require('http');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once('ready', () => {
  console.log(`Bot aktif: ${client.user.tag}`);
});

client.on('messageCreate', message => {
  if (message.content === '!merhaba') {
    message.reply('Aleykümselam kraliçem!');
  }
});

// Render'ın tam aradığı 0.0.0.0 adresli web sunucusu
const PORT = process.env.PORT || 3000;
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Bot aktif ve çalışıyor!\n');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Web sunucusu ${PORT} portunda dinleniyor.`);
});

client.login('MTU2MTc4MTQ4Mzk2MDY2NDE3NA.GWqKzm.ccLkBeGvxZbQ9g_PBtI5Pg-jrPneunenLYb2fk');

