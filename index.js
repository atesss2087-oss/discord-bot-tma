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
    res.status(200).send('TMA Bot is running!');
});

app.listen(PORT, () => {
    console.log(`TMA sunucusu ${PORT} portunda çalışıyor.`);
});

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

const YETKILI_ROL_ID = '1533059872655151116';
const ANA_YETKILI_ROL_1 = '1558732739405025300';
const ANA_YETKILI_ROL_2 = '1532129489495130233';
const LOG_CHANNEL_ID = '1562784881140961281';

const BILET_ROLLERI = {
    moderator_bilet: '1533064202950807712',
    reklam_bilet: '1531720771099951255',
    oyun_bilet: '1531720784735637534',
    gamepass_bilet: '1531720771691479133',
    geridonus_bilet: '1531720829824405521',
    transfer_bilet: '1531720829824405521',
    rutbe_bilet: '1533064202950807712'
};

const ROBLOX_PLACE_ID = '80024713565142';
const ROBLOX_OYUN_LINKI = `https://www.roblox.com/tr/games/${ROBLOX_PLACE_ID}/TMA-T-rk-Asker-Oyunu`;
const TMA_LOGO_URL = 'https://i.ibb.co/68v8z92/1000032255.jpg';

const SECURITY = {
    MESSAGE_WINDOW_MS: 3000,
    MAX_MESSAGES_PER_WINDOW: 3,
    SPAM_TIMEOUT_MS: 3 * 60 * 1000,
    COMMAND_COOLDOWN_MS: 2000,
    TICKET_IDLE_MS: 2 * 60 * 60 * 1000,
    WARNING_DELETE_MS: 5000,
    TICKET_DELETE_DELAY_MS: 5000,
    MAX_TICKET_NAME_LENGTH: 50
};

const userSelectedCategory = new Map();
const securityMessageMap = new Map();
const securityCommandMap = new Map();
const guildSecurityStatus = new Map();

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

client.once('ready', async () => {
    console.log(`TMA Bot çevrimiçi: ${client.user.tag}`);

    const commands = [
        new SlashCommandBuilder().setName('bilet').setDescription('Destek talebi menüsünü açar.'),
        new SlashCommandBuilder().setName('güvenlik').setDescription('Güvenlik sistemini açar veya kapatır.').addStringOption(opt => opt.setName('durum').setDescription('Aktif veya inaktif seçin').setRequired(true).addChoices({ name: 'Aktif', value: 'aktif' }, { name: 'İnaktif', value: 'inaktif' })),
        new SlashCommandBuilder().setName('rütbever').setDescription('Üyeye Discord rolü verir.').addUserOption(opt => opt.setName('kullanici').setDescription('Üye').setRequired(true)).addRoleOption(opt => opt.setName('rol').setDescription('Rol').setRequired(true)),
        new SlashCommandBuilder().setName('rütbeal').setDescription('Üyeden Discord rolü alır.').addUserOption(opt => opt.setName('kullanici').setDescription('Üye').setRequired(true)).addRoleOption(opt => opt.setName('rol').setDescription('Rol').setRequired(true)),
        new SlashCommandBuilder().setName('rütbe-terfi').setDescription('Roblox grubunda rütbe terfi ettirir.').addStringOption(opt => opt.setName('roblox_id').setDescription('Roblox ID').setRequired(true)).addStringOption(opt => opt.setName('rutbe_adi').setDescription('Yeni rütbe adı').setRequired(true)).addStringOption(opt => opt.setName('sebep').setDescription('Terfi sebebi').setRequired(true)),
        new SlashCommandBuilder().setName('rütbe-düşür').setDescription('Roblox grubunda rütbe düşürür.').addStringOption(opt => opt.setName('roblox_id').setDescription('Roblox ID').setRequired(true)).addStringOption(opt => opt.setName('rutbe_adi').setDescription('Yeni rütbe adı').setRequired(true)).addStringOption(opt => opt.setName('sebep').setDescription('Sebep').setRequired(true)),
        new SlashCommandBuilder().setName('rütbe-sorgu').setDescription('Roblox grubundaki rütbeyi sorgular.').addStringOption(opt => opt.setName('roblox_id').setDescription('Roblox ID').setRequired(true)),
        new SlashCommandBuilder().setName('tam-yasakla').setDescription('Kullanıcıyı yasaklar.').addUserOption(opt => opt.setName('kullanici').setDescription('Üye').setRequired(true)),
        new SlashCommandBuilder().setName('oyun-yasak-kaldır').setDescription('Yasağı kaldırır.').addUserOption(opt => opt.setName('kullanici').setDescription('Üye').setRequired(true)),
        new SlashCommandBuilder().setName('oyun-yasak-sorgu').setDescription('Yasak sorgular.').addUserOption(opt => opt.setName('kullanici').setDescription('Üye').setRequired(true)),
        new SlashCommandBuilder().setName('bilgi').setDescription('Bot bilgilerini gösterir.'),
        new SlashCommandBuilder().setName('aktiflik-sorgu').setDescription('Oyun aktiflik durumunu gösterir.'),
        new SlashCommandBuilder().setName('aktiflik-çağrı').setDescription('Personelleri oyuna davet eder.')
    ].map(command => command.toJSON());

    try {
        if (!process.env.DISCORD_TOKEN) throw new Error('DISCORD_TOKEN eksik!');
        const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('TMA Slash komutları kaydedildi.');
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
    const content = message.content.trim().toLowerCase();

    // --- SOHBET CEVAPLARI ---
    if (content === 'merhaba' || content === 'selam') {
        return message.reply('meraba cano nasılsın');
    }
    if (content === 'iyiyim sen' || content === 'iyiyim sen?') {
        return message.reply('bende çok iyiyim çok teşekkür ederim cano');
    }
    if (content === 'sa' || content === 's.a.') {
        return message.reply('as cano hoş geldin');
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
                await member.timeout(SECURITY.SPAM_TIMEOUT_MS, "TMA otomatik spam koruması");
            }

            const logChannel = message.guild.channels.cache.get(LOG_CHANNEL_ID);
            if (logChannel) {
                const embed = new EmbedBuilder()
                    .setColor(0xFFA500)
                    .setTitle('⚡ Spam Tespit Edildi!')
                    .setDescription(`**Üye:** ${message.author.tag} (${message.author})\n**Kanal:** ${message.channel}\n3 saniyede 3+ mesaj attığı için susturuldu.`)
                    .setTimestamp();
                await logChannel.send({ embeds: [embed] });
            }
        } catch (error) { console.error("Spam koruması:", error.message); }
        return;
    }

    // KÜFÜR FİLTRESİ
    const normalizedContent = normalizeText(message.content);
    const küfürBulundu = normalizedBadWords.some(word => (` ${normalizedContent} `).includes(` ${word} `));

    if (küfürBulundu) {
        try {
            if (message.deletable) await message.delete();
            if (member.moderatable) {
                await member.timeout(SECURITY.SPAM_TIMEOUT_MS, "TMA küfür filtresi");
            }

            const warningMsg = await message.channel.send({
                content: `${message.author}, uygunsuz kelime nedeniyle mesajın silindi ve 3 dakika susturuldun. 🛑`,
                allowedMentions: { users: [message.author.id] }
            });

            setTimeout(() => { warningMsg.delete().catch(() => {}); }, SECURITY.WARNING_DELETE_MS);

            const logChannel = message.guild.channels.cache.get(LOG_CHANNEL_ID);
            if (logChannel) {
                const embed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle('🛑 Küfür / Uygunsuz Dil Tespit Edildi')
                    .setDescription(`**Üye:** ${message.author.tag} (${message.author})\n**Kanal:** ${message.channel}\n**Mesaj:** ${message.content}`)
                    .setTimestamp();
                await logChannel.send({ embeds: [embed] });
            }
        } catch (error) { console.error("Küfür filtresi hatası:", error); }
    }
});

