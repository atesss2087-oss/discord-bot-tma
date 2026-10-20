
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

const KICK_TERMS = [
  // Adult sites and terms
  "pornhub", "porn", "porno", "turuncu site", "hdabla", "üvey kızkardeş",
  "onlyfans", "xvideos", "redtube", "brazzers", "hentai", "nude",
  // Sexual acts
  "sex", "seks", "doggy", "69", "31", "sokuş", "sikiş", "grup sex",
  "anal", "oral", "escort", "eskort",
  // Gangs and substances
  "steroid", "çete", "dalton", "uyuşturucu", "esrar", "bonzai", "kokain"
];

const DELETE_TERMS = [
  // Profanity abbreviations and shortened curses
  "oe", "oç", "oc", "aq", "mq", "aw", "o.ç", "o.e",
  // Violence and threat expressions
  "kafası yerde yatıo", "kafası yerde", "keserim",
  // Anatomical and organ terms
  "pipi", "daşşak", "taşşak", "testis", "sperm", "vajna", "vajina",
  "vagina", "am", "amcık", "yarrak", "yarak", "sik", "sikis", "meme",
  "göğüs", "mahrem", "penis", "klitoris", "got", "göt", "anus",
  // Family and spiritual insults (exact term matches)
  "annen", "annenin", "anne", "bacı", "bacın", "sülalen", "ecdadın",
  "avradın", "karını", "kızını", "dini", "imanı", "allahı", "kitabı",
  "bebeğim", "gülüm",
  // Gross and bathroom terms
  "sidik", "sıçmak", "sıçtım", "ossurdum", "kaka", "balgam", "bok",
  "dışkı", "ishal",
  // Sexualized context and clothing
  "tayt", "crop", "don", "külot", "sütyen", "tangası",
  // General profanity and weapons
  "sikti", "sikerim", "orospu", "piç", "kahpe", "götveren", "yarram",
  "sikim", "alkol", "sigara", "silah", "mermi", "bıçak",
  // Keep terms already filtered by the existing bot
  "amk", "siktir", "ananı sikeyim"
];

const LINK_REGEX =
  /(?:https?:\/\/|www\.|discord\.gg\/|discord(?:app)?\.com\/invite\/|(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s]*)?)/i;

function normalize(text) {
  return String(text)
    .toLocaleLowerCase("tr-TR")
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    // Fold Turkish dotless i as well as accented characters.
    .replace(/ı/g, "i")
    // Retain the bot's existing common leetspeak substitutions.
    .replace(/[1|]/g, "i")
    .replace(/0/g, "o")
    .replace(/3/g, "e")
    .replace(/4/g, "a")
    .replace(/[5$]/g, "s")
    // Collapse punctuation/symbols inserted inside a word, then retain
    // whitespace so short blocked terms cannot match inside normal words.
    .replace(/([\p{L}\p{N}])[\p{P}\p{S}]+(?=[\p{L}\p{N}])/gu, "$1")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function compileTerms(terms) {
  return Array.from(new Set(terms.map(normalize).filter(Boolean))).map((term) => {
    const pattern = term
      .split(" ")
      .map((word) => Array.from(word).join("\\s*"))
      .join("\\s*");
    return new RegExp("(?:^|\\s)" + pattern + "(?=\\s|$)", "u");
  });
}

const NORMALIZED_KICK_PATTERNS = compileTerms(KICK_TERMS);
const NORMALIZED_DELETE_PATTERNS = compileTerms(DELETE_TERMS);

function containsBlockedTerm(normalizedText, patterns) {
  return patterns.some((pattern) => pattern.test(normalizedText));
}

function isAllCapsSpam(text) {
  const casedLetters = Array.from(text).filter((character) =>
    /\p{Lu}|\p{Ll}/u.test(character)
  );
  return casedLetters.length > 0 && casedLetters.every((character) =>
    /\p{Lu}/u.test(character)
  );
}

client.on("messageCreate", async (message) => {
  if (!message.guild || message.author.bot) return;

  const member = message.member;
  if (!member) return;

  // Keep the existing exemption for administrators and message moderators.
  if (
    member.permissions.has(PermissionsBitField.Flags.Administrator) ||
    member.permissions.has(PermissionsBitField.Flags.ManageMessages)
  ) return;

  const original = message.content;
  const normalizedMessage = normalize(original);
  const hasSevereTerm = containsBlockedTerm(
    normalizedMessage,
    NORMALIZED_KICK_PATTERNS
  );
  const hasDeleteTerm = containsBlockedTerm(
    normalizedMessage,
    NORMALIZED_DELETE_PATTERNS
  );
  const isCapsSpam = isAllCapsSpam(original);

  // Severe terms trigger a kick (not a permanent ban). Start deletion and
  // kick together so neither action waits behind the other's network request.
  if (hasSevereTerm) {
    const deletion = message.delete().catch((error) => {
      console.error("Otomatik moderasyon: mesaj silinemedi:", error);
    });
    const kick = member.kick("Otomatik moderasyon: ağır yasaklı terim").catch((error) => {
      console.error("Otomatik moderasyon: kullanıcı atılamadı:", error);
    });
    await Promise.all([deletion, kick]);
    return;
  }

  // Lower-level terms and all-caps messages are deleted without a timeout.
  if (hasDeleteTerm || isCapsSpam) {
    try {
      await message.delete();
    } catch (error) {
      console.error("Otomatik moderasyon: mesaj silinemedi:", error);
    }
    return;
  }

  const linkVar = LINK_REGEX.test(original);

  // Link: delete the message and keep the existing temporary warning.
  if (linkVar) {
    try {
      await message.delete();

      const uyari = await message.channel.send(
        "🔗 " + message.author + ", bu sunucuda link paylaşmak yasak."
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
  if (original.toLowerCase() === PREFIX + "ping") {
    await message.reply("🏓 Pong!");
  }
});

client.once("ready", () => {
  console.log(client.user.tag + " aktif!");
});

client.login(process.env.DISCORD_TOKEN);
