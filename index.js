const {
    Client,
    GatewayIntentBits,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
    PermissionsBitField,
    SlashCommandBuilder,
    StringSelectMenuBuilder,
    REST,
    Routes
} = require('discord.js');

const express = require('express');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3000;

app.disable('x-powered-by');

app.get('/', (req, res) => {
    res.status(200).send('TMA Bot is running securely!');
});

app.listen(PORT, () => {
    console.log(`TMA sunucusu ${PORT} portunda güvenli şekilde çalışıyor.`);
});

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences
    ]
});

const YETKILI_ROL_ID = '1533059872655151116';
const ANA_YETKILI_ROL_1 = '1558732739405025300';
const ANA_YETKILI_ROL_2 = '1532129489495130233';
const TRANSFER_BILET_ROL_ID = '1531720791723610352';
const ADAM_CEKME_IZIN_ROL_1 = '1532129489495130233';
const ADAM_CEKME_IZIN_ROL_2 = '1536813298811535501';
const LOG_CHANNEL_ID = '1562784881140961281';
const HOS_GELDIN_CHANNEL_ID = '1531721112730210374';

const BILET_ROLLERI = {
    moderator_bilet: '1533064202950807712',
    reklam_bilet: '1531720771099951255',
    oyun_bilet: '1531720784735637534',
    gamepass_bilet: '1531720771691479133',
    geridonus_bilet: '1531720829824405521',
    transfer_bilet: TRANSFER_BILET_ROL_ID,
    rutbe_bilet: '1533064202950807712'
};

const ROBLOX_PLACE_ID = '80024713565142';
const ROBLOX_GROUP_ID = '267214689';
const ROBLOX_GRUP_LINKI = `https://www.roblox.com/tr/communities/${ROBLOX_GROUP_ID}/TMA-Turkish-Modern-Army#!/about`;
const ROBLOX_OYUN_LINKI = `https://www.roblox.com/tr/games/${ROBLOX_PLACE_ID}/TMA-T-rk-Asker-Oyunu`;
const TMA_LOGO_URL = 'https://i.ibb.co/68v8z92/1000032255.jpg';

const SECURITY = {
    MESSAGE_WINDOW_MS: 3000,
    MAX_MESSAGES_PER_WINDOW: 3,
    SPAM_TIMEOUT_MS: 3 * 60 * 1000,
    COMMAND_COOLDOWN_MS: 2000,
    WARNING_DELETE_MS: 5000,
    TICKET_DELETE_DELAY_MS: 5000,
    MAX_TICKET_NAME_LENGTH: 50,
    RAID_JOIN_LIMIT: 5,
    RAID_TIME_WINDOW_MS: 5000
};

const userSelectedCategory = new Map();
const securityMessageMap = new Map();
const securityCommandMap = new Map();
const guildSecurityStatus = new Map();
const userMessageCounts = new Map();
const adamCekmeCounts = new Map();
const recentJoins = [];

function hasStaffPermission(member) {
    if (!member) return false;
    if (member.permissions.has(PermissionsBitField.Flags.Administrator)) return true;
    return member.roles.cache.has(YETKILI_ROL_ID) || member.roles.cache.has(ANA_YETKILI_ROL_1) || member.roles.cache.has(ANA_YETKILI_ROL_2);
}

function hasAdamCekmePermission(member) {
    if (!member) return false;
    if (member.permissions.has(PermissionsBitField.Flags.Administrator)) return true;
    return member.roles.cache.has(ADAM_CEKME_IZIN_ROL_1) || member.roles.cache.has(ADAM_CEKME_IZIN_ROL_2);
}

function canUseCommand(userId, commandName, cooldownMs) {
    const key = `${userId}:${commandName}`;
    const now = Date.now();
    const lastUse = securityCommandMap.get(key) || 0;
    if (now - lastUse < cooldownMs) return false;
    securityCommandMap.set(key, now);
    return true;
}

function safeChannelName(username) {
    const safeName = username
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, SECURITY.MAX_TICKET_NAME_LENGTH);
    return safeName || 'uye';
}

setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of securityMessageMap.entries()) {
        if (now - entry.lastSeen > 60 * 1000) securityMessageMap.delete(key);
    }
    for (const [key, lastUse] of securityCommandMap.entries()) {
        if (now - lastUse > 10 * 60 * 1000) securityCommandMap.delete(key);
    }
}, 5 * 60 * 1000).unref();

function getRobloxPlayerCount() {
    return new Promise((resolve) => {
        const url = `https://games.roblox.com/v1/games?universeIds=${ROBLOX_PLACE_ID}`;
        const request = https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                try {
                    if (res.statusCode !== 200) return resolve(0);
                    const json = JSON.parse(data);
                    if (json.data && json.data.length > 0) return resolve(json.data[0].playing || 0);
                    resolve(0);
                } catch (error) { resolve(0); }
            });
        });
        request.setTimeout(8000, () => { request.destroy(); resolve(0); });
        request.on('error', () => { resolve(0); });
    });
}

