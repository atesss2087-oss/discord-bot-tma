
const {
  Client,
  GatewayIntentBits,
  PermissionsBitField
} = require("discord.js");
const fs = require("node:fs");

const token = process.env.DISCORD_TOKEN;

if (!token) {
  throw new Error("DISCORD_TOKEN ortam değişkeni ayarlanmamış!");
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const config = JSON.parse(
  fs.readFileSync("./badwords.json", "utf8")
);

const words = Array.isArray(config)
  ? config
  : config.words;

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

const badWords = [...new Set(
  words.map(normalize).filter(Boolean)
)].sort((a, b) => b.length - a.length);

function containsBadWord(content) {
  const text = ` ${normalize(content)} `;

  return badWords.some(word => {
    const escaped = word.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );

    const pattern = new RegExp(
      `(^|\\s)${escaped}(?=\\s|$)`,
      "u"
    );

    return pattern.test(text);
  });
}

client.once("ready", () => {
  console.log(`${client.user.tag} çevrimiçi!`);
});

client.on("messageCreate", async message => {
  if (!message.guild || message.author.bot) return;

  try {
    // Önce filtre, sonra otomatik cevaplar.
    if (containsBadWord(message.content)) {
      await message.delete();

      if (
        message.member &&
        message.guild.members.me?.permissions.has(
          PermissionsBitField.Flags.ModerateMembers
        )
      ) {
        await message.member.timeout(
          180_000,
          "Yasaklı kelime filtresi"
        );
      }

      const warning = await message.channel.send(
        `⚠️ ${message.author}, yasaklı kelime kullandığın için 3 dakika susturuldun!`
      );

      setTimeout(() => {
        warning.delete().catch(() => {});
      }, 5000);

      return;
    }

    const text = normalize(message.content);

    if (/^sa[!.?]*$/.test(text)) {
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

client.login(token);
