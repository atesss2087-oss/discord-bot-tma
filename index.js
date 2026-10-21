
const express = require("express");
const {
  Client,
  GatewayIntentBits,
  PermissionsBitField
} = require("discord.js");
const fs = require("node:fs");

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.status(200).send("Bot is running!");
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is listening on port ${PORT}`);
});

const token = process.env.DISCORD_TOKEN;

if (!token) {
  throw new Error("DISCORD_TOKEN ortam değişkeni ayarlanmamış!");
}

let config;

try {
  config = JSON.parse(fs.readFileSync("./badwords.json", "utf8"));
} catch (error) {
  console.error("badwords.json okunamadı:", error.message);
  process.exit(1);
}

const words = Array.isArray(config) ? config : config.words;

if (!Array.isArray(words)) {
  throw new Error("badwords.json bir dizi veya { words: [] } olmalı.");
}

function normalize(text) {
  return text
    .toLocaleLowerCase("tr-TR")
    .normalize("NFKC")
    .replace(/[.,!?;:()[\]{}"'`]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const badWords = [...new Set(words.map(normalize).filter(Boolean))]
  .sort((a, b) => b.length - a.length);

function containsBadWord(content) {
  const text = ` ${normalize(content)} `;

  return badWords.some(word => {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(^|\\s)${escaped}(?=\\s|$)`, "u").test(text);
  });
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once("ready", () => {
  console.log(`Bot çevrimiçi: ${client.user.tag}`);
});

client.on("messageCreate", async message => {
  if (!message.guild || message.author.bot) return;

  try {
    if (containsBadWord(message.content)) {
      // Mesajı önce silmeyi dene.
      await message.delete();

      const member = message.member;
      const me = message.guild.members.me;

      if (
        member &&
        member.moderatable &&
        me?.permissions.has(
          PermissionsBitField.Flags.ModerateMembers
        )
      ) {
        await member.timeout(180_000, "Yasaklı kelime filtresi");

        const warning = await message.channel.send(
          `⚠️ ${message.author}, yasaklı kelime kullandığın için 3 dakika susturuldun!`
        );

        setTimeout(() => {
          warning.delete().catch(() => {});
        }, 5000);
      }

      return;
    }

    const text = normalize(message.content);

    if (/^sa[!.?]*$/u.test(text)) {
      await message.reply("Aleyküm selam, hoş geldin reis 💙");
      return;
    }

    if (/\b(napıyonuz|napıypnuz|napıyorsunuz)\b/u.test(text)) {
      await message.reply("İyi senden naber reis 😎");
    }
  } catch (error) {
    console.error("Mesaj işleme hatası:", error);
  }
});

client.login(token).catch(error => {
  console.error("Discord bağlantı hatası:", error);
  process.exit(1);
});