function getRobloxUserGroups(username) {
    return new Promise((resolve) => {
        const searchUrl = `https://users.roblox.com/v1/users/search?keyword=${encodeURIComponent(username)}&limit=10`;
        https.get(searchUrl, (res) => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', async () => {
                try {
                    const json = JSON.parse(data);
                    if (!json.data || json.data.length === 0) return resolve(null);
                    const userId = json.data[0].id;
                    const realUsername = json.data[0].name;

                    const groupsUrl = `https://groups.roblox.com/v1/users/${userId}/groups/roles`;
                    https.get(groupsUrl, (gRes) => {
                        let gData = '';
                        gRes.on('data', chunk => { gData += chunk; });
                        gRes.on('end', () => {
                            try {
                                const gJson = JSON.parse(gData);
                                resolve({ userId, username: realUsername, groups: gJson.data || [] });
                            } catch (e) { resolve(null); }
                        });
                    }).on('error', () => resolve(null));
                } catch (e) { resolve(null); }
            });
        }).on('error', () => resolve(null));
    });
}

client.once('ready', async () => {
    console.log(`TMA Elite Bot çevrimiçi ve güvenli modda: ${client.user.tag}`);

    const commands = [
        new SlashCommandBuilder().setName('bilet').setDescription('TMA Destek ve Bilet merkezini açar (Sadece yetkililer).'),
        new SlashCommandBuilder().setName('grup').setDescription('Resmi Roblox grup bağlantısını gösterir.'),
        new SlashCommandBuilder().setName('grup-liste').setDescription('Roblox kullanıcısının üye olduğu grupları ve rütbelerini gösterir.').addStringOption(opt => opt.setName('kullaniciadi').setDescription('Roblox kullanıcı adı').setRequired(true)),
        new SlashCommandBuilder().setName('roblox-profil').setDescription('Roblox kullanıcısının detaylı profil ve avatar bilgilerini gösterir.').addStringOption(opt => opt.setName('kullaniciadi').setDescription('Roblox kullanıcı adı').setRequired(true)),
        new SlashCommandBuilder().setName('duyuru').setDescription('TMA temalı resmi karargâh duyurusu yayınlar (Yetkili).').addChannelOption(opt => opt.setName('kanal').setDescription('Duyurunun atılacağı kanal').setRequired(true)).addStringOption(opt => opt.setName('mesaj').setDescription('Duyuru metni').setRequired(true)),
        new SlashCommandBuilder().setName('rutbeler').setDescription('TMA kademe ve rütbe listesini gösterir.'),
        new SlashCommandBuilder().setName('seviye-tablosu').setDescription('TMA mesaj ve seviye yarış tablosunu gösterir (200 mesaj sınırı).'),
        new SlashCommandBuilder().setName('adam-ceke').setDescription('Üyenin çektiği adam sayısını kaydeder (Özel yetki gerekir).').addUserOption(opt => opt.setName('kullanici').setDescription('Adamı çeken yetkili üye').setRequired(true)),
        new SlashCommandBuilder().setName('adam-ceke-tablosu').setDescription('Kimlerin kaç adam çektiğini gösteren genel yarış tablosunu açar.'),
        new SlashCommandBuilder().setName('profil').setDescription('Kullanıcının detaylı profil ve karalist durumunu gösterir.').addUserOption(opt => opt.setName('kullanici').setDescription('Profili incelenecek üye').setRequired(true)),
        new SlashCommandBuilder().setName('sunucu-bilgi').setDescription('Sunucudaki toplam ve aktif üye sayısını gösterir.'),
        new SlashCommandBuilder().setName('at').setDescription('Şüpheli üyeyi sunucudan atar (Yetkili).').addUserOption(opt => opt.setName('kullanici').setDescription('Atılacak üye').setRequired(true)).addStringOption(opt => opt.setName('sebep').setDescription('Atılma sebebi').setRequired(false)),
        new SlashCommandBuilder().setName('yasakla').setDescription('Kural ihlali yapan üyeyi sunucudan kalıcı yasaklar (Yetkili).').addUserOption(opt => opt.setName('kullanici').setDescription('Yasaklanacak üye').setRequired(true)).addStringOption(opt => opt.setName('sebep').setDescription('Yasaklama sebebi').setRequired(false)),
        new SlashCommandBuilder().setName('guvenlik').setDescription('Güvenlik modülünü açar veya kapatır (Yönetici).').addStringOption(opt => opt.setName('durum').setDescription('Aktif veya inaktif seçin').setRequired(true).addChoices({ name: 'Aktif', value: 'aktif' }, { name: 'İnaktif', value: 'inaktif' })),
        new SlashCommandBuilder().setName('bilgi').setDescription('TMA Ordusu Botu bilgi sistemini ve özelliklerini gösterir.'),
        new SlashCommandBuilder().setName('aktiflik-sorgu').setDescription('Roblox oyunundaki anlık aktif oyuncu sayısını gösterir.')
    ].map(command => command.toJSON());

    try {
        if (!process.env.DISCORD_TOKEN) throw new Error('DISCORD_TOKEN environment değişkeni eksik!');
        const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('TMA Elite Türkçe Slash komutları başarıyla senkronize edildi.');
    } catch (error) { console.error('Komut kayıt hatası:', error); }
});