client.on('channelDelete', async (channel) => {
    try {
        const isSecurityActive = guildSecurityStatus.get(channel.guild.id) ?? true;
        if (!isSecurityActive) return;

        const logChannel = channel.guild.channels.cache.get(LOG_CHANNEL_ID);
        if (logChannel) {
            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('🚨 TEHLİKE: Kanal Silindi!')
                .setDescription(`Silinen Kanal: **#${channel.name}**`)
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
                .setTitle('🚨 TEHLİKE: Rol Silindi!')
                .setDescription(`Silinen Rol: **${role.name}**`)
                .setTimestamp();
            await logChannel.send({ embeds: [embed] });
        }
    } catch (err) {}
});

client.on('guildMemberAdd', async (member) => {
    try {
        const isSecurityActive = guildSecurityStatus.get(member.guild.id) ?? true;
        if (!isSecurityActive) return;

        const hesapYasiGun = (Date.now() - member.user.createdTimestamp) / (1000 * 60 * 60 * 24);
        if (hesapYasiGun < 3) {
            const logChannel = member.guild.channels.cache.get(LOG_CHANNEL_ID);
            if (logChannel) {
                const embed = new EmbedBuilder()
                    .setColor(0xFFA500)
                    .setTitle('⚠️ Şüpheli Yeni Hesap Tespit Edildi!')
                    .setDescription(`**Üye:** ${member.user.tag} (${member})\n**Hesap Yaşı:** ${Math.floor(hesapYasiGun)} gün önce açılmış.`)
                    .setTimestamp();
                await logChannel.send({ embeds: [embed] });
            }
        }
    } catch (err) {}
});

