const { Client, GatewayIntentBits } = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

client.on('ready', () => {
  console.log(`Bot aktif: ${client.user.tag}`);
});

client.on('messageCreate', message => {
  if (message.content === '!merhaba') {
    message.reply('Aleykümselam kral, bot aktif!');
  }
});

// Render'ın kapanmaması için küçük bir web sunucusu (isteğe bağlı ama iyi olur)
const http = require('http');
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Bot aktif ve calisiyor!\n');
}).listen(process.env.PORT || 3000);

client.login(process.env.DISCORD_TOKEN);