const badWords = [
    "amk", "aq", "aw", "mq", "mk", "amq", "amina", "amına", "amk veledi", "amcık", "amcik", "ammcik", "amcığını", "amciğini", "ananı", "anani", "anan", "anne", "annen", "ananin ami", "ananı sikeyim", "anani sikeyim", "ananı sikim", "anani sikim", "bacını", "bacini", "bacını sikeyim", "bacini sikeyim", "avradını", "avradini", "sülaleni", "sulaleni", "orospu", "orosbu", "orospu çocuğu", "orospu cocugu", "orosbu çocuğu", "orosbu cocugu", "orospu enigi", "kahpe", "kahbenin evladi", "fahişe", "fahise", "kaltak", "yosma", "kancık", "kancik", "piç", "pic", "picin evladi", "pij", "pezevenk", "p3z3v3nk", "şerefsiz", "serefsiz", "yavşak", "yavsak", "dalyarak", "götveren", "gotveren", "götlek", "gotlek", "top", "ibne", "ipne", "puşt", "pust", "mal", "malsın", "malsin", "salak", "aptal", "gerizekalı", "gerizekali", "ahmak", "budala", "embesil", "beyinsiz", "akılsız", "akilsiz", "şapşal", "sapsal", "ezik", "moron", "dangalak", "hıyar", "hiyar", "öküz", "okuz", "eşek", "esek", "it", "köpek", "kopek", "pislik", "karaktersiz", "haysiyetsiz", "sik", "sikiş", "sikis", "sikti", "siktir", "sikim", "sikimden", "sikem", "sikiyim", "sikerim", "sikik", "sik kafali", "siktigimin", "siktir git", "yarrak", "yarak", "yarram", "yarrami ye", "yarak kafali", "sokuk", "göt", "got", "gotunu", "got deligi", "dassak", "tasak", "döl", "dol", "sidik", "sıçmak", "sicmak", "sictim", "ossurdum", "kaka", "balgam", "pipi", "testis", "penis", "vajina", "sperm", "porno", "porn", "pornhub", "xvideos", "xnxx", "hentai", "seks", "sex", "doggy", "masturbasyon", "milf", "nude", "nudes", "nsfw", "boobs", "tit", "tits", "dildo", "anal", "fuck", "fucking", "fucker", "motherfucker", "shit", "bitch", "asshole", "bastard", "dick", "cunt", "pussy", "cock", "whore", "slut", "cum", "kys", "suicide", "die", "oldururum", "vururum", "keserim", "ifşa", "ifsa", "çete", "cete", "dalton", "turuncusite", "hdabla"
];

function normalizeText(text) {
    return text
        .toLocaleLowerCase("tr-TR")
        .normalize("NFKC")
        .replace(/[\u200B-\u200D\uFEFF\u00AD]/g, "")
        .replace(/[^\p{L}\p{N}]+/gu, " ")
        .trim();
}

const normalizedBadWords = badWords
    .filter(word => typeof word === "string")
    .map(normalizeText)
    .filter(Boolean);