client.on('interactionCreate', async (interaction) => {
    try {
        if (interaction.isChatInputCommand()) {
            const { commandName, options, guild, member } = interaction;

            if (!canUseCommand(interaction.user.id, commandName, SECURITY.COMMAND_COOLDOWN_MS)) {
                return interaction.reply({ content: 'Bu komutu tekrar kullanmadan önce 2 saniye bekle!', ephemeral: true });
            }

            if (commandName === 'güvenlik') {
                if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                    return interaction.reply({ content: 'Bu komutu kullanmak için **Yönetici** yetkisine sahip olmalısın!', ephemeral: true });
                }
                const durum = options.getString('durum');
                if (durum === 'aktif') {
                    guildSecurityStatus.set(guild.id, true);
                    return interaction.reply({ content: '🛡️ **Güvenlik sistemi başarıyla AKTİF edildi!**', ephemeral: true });
                } else {
                    guildSecurityStatus.set(guild.id, false);
                    return interaction.reply({ content: '⚠️ **Güvenlik sistemi İNAKTİF duruma getirildi!**', ephemeral: true });
                }
            }

            if (commandName === 'bilgi') {
                const embed = new EmbedBuilder()
                    .setTitle('🛡️ TMA Koruma ve Bilgi Sistemi')
                    .setDescription('Bu bot sunucunuzu spam, küfür saldırılarına ve yetkisiz silinmelere karşı korur.')
                    .addFields(
                        { name: '⚡ Spam & Küfür Koruması', value: 'Hızlı mesajları ve küfürleri engeller, 3 dakika susturma uygular.' },
                        { name: '🚨 Güvenlik Logları', value: 'Silinen kanal/rolleri ve şüpheli hesapları log kanalına bildirir.' },
                        { name: '⚙️ Komutlar', value: '`/güvenlik aktif` veya `/güvenlik inaktif` ile sistemi yönetebilirsiniz.' }
                    )
                    .setColor(0x3498DB);
                return interaction.reply({ embeds: [embed], ephemeral: true });
            }

            if (commandName === 'bilet') {
                const embed = new EmbedBuilder()
                    .setTitle('TMA | Destek Sistemi')
                    .setDescription('Yardıma mı ihtiyacınız var?\nAşağıdaki **Destek Talebi Oluştur** butonuna tıklayabilirsiniz.')
                    .setImage(TMA_LOGO_URL)
                    .setColor(0x2f3136);

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

            if (commandName === 'aktiflik-sorgu') {
                await interaction.deferReply();
                const playerCount = await getRobloxPlayerCount();
                const embed = new EmbedBuilder()
                    .setTitle(`🟢 TMA oyununun aktifliği: ${playerCount}`)
                    .setDescription(`Oyuna katılmak için tıkla:\n[🔗 Oyuna Git](${ROBLOX_OYUN_LINKI})`)
                    .setColor(0x00FF00);
                return interaction.editReply({ embeds: [embed] });
            }

            return interaction.reply({ content: `**/${commandName}** komutu çalıştırıldı!`, ephemeral: true });
        }

        if (interaction.isButton() && interaction.customId === 'start_ticket_process') {
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('ticket_select_category')
                .setPlaceholder('Destek kategorinizi seçin...')
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
                content: 'Kategoriyi seç ve **Bilet Aç** butonuna bas.',
                components: [new ActionRowBuilder().addComponents(selectMenu), new ActionRowBuilder().addComponents(openButton)],
                ephemeral: true
            });
        }

        if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_select_category') {
            const selectedCategory = interaction.values[0];
            userSelectedCategory.set(`${interaction.guildId}:${interaction.user.id}`, selectedCategory);
            return interaction.update({ content: `Seçilen kategori: **${selectedCategory}**. Şimdi Bilet Aç tuşuna basabilirsin.`, components: interaction.message.components });
        }

        if (interaction.isButton() && interaction.customId === 'open_selected_ticket') {
            const guild = interaction.guild;
            const member = interaction.member;
            const selectionKey = `${guild.id}:${member.id}`;
            const selectedCategory = userSelectedCategory.get(selectionKey);

            if (!selectedCategory) {
                return interaction.reply({ content: 'Lütfen önce bir kategori seç!', ephemeral: true });
            }

            const targetRoleID = BILET_ROLLERI[selectedCategory];
            await interaction.deferReply({ ephemeral: true });

            try {
                const ticketChannel = await guild.channels.create({
                    name: `bilet-${safeChannelName(member.user.username)}`,
                    type: ChannelType.GuildText,
                    topic: `TMA_TICKET_OWNER:${member.id}`,
                    permissionOverwrites: [
                        { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                        { id: member.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
                        { id: targetRoleID, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
                        { id: ANA_YETKILI_ROL_1, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
                        { id: ANA_YETKILI_ROL_2, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
                    ],
                });

                userSelectedCategory.delete(selectionKey);

                const closeRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('close_ticket').setLabel('Bileti Kapat').setStyle(ButtonStyle.Danger).setEmoji('🔒')
                );

                await ticketChannel.send({
                    embeds: [new EmbedBuilder().setTitle('TMA Destek Talebi').setDescription('Yetkililer en kısa sürede ilgilenecektir.').setColor(0x3498DB)],
                    components: [closeRow]
                });

                await interaction.editReply({ content: `Destek talebin oluşturuldu: ${ticketChannel}` });
            } catch (err) {
                await interaction.editReply({ content: 'Bilet oluşturulamadı!' });
            }
        }

        if (interaction.isButton() && interaction.customId === 'close_ticket') {
            await interaction.reply({ content: 'Bilet 5 saniye içinde kapatılıyor...' });
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
