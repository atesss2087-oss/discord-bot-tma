
const {
  Client,
  GatewayIntentBits,
  PermissionsBitField
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const PREFIX = "!";

const KUFURLER = [
  "amk",
  "aq",
  "orospu",
  "siktir",
  "yarrak",
  "pic",
  "piç",
  "göt",
  "bok",
  "ananı sikeyim"
];

const LINK_REGEX =
  /(?:https?:\/\/|www\.|discord\.gg\/|discord(?:app)?\.com\/invite\/|(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s]*)?)/i;

function normalize(text) {
  return text
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[1!|]/g, "i")
    .replace(/0/g, "o")
    .replace(/3/g, "e")
    .replace(/4/g, "a")
    .replace(/5/g, "s")
    .replace(/[$]/g, "s")
    .replace(/[^a-z0-9]/g, "");
}

client.on("messageCreate", async (message) => {
  if (!message.guild || message.author.bot) return;

  const member = message.member;
  if (!member) return;

  // Yetkililer otomatik cezadan muaf
  if (
    member.permissions.has(
      PermissionsBitField.Flags.Administrator
    ) ||
    member.permissions.has(
      PermissionsBitField.Flags.ManageMessages
    )
  ) return;

  const original = message.content;
  const normalized = normalize(original);

  const kufurVar = KUFURLER.some((kelime) =>
    normalized.includes(normalize(kelime))
  );

  const linkVar = LINK_REGEX.test(original);

  // Küfür: mesajı sil ve 3 dakika timeout
  if (kufurVar) {
    try {
      await message.delete();
      await member.timeout(
        3 * 60 * 1000,
        "Otomatik moderasyon: Küfür"
      );

      const uyari = await message.channel.send(
        `⚠️ ${message.author}, küfür nedeniyle 3 dakika susturuldun.`
      );

      setTimeout(() => {
        uyari.delete().catch(() => {});
      }, 5000);
    } catch (error) {
      console.error("Küfür cezası uygulanamadı:", error);
    }

    return;
  }

  // Link: mesajı sil
  if (linkVar) {
    try {
      await message.delete();

      const uyari = await message.channel.send(
        `🔗 ${message.author}, bu sunucuda link paylaşmak yasak.`
      );

      setTimeout(() => {
        uyari.delete().catch(() => {});
      }, 5000);
    } catch (error) {
      console.error("Link engeli uygulanamadı:", error);
    }

    return;
  }

  // Basit komut: !ping
  if (original.toLowerCase() === `${PREFIX}ping`) {
    await message.reply("🏓 Pong!");
  }
});

client.once("ready", () => {
  console.log(`${client.user.tag} aktif!`);
});

client.login(process.env.DISCORD_TOKEN);