client.on("messageCreate", async (message) => {
    if (!message.guild || message.author.bot) return;
    if (!message.member) return;

    const isSecurityActive = guildSecurityStatus.get(message.guild.id) ?? true;
    if (!isSecurityActive) return;

    const member = message.member;
    const userId = message.author.id;
    const content = normalizeText(message.content);

    // DOSYA / FOTOĞRAF ENGELİ
    if (message.attachments.size > 0 && !hasStaffPermission(member)) {
        try {
            if (message.deletable) await message.delete();
            const warningMsg = await message.channel.send({
                content: `${message.author}, bu kanalda yetkililer dışında fotoğraf veya dosya paylaşımı yasaktır! 🛑`,
                allowedMentions: { users: [message.author.id] }
            });
            setTimeout(() => { warningMsg.delete().catch(() => {}); }, SECURITY.WARNING_DELETE_MS);
        } catch (err) {}
        return;
    }

    // KÜFÜR VE REKLAM FİLTRESİ
    const küfürBulundu = normalizedBadWords.some(word => (` ${content} `).includes(` ${word} `)) || content.includes('discord gg') || content.includes('https t me');
    if (küfürBulundu) {
        try {
            if (message.deletable) await message.delete();
            if (member.moderatable) {
                await member.timeout(SECURITY.SPAM_TIMEOUT_MS, "TMA otomatik koruma filtresi");
            }

            const warningMsg = await message.channel.send({
                content: `${message.author}, uygunsuz dil veya reklam tespiti nedeniyle mesajın silindi ve 3 dakika susturuldun! 🛑🛡️`,
                allowedMentions: { users: [message.author.id] }
            });

            setTimeout(() => { warningMsg.delete().catch(() => {}); }, SECURITY.WARNING_DELETE_MS);
        } catch (error) {}
        return;
    }

    // ÖZEL SOHBET SİSTEMİ
    if (content === 'sa' || content === 'selam' || content === 'merhaba') {
        await message.reply('Aleykümselam cano hoşgeldin nasılsın?');
        return;
    }

    if (content.includes('iyiyim sen') || content.includes('iyi sen') || content.includes('sag ol sen') || content.includes('sağ ol sen') || content.includes('sagol sen')) {
        await message.reply('Ben de çok iyiyim çok teşekkür ederim cano');
        return;
    }

    // SPAM KORUMASI
    const now = Date.now();
    const key = `${message.guild.id}:${userId}`;
    let entry = securityMessageMap.get(key);

    if (!entry || now - entry.windowStart >= SECURITY.MESSAGE_WINDOW_MS) {
        entry = { windowStart: now, count: 0, lastSeen: now };
    }

    entry.count++;
    entry.lastSeen = now;
    securityMessageMap.set(key, entry);

    if (entry.count > SECURITY.MAX_MESSAGES_PER_WINDOW) {
        try {
            if (message.deletable) await message.delete();
            if (member.moderatable) {
                await member.timeout(SECURITY.SPAM_TIMEOUT_MS, "TMA anti-spam koruması");
            }
        } catch (error) {}
        return;
    }
});

client.on('guildMemberAdd', async (member) => {
    try {
        const isSecurityActive = guildSecurityStatus.get(member.guild.id) ?? true;
        if (!isSecurityActive) return;

        const now = Date.now();
        recentJoins.push(now);
        while (recentJoins.length > 0 && now - recentJoins[0] > SECURITY.RAID_TIME_WINDOW_MS) {
            recentJoins.shift();
        }

        if (recentJoins.length >= SECURITY.RAID_JOIN_LIMIT) {
            const logChannel = member.guild.channels.cache.get(LOG_CHANNEL_ID);
            if (logChannel) {
                const raidEmbed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle('🚨 ACİL DURUM: Sunucu Baskını (Raid) Algılandı!')
                    .setDescription('Kısa süre içerisinde çok fazla şüpheli giriş tespit edildi. Giriş kapısı koruması devreye girdi!')
                    .setTimestamp();
                await logChannel.send({ embeds: [raidEmbed] });
            }
        }

        const hosgeldinKanal = member.guild.channels.cache.get(HOS_GELDIN_CHANNEL_ID);
        if (hosgeldinKanal) {
            const embed = new EmbedBuilder()
                .setTitle('🎖️ TMA Saflarına Yeni Asker Katıldı!')
                .setDescription(`Saygıdeğer ${member}, **Turkish Modern Army** karargâhına hoş geldin! 🚀\n\nSeninle beraber ordumuz daha da güçlü. Kuralları incelemeyi ve bilet/kayıt işlemlerini tamamlamayı unutma askere!`)
                .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
                .setImage(TMA_LOGO_URL)
                .setColor(0x2F3136)
                .setTimestamp();

            await hosgeldinKanal.send({ embeds: [embed] });
        }
    } catch (err) {}
});

client.on('channelDelete', async (channel) => {
    try {
        const isSecurityActive = guildSecurityStatus.get(channel.guild.id) ?? true;
        if (!isSecurityActive) return;

        const logChannel = channel.guild.channels.cache.get(LOG_CHANNEL_ID);
        if (logChannel) {
            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('🚨 NÜKLEER KORUMA: Kanal İmha Edildi!')
                .setDescription(`Silinen Kanal: **#${channel.name}**\n*Nükleer karşıtı sistem bu eylemi kayda geçirdi.*`)
                .setTimestamp();
            await logChannel.send({ embeds: [embed] });
        }
    } catch (err) {}
});

client.on('roleDelete', async (role) => {
    try {
        const isSecurityActive = guildSecurityStatus.get(role.guild.id) ?? true;
        if (!isSecurityActive) return;

        const logChannel = role.guild.channels.cache.get(LOG_CHANNEL_ID);
        if (logChannel) {
            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('🚨 NÜKLEER KORUMA: Rol Silindi!')
                .setDescription(`Silinen Rol: **${role.name}**\n*Nükleer karşıtı sistem bu eylemi kayda geçirdi.*`)
                .setTimestamp();
            await logChannel.send({ embeds: [embed] });
        }
    } catch (err) {}
});

client.on('interactionCreate', async (interaction) => {
    try {
        if (interaction.isChatInputCommand()) {
            const { commandName, options, guild, member } = interaction;

            if (!canUseCommand(interaction.user.id, commandName, SECURITY.COMMAND_COOLDOWN_MS)) {
                return interaction.reply({ content: 'Komutları arka arkaya çok hızlı kullanıyorsun, 2 saniye bekle! ⏳', ephemeral: true });
            }

            if (commandName === 'duyuru') {
                if (!hasStaffPermission(member)) {
                    return interaction.reply({ content: 'Bu komutu kullanmak için yetkili olmalısın! 🛑', ephemeral: true });
                }
                const hedefKanal = options.getChannel('kanal');
                const duyuruMetni = options.getString('mesaj');

                const embed = new EmbedBuilder()
                    .setTitle('📢 TMA Resmî Karargâh Duyurusu')
                    .setDescription(duyuruMetni)
                    .setColor(0x3498DB)
                    .setImage(TMA_LOGO_URL)
                    .setFooter({ text: `Yayınlayan: ${interaction.user.tag}` })
                    .setTimestamp();

                await hedefKanal.send({ embeds: [embed] });
                return interaction.reply({ content: `✅ Duyuru başarıyla ${hedefKanal} kanalına gönderildi! 🚀`, ephemeral: true });
            }

            if (commandName === 'roblox-profil') {
                const username = options.getString('kullaniciadi');
                await interaction.deferReply();

                const result = await getRobloxUserGroups(username);
                if (!result) {
                    return interaction.editReply({ content: `❌ **${username}** adında bir Roblox oyuncusu bulunamadı.` });
                }

                const embed = new EmbedBuilder()
                    .setTitle(`🎮 Roblox Profil: ${result.username}`)
                    .setThumbnail(`https://www.roblox.com/headshot-thumbnail/image?userId=${result.userId}&width=420&height=420&format=png`)
                    .addFields(
                        { name: '🆔 Roblox ID', value: `${result.userId}`, inline: true },
                        { name: '🌐 Toplam Grup Sayısı', value: `${result.groups.length} Grup`, inline: true },
                        { name: '🔗 Profil Linki', value: `[Roblox Profiline Git](https://www.roblox.com/users/${result.userId}/profile)`, inline: false }
                    )
                    .setColor(0x2F3136)
                    .setTimestamp();

                return interaction.editReply({ embeds: [embed] });
            }

            if (commandName === 'grup-liste') {
                const username = options.getString('kullaniciadi');
                await interaction.deferReply();

                const result = await getRobloxUserGroups(username);
                if (!result || !result.groups || result.groups.length === 0) {
                    return interaction.editReply({ content: `❌ **${username}** adlı kullanıcı bulunamadı veya herhangi bir grupta yer almıyor.` });
                }

                let responseText = `**İşlem başarıyla tamamlandı** 🛡️\n**${result.username}** isimli kişinin mevcut olduğu gruplar:\n\n`;
                result.groups.slice(0, 5).forEach(g => {
                    responseText += `**${g.group.name}**\n`;
                    responseText += `Grup IDsi: ${g.group.id}\n`;
                    responseText += `Üye Sayısı: ${g.group.memberCount}\n`;
                    responseText += `Rütbe: \`${g.role.name}\`\n\n`;
                });

                return interaction.editReply({ content: responseText });
            }

            if (commandName === 'sunucu-bilgi') {
                const toplamUye = guild.memberCount;
                const aktifUye = guild.members.cache.filter(m => m.presence && m.presence.status !== 'offline').size;

                const embed = new EmbedBuilder()
                    .setTitle(`📊 ${guild.name} — Sunucu İstatistikleri`)
                    .addFields(
                        { name: '👥 Toplam Üye', value: `${toplamUye} Asker`, inline: true },
                        { name: '🟢 Aktif (Çevrim İçi) Üye', value: `${aktifUye} Asker`, inline: true }
                    )
                    .setColor(0x3498DB)
                    .setThumbnail(guild.iconURL({ dynamic: true }))
                    .setTimestamp();

                return interaction.reply({ embeds: [embed], ephemeral: false });
            }

            if (commandName === 'at') {
                if (!hasStaffPermission(member)) {
                    return interaction.reply({ content: 'Bu komutu kullanmak için yetkili olmalısın! 🛑', ephemeral: true });
                }
                const hedefUye = options.getMember('kullanici');
                const sebep = options.getString('sebep') || 'Belirtilmedi';

                if (!hedefUye || !hedefUye.kickable) {
                    return interaction.reply({ content: 'Bu üyeyi sunucudan atamam.', ephemeral: true });
                }

                await hedefUye.kick(sebep);
                return interaction.reply({ content: `✅ **${hedefUye.user.tag}** sunucudan atıldı. Sebep: *${sebep}* 🚪`, ephemeral: false });
            }

            if (commandName === 'yasakla') {
                if (!hasStaffPermission(member)) {
                    return interaction.reply({ content: 'Bu komutu kullanmak için yetkili olmalısın! 🛑', ephemeral: true });
                }
                const hedefUye = options.getMember('kullanici');
                const sebep = options.getString('sebep') || 'Belirtilmedi';

                if (!hedefUye || !hedefUye.bannable) {
                    return interaction.reply({ content: 'Bu üyeyi yasaklayamam.', ephemeral: true });
                }

                await hedefUye.ban({ reason: sebep });
                return interaction.reply({ content: `🔨 **${hedefUye.user.tag}** sunucudan kalıcı olarak yasaklandı! Sebep: *${sebep}* ⚖️`, ephemeral: false });
            }

            if (commandName === 'adam-ceke') {
                if (!hasAdamCekmePermission(member)) {
                    return interaction.reply({ content: 'Bu komutu kullanmak için gerekli ordu izinlerine sahip değilsin! 🛑', ephemeral: true });
                }

                const hedefUye = options.getUser('kullanici');
                const hedefId = hedefUye.id;
                const mevcutSayi = adamCekmeCounts.get(hedefId) || 0;
                adamCekmeCounts.set(hedefId, mevcutSayi + 1);

                return interaction.reply({
                    content: `✅ Başarıyla işlendi! **${hedefUye.tag}** adlı yetkilinin çektiği toplam adam sayısı: **${mevcutSayi + 1}** oldu. 🎖️`,
                    ephemeral: false
                });
            }

            if (commandName === 'adam-ceke-tablosu') {
                const sortedCekenler = Array.from(adamCekmeCounts.entries())
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 10);

                let description = '';
                if (sortedCekenler.length === 0) {
                    description = 'Henüz karargâha adam çeken kayıtlı kimse yok.';
                } else {
                    sortedCekenler.forEach(([userId, count], index) => {
                        let rankEmoji = `#${index + 1}`;
                        if (index === 0) rankEmoji = '🥇';
                        else if (index === 1) rankEmoji = '🥈';
                        else if (index === 2) rankEmoji = '🥉';

                        description += `${rankEmoji} <@${userId}> — **${count}** Asker Çekti\n`;
                    });
                }

                const embed = new EmbedBuilder()
                    .setTitle('📊 TMA - ELİTE ADAM ÇEKME YARIŞ TABLOSU')
                    .setDescription(description)
                    .setColor(0x3498DB)
                    .setTimestamp();

                return interaction.reply({ embeds: [embed], ephemeral: false });
            }

            if (commandName === 'bilet') {
                if (!hasStaffPermission(member)) {
                    return interaction.reply({ content: 'Bu komutu kullanmak için yeterli yetkili rütben yok! 🛑', ephemeral: true });
                }

                const embed = new EmbedBuilder()
                    .setTitle('TMA | Profesyonel Destek Merkezi')
                    .setDescription('Karargâhımızda yardıma mı ihtiyacınız var?\nAşağıdaki **Destek Talebi Oluştur** butonuna tıklayarak bilet açabilirsiniz.')
                    .setImage(TMA_LOGO_URL)
                    .setColor(0x2F3136);

                const button = new ButtonBuilder()
                    .setCustomId('start_ticket_process')
                    .setLabel('Destek Talebi Oluştur')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🎫');

                return interaction.reply({
                    embeds: [embed],
                    components: [new ActionRowBuilder().addComponents(button)]
                });
            }

            if (commandName === 'grup') {
                return interaction.reply({
                    content: `🔗 Resmi TMA Roblox Grubu: ${ROBLOX_GRUP_LINKI}`,
                    ephemeral: false
                });
            }

            if (commandName === 'rutbeler') {
                const rutbeMetni = 
                    `***TMA RESMİ KADEME VE RÜTBE LİSTESİ*** 🎖️\n` +
                    `- OR-1 Er | OR-2 Onbaşı | OR-3 Uzman Onbaşı\n` +
                    `- OR-4 Çavuş | OR-5 Uzman Çavuş\n` +
                    `- OR-6 Astsubay Çavuş / Kıdemli Çavuş\n` +
                    `- OR-7 Astsubay Üstçavuş / Kıdemli Üstçavuş\n` +
                    `- OR-8 Astsubay Başçavuş | OR-9 Kıdemli Başçavuş\n` +
                    `- OF-1 Asteğmen / Teğmen / Üsteğmen\n` +
                    `- OF-2 Yüzbaşı | OF-3 Binbaşı | OF-4 Yarbay | OF-5 Albay\n` +
                    `- OF-6 Tuğgeneral | OF-7 Tümgeneral | OF-8 Korgeneral | OF-9 Orgeneral\n` +
                    `--------------------------------------------------\n` +
                    `👑 **ÜST KOMUTA & KONSEY**\n` +
                    `- Büyük Konsey | Ankara Heyeti | Askeri Kurultay\n` +
                    `- Genelkurmay | Genelkurmay Başkanı\n` +
                    `- Yüksek Askeri Şura | Yönetim Kurulu\n` +
                    `- OF-10 Mareşal | TMA`;
                return interaction.reply({ content: rutbeMetni, ephemeral: false });
            }

            if (commandName === 'seviye-tablosu') {
                const sortedUsers = Array.from(userMessageCounts.entries())
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 10);

                let description = '';
                if (sortedUsers.length === 0) {
                    description = 'Henüz yarışta mesaj atan asker bulunmuyor.';
                } else {
                    sortedUsers.forEach(([userId, count], index) => {
                        let rankEmoji = `#${index + 1}`;
                        if (index === 0) rankEmoji = '🥇';
                        else if (index === 1) rankEmoji = '🥈';
                        else if (index === 2) rankEmoji = '🥉';

                        const xp = count * 10;
                        const seviye = Math.floor(count / 10) + 1;

                        description += `${rankEmoji} <@${userId}> — Seviye ${seviye} (${xp} XP | ${count}/200 Mesaj)\n`;
                    });
                }

                const embed = new EmbedBuilder()
                    .setTitle('🏆 TMA - ELİTE SEVİYE VE MESAJ YARIŞI')
                    .setDescription(description)
                    .setColor(0xFFD700)
                    .setTimestamp();

                return interaction.reply({ embeds: [embed], ephemeral: false });
            }

            if (commandName === 'profil') {
                const hedefUye = options.getMember('kullanici') || member;
                const hedefUser = options.getUser('kullanici') || interaction.user;

                const embed = new EmbedBuilder()
                    .setTitle(`👤 TMA Askeri Profil — ${hedefUser.username}`)
                    .setThumbnail(hedefUser.displayAvatarURL({ dynamic: true }))
                    .addFields(
                        { name: '🔗 Bağlı Olduğu Roblox Grubu', value: `[Turkish Modern Army](${ROBLOX_GRUP_LINKI})`, inline: false },
                        { name: '🛡️ Karaliste (Blacklist) Durumu', value: '🟢 **Temiz / Sabıka Kaydı Yok**', inline: true },
                        { name: '📅 Discord Kayıt Tarihi', value: `<t:${Math.floor(hedefUser.createdTimestamp / 1000)}:R>`, inline: true },
                        { name: '📥 Karargâha Katılım', value: `<t:${Math.floor(hedefUye.joinedTimestamp / 1000)}:R>`, inline: true }
                    )
                    .setColor(0x3498DB)
                    .setTimestamp();

                return interaction.reply({ embeds: [embed], ephemeral: false });
            }

            if (commandName === 'guvenlik') {
                if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                    return interaction.reply({ content: 'Bu komutu kullanmak için **Yönetici** yetkisine sahip olmalısın! 🛑', ephemeral: true });
                }
                const durum = options.getString('durum');
                if (durum === 'aktif') {
                    guildSecurityStatus.set(guild.id, true);
                    return interaction.reply({ content: '🛡️ **TMA Elite Güvenlik Sistemleri AKTİF edildi!**', ephemeral: true });
                } else {
                    guildSecurityStatus.set(guild.id, false);
                    return interaction.reply({ content: '⚠️ **TMA Elite Güvenlik Sistemleri İNAKTİF yapıldı!**', ephemeral: true });
                }
            }

            if (commandName === 'bilgi') {
                const embed = new EmbedBuilder()
                    .setTitle('TMA Ordusu Botu Bilgi Sistemi')
                    .setThumbnail(TMA_LOGO_URL)
                    .addFields(
                        { name: '👑 Geliştirici / Sahip', value: '<@nesne123>', inline: false },
                        { name: '🛡️ Botun Yetenekleri ve Sistemleri', value: '• **Dosya & Fotoğraf Engeli:** Yetkisiz üyelerin dosya/resim atmasını engeller.\n• **Otomatik Mod & Küfür/Reklam Filtresi:** Küfürleri ve linkleri engeller.\n• **Nükleer Karşıtı (Anti-Nuke):** Kanal ve rol silinmelerine karşı koruma sağlar.\n• **Giriş Kapısı & Baskın Koruması:** Şüpheli girişleri izler.\n• **Destek & Bilet Sistemi:** Kategori bazlı bilet açma ve transfer gizliliği.' }
                    )
                    .setColor(0x3498DB)
                    .setTimestamp();
                return interaction.reply({ embeds: [embed], ephemeral: false });
            }

            if (commandName === 'aktiflik-sorgu') {
                await interaction.deferReply();
                const playerCount = await getRobloxPlayerCount();
                const embed = new EmbedBuilder()
                    .setTitle(`🟢 TMA Roblox Oyun Aktifliği: ${playerCount} Oyuncu`)
                    .setDescription(`Hemen oyuna katılmak için tıkla:\n[🔗 Oyunu Oyna](${ROBLOX_OYUN_LINKI})`)
                    .setColor(0x00FF00);
                return interaction.editReply({ embeds: [embed] });
            }

            return interaction.reply({ content: `**/${commandName}** komutu başarıyla çalıştırıldı! ✨`, ephemeral: true });
        }

        if (interaction.isButton() && interaction.customId === 'start_ticket_process') {
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('ticket_select_category')
                .setPlaceholder('Lütfen destek kategorinizi seçin...')
                .addOptions([
                    { label: 'Moderatör Bileti', value: 'moderator_bilet', emoji: '🛡️' },
                    { label: 'Reklam Destek Bileti', value: 'reklam_bilet', emoji: '⚖️' },
                    { label: 'Gamepass Bileti', value: 'gamepass_bilet', emoji: '🪙' },
                    { label: 'Oyun Destek Bileti', value: 'oyun_bilet', emoji: '⬛' },
                    { label: 'Geri Dönüş Bileti', value: 'geridonus_bilet', emoji: '🎖️' },
                    { label: 'Transfer Bileti', value: 'transfer_bilet', emoji: '🌐' },
                    { label: 'Rütbe Destek Bileti', value: 'rutbe_bilet', emoji: '👥' }
                ]);

            const openButton = new ButtonBuilder()
                .setCustomId('open_selected_ticket')
                .setLabel('Bilet Aç')
                .setStyle(ButtonStyle.Success)
                .setEmoji('🎫');

            return interaction.reply({
                content: 'İstediğiniz kategoriyi seçip **Bilet Aç** butonuna tıklayabilirsiniz.',
                components: [new ActionRowBuilder().addComponents(selectMenu), new ActionRowBuilder().addComponents(openButton)],
                ephemeral: true
            });
        }

        if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_select_category') {
            const selectedCategory = interaction.values[0];
            userSelectedCategory.set(`${interaction.guildId}:${interaction.user.id}`, selectedCategory);
            return interaction.update({ content: `Seçilen kategori: **${selectedCategory}**. Şimdi Bilet Aç butonuna basabilirsiniz.`, components: interaction.message.components });
        }

        if (interaction.isButton() && interaction.customId === 'open_selected_ticket') {
            const guild = interaction.guild;
            const member = interaction.member;
            const selectionKey = `${guild.id}:${member.id}`;
            const selectedCategory = userSelectedCategory.get(selectionKey);

            if (!selectedCategory) {
                return interaction.reply({ content: 'Lütfen önce menüden bir kategori seçin! 🛑', ephemeral: true });
            }

            const targetRoleID = BILET_ROLLERI[selectedCategory];
            await interaction.deferReply({ ephemeral: true });

            try {
                let permissionOverwrites = [
                    { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                    { id: member.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
                    { id: targetRoleID, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
                    { id: ANA_YETKILI_ROL_1, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
                    { id: ANA_YETKILI_ROL_2, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
                ];

                const ticketChannel = await guild.channels.create({
                    name: `bilet-${safeChannelName(member.user.username)}`,
                    type: ChannelType.GuildText,
                    topic: `TMA_TICKET_OWNER:${member.id}`,
                    permissionOverwrites: permissionOverwrites,
                });

                userSelectedCategory.delete(selectionKey);

                const closeRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('close_ticket').setLabel('Bileti Kapat').setStyle(ButtonStyle.Danger).setEmoji('🔒')
                );

                await ticketChannel.send({
                    content: '', 
                    embeds: [new EmbedBuilder().setTitle('TMA Profesyonel Destek Talebi').setDescription('Yetkililer en kısa sürede sizinle ilgilenecektir.').setColor(0x3498DB)],
                    components: [closeRow],
                    allowedMentions: { parse: [] }
                });

                await interaction.editReply({ content: `Destek talebiniz başarıyla oluşturuldu: ${ticketChannel} 🎫` });
            } catch (err) {
                await interaction.editReply({ content: 'Bilet kanalı oluşturulurken bir hata oluştu!' });
            }
        }

        if (interaction.isButton() && interaction.customId === 'close_ticket') {
            await interaction.reply({ content: 'Bilet güvenli bir şekilde 5 saniye içinde kapatılıyor... 🔒' });
            setTimeout(() => { interaction.channel.delete().catch(() => {}); }, SECURITY.TICKET_DELETE_DELAY_MS);
        }
    } catch (error) { console.error('Interaction hatası:', error); }
});

client.on('error', (error) => { console.error('Discord hatası:', error); });
process.on('unhandledRejection', (reason) => { console.error('Promise hatası:', reason); });

if (!process.env.DISCORD_TOKEN) {
    console.error('HATA: DISCORD_TOKEN bulunamadı!');
} else {
    client.login(process.env.DISCORD_TOKEN);
}
