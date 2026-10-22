
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
const FuzzySet = require('fuzzyset');

// ==================================================
// 1. EXPRESS SUNUCUSU
// ==================================================

const app = express();
const PORT = process.env.PORT || 3000;

app.disable('x-powered-by');

app.get('/', (req, res) => {
    res.status(200).send('TMA Bot is running!');
});

app.listen(PORT, () => {
    console.log(`TMA sunucusu ${PORT} portunda çalışıyor.`);
});

// ==================================================
// 2. DISCORD BOTU
// ==================================================

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// ==================================================
// 3. TMA ROLLERİ VE AYARLARI
// ==================================================

const YETKILI_ROL_ID = '1533059872655151116';
const ANA_YETKILI_ROL_1 = '1558732739405025300';
const ANA_YETKILI_ROL_2 = '1532129489495130233';

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

const ROBLOX_OYUN_LINKI =
    `https://www.roblox.com/tr/games/${ROBLOX_PLACE_ID}/TMA-T-rk-Asker-Oyunu`;

const TMA_LOGO_URL =
    'https://i.ibb.co/68v8z92/1000032255.jpg';

// ==================================================
// 4. GÜVENLİK AYARLARI
// ==================================================

const SECURITY = {
    MESSAGE_WINDOW_MS: 5000,
    MAX_MESSAGES_PER_WINDOW: 7,
    SPAM_TIMEOUT_MS: 3 * 60 * 1000,

    COMMAND_COOLDOWN_MS: 2000,

    MAX_OPEN_TICKETS: 1,
    TICKET_IDLE_MS: 2 * 60 * 60 * 1000,

    WARNING_DELETE_MS: 5000,
    TICKET_DELETE_DELAY_MS: 5000
};

const userSelectedCategory = new Map();
const securityMessageMap = new Map();
const securityCommandMap = new Map();

// Yetkili rollerinin güvenlik kontrollerinde kullanılacak listesi.
const SECURITY_STAFF_ROLES = [
    YETKILI_ROL_ID,
    ANA_YETKILI_ROL_1,
    ANA_YETKILI_ROL_2
];

function isSecurityStaff(member) {
    if (!member || !member.permissions) return false;

    if (
        member.permissions.has(
            PermissionsBitField.Flags.Administrator
        )
    ) {
        return true;
    }

    return SECURITY_STAFF_ROLES.some(roleId =>
        member.roles.cache.has(roleId)
    );
}

function hasBotAdminPermission(member) {
    if (!member) return false;

    return (
        member.permissions.has(
            PermissionsBitField.Flags.Administrator
        ) ||
        member.roles.cache.has(YETKILI_ROL_ID)
    );
}

// Kullanıcı ve komut bazlı bekleme süresi.
function canUseCommand(userId, commandName, cooldownMs) {
    const key = `${userId}:${commandName}`;
    const now = Date.now();
    const lastUse = securityCommandMap.get(key) || 0;

    if (now - lastUse < cooldownMs) {
        return false;
    }

    securityCommandMap.set(key, now);
    return true;
}

// Kanal adında kullanılacak güvenli kullanıcı adı.
function safeChannelName(username) {
    const safeName = username
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, SECURITY.MAX_TICKET_NAME_LENGTH);

    return safeName || 'uye';
}

// Süresi geçmiş bellek kayıtlarını temizle.
setInterval(() => {
    const now = Date.now();

    for (const [key, entry] of securityMessageMap.entries()) {
        if (now - entry.lastSeen > 60 * 1000) {
            securityMessageMap.delete(key);
        }
    }

    for (const [key, lastUse] of securityCommandMap.entries()) {
        if (now - lastUse > 10 * 60 * 1000) {
            securityCommandMap.delete(key);
        }
    }
}, 5 * 60 * 1000).unref();

// ==================================================
// 5. ROBLOX OYUNCU SAYISI
// ==================================================

function getRobloxPlayerCount() {
    return new Promise((resolve) => {
        const url =
            `https://games.roblox.com/v1/games?universeIds=${ROBLOX_PLACE_ID}`;

        const request = https.get(url, (res) => {
            let data = '';

            res.on('data', chunk => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    if (res.statusCode !== 200) {
                        return resolve(0);
                    }

                    const json = JSON.parse(data);

                    if (json.data && json.data.length > 0) {
                        return resolve(json.data[0].playing || 0);
                    }

                    resolve(0);
                } catch (error) {
                    resolve(0);
                }
            });
        });

        request.setTimeout(8000, () => {
            request.destroy();
            resolve(0);
        });

        request.on('error', () => {
            resolve(0);
        });
    });
}

// ==================================================
// 6. SLASH KOMUTLARINI KAYDET
// ==================================================

client.once('ready', async () => {
    console.log(`TMA Bot çevrimiçi: ${client.user.tag}`);

    const commands = [
        new SlashCommandBuilder()
            .setName('bilet')
            .setDescription('Destek talebi menüsünü açar.'),

        new SlashCommandBuilder()
            .setName('rütbever')
            .setDescription('Üyeye Discord rolü verir.')
            .addUserOption(opt =>
                opt.setName('kullanici')
                    .setDescription('Üye')
                    .setRequired(true)
            )
            .addRoleOption(opt =>
                opt.setName('rol')
                    .setDescription('Rol')
                    .setRequired(true)
            ),

        new SlashCommandBuilder()
            .setName('rütbeal')
            .setDescription('Üyeden Discord rolü alır.')
            .addUserOption(opt =>
                opt.setName('kullanici')
                    .setDescription('Üye')
                    .setRequired(true)
            )
            .addRoleOption(opt =>
                opt.setName('rol')
                    .setDescription('Rol')
                    .setRequired(true)
            ),

        new SlashCommandBuilder()
            .setName('rütbe-terfi')
            .setDescription('Roblox grubunda rütbe terfi ettirir.')
            .addStringOption(opt =>
                opt.setName('roblox_id')
                    .setDescription('Roblox ID')
                    .setRequired(true)
            )
            .addStringOption(opt =>
                opt.setName('rutbe_adi')
                    .setDescription('Yeni rütbe adı')
                    .setRequired(true)
            )
            .addStringOption(opt =>
                opt.setName('sebep')
                    .setDescription('Terfi sebebi')
                    .setRequired(true)
            ),

        new SlashCommandBuilder()
            .setName('rütbe-düşür')
            .setDescription('Roblox grubunda rütbe düşürür.')
            .addStringOption(opt =>
                opt.setName('roblox_id')
                    .setDescription('Roblox ID')
                    .setRequired(true)
            )
            .addStringOption(opt =>
                opt.setName('rutbe_adi')
                    .setDescription('Yeni rütbe adı')
                    .setRequired(true)
            )
            .addStringOption(opt =>
                opt.setName('sebep')
                    .setDescription('Sebep')
                    .setRequired(true)
            ),

        new SlashCommandBuilder()
            .setName('rütbe-sorgu')
            .setDescription('Roblox grubundaki rütbeyi sorgular.')
            .addStringOption(opt =>
                opt.setName('roblox_id')
                    .setDescription('Roblox ID')
                    .setRequired(true)
            ),

        new SlashCommandBuilder()
            .setName('tam-yasakla')
            .setDescription('Kullanıcıyı yasaklar.')
            .addUserOption(opt =>
                opt.setName('kullanici')
                    .setDescription('Üye')
                    .setRequired(true)
            ),

        new SlashCommandBuilder()
            .setName('oyun-yasak-kaldır')
            .setDescription('Yasağı kaldırır.')
            .addUserOption(opt =>
                opt.setName('kullanici')
                    .setDescription('Üye')
                    .setRequired(true)
            ),

        new SlashCommandBuilder()
            .setName('oyun-yasak-sorgu')
            .setDescription('Yasak sorgular.')
            .addUserOption(opt =>
                opt.setName('kullanici')
                    .setDescription('Üye')
                    .setRequired(true)
            ),

        new SlashCommandBuilder()
            .setName('bilgi')
            .setDescription('Bot bilgilerini gösterir.'),

        new SlashCommandBuilder()
            .setName('aktiflik-sorgu')
            .setDescription('Oyun aktiflik durumunu gösterir.'),

        new SlashCommandBuilder()
            .setName('aktiflik-çağrı')
            .setDescription('Personelleri oyuna davet eder.')
    ].map(command => command.toJSON());

    try {
        if (!process.env.DISCORD_TOKEN) {
            throw new Error('DISCORD_TOKEN ortam değişkeni eksik!');
        }

        const rest = new REST({ version: '10' })
            .setToken(process.env.DISCORD_TOKEN);

        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands }
        );

        console.log('TMA Slash komutları kaydedildi.');
    } catch (error) {
        console.error('Komut kayıt hatası:', error);
    }
});

// ==================================================
// 7. SPAM VE KÜFÜR KORUMASI
// ==================================================

const badWords = [
    'amk', 'aq', 'aw', 'mq', 'hdabla',
    'sik', 'sikti', 'siktir', 'sikim', 'sokuk',
    'yarrak', 'yarak', 'orospu', 'orosbu',
    'pezevenk', 'şerefsiz', 'kahpe',
    'göt', 'got', 'ibne', 'ipne', 'puşt',
    'pust', 'mal', 'porno', 'porn', 'sex',
    'seks', '31', 'sidik', 'meme', 'göğüs',
    'ananı', 'anani'
];

const swearWordsSet = FuzzySet(badWords);

client.on('messageCreate', async (message) => {
    if (!message.guild || message.author.bot) return;
    if (!message.member) return;

    const member = message.member;
    const userId = message.author.id;
    const lowerContent = message.content.toLowerCase();

    // Yetkililer otomatik spam/küfür işlemlerinden muaf.
    // Bu muafiyet Discord yetkilerini değiştirmez.
    if (!isSecurityStaff(member)) {
        // SPAM KORUMASI
        const now = Date.now();
        const key = `${message.guild.id}:${userId}`;

        let entry = securityMessageMap.get(key);

        if (
            !entry ||
            now - entry.windowStart >= SECURITY.MESSAGE_WINDOW_MS
        ) {
            entry = {
                windowStart: now,
                count: 0,
                lastSeen: now
            };
        }

        entry.count++;
        entry.lastSeen = now;
        securityMessageMap.set(key, entry);

        if (entry.count > SECURITY.MAX_MESSAGES_PER_WINDOW) {
            try {
                if (message.deletable) {
                    await message.delete();
                }

                if (member.moderatable) {
                    await member.timeout(
                        SECURITY.SPAM_TIMEOUT_MS,
                        'TMA otomatik spam koruması'
                    );
                }
            } catch (error) {
                console.error('Spam koruması:', error.message);
            }

            return;
        }
    }

    // KÜFÜR FİLTRESİ
    // Kelime sınırları sayesinde "malzeme" gibi kelimelerin
    // yalnızca "mal" içerdiği için işaretlenmesi azaltılır.
    const words = lowerContent.match(/[\p{L}\p{N}]+/gu) || [];
    let küfürBulundu = false;

    for (const word of words) {
        const result = swearWordsSet.get(word);

        if (result && result[0][0] >= 0.80) {
            küfürBulundu = true;
            break;
        }
    }

    if (!küfürBulundu && words.length === 1) {
        const result = swearWordsSet.get(lowerContent.trim());

        if (result && result[0][0] >= 0.80) {
            küfürBulundu = true;
        }
    }

    if (küfürBulundu && !isSecurityStaff(member)) {
        try {
            if (message.deletable) {
                await message.delete();
            }

            if (member.moderatable) {
                await member.timeout(
                    SECURITY.SPAM_TIMEOUT_MS,
                    'TMA küfür filtresi'
                );
            }

            const warningMsg = await message.channel.send({
                content:
                    `${message.author}, uygunsuz kelime nedeniyle ` +
                    'mesajın silindi ve 3 dakika susturuldun. 🛑',
                allowedMentions: {
                    users: [message.author.id]
                }
            });

            setTimeout(() => {
                warningMsg.delete().catch(() => {});
            }, SECURITY.WARNING_DELETE_MS);
        } catch (error) {
            console.error('Küfür filtresi hatası:', error);
        }
    }
});

// ==================================================
// 8. SLASH KOMUTLARI VE YETKİ KONTROLLERİ
// ==================================================

client.on('interactionCreate', async (interaction) => {
    try {
        if (interaction.isChatInputCommand()) {
            const { commandName } = interaction;
            const member = interaction.member;

            // Komut spam koruması
            if (
                !canUseCommand(
                    interaction.user.id,
                    commandName,
                    SECURITY.COMMAND_COOLDOWN_MS
                )
            ) {
                return interaction.reply({
                    content: 'Bu komutu tekrar kullanmadan önce 2 saniye bekle!',
                    ephemeral: true
                });
            }

            const protectedCommands = [
                'rütbever',
                'rütbeal',
                'rütbe-terfi',
                'rütbe-düşür',
                'tam-yasakla',
                'oyun-yasak-kaldır'
            ];

            if (
                protectedCommands.includes(commandName) &&
                !hasBotAdminPermission(member)
            ) {
                return interaction.reply({
                    content: 'Bu komutu kullanmak için yetkin yok!',
                    ephemeral: true
                });
            }

            // BİLET MENÜSÜ
            if (commandName === 'bilet') {
                const embed = new EmbedBuilder()
                    .setTitle('TMA | Destek Sistemi')
                    .setDescription(
                        'Yardıma mı ihtiyacınız var?\n' +
                        'Aşağıdaki **Destek Talebi Oluştur** butonuna ' +
                        'tıklayarak bilet menüsüne ulaşabilirsiniz.\n\n' +
                        '⏱️ **Mesai Saatleri:**\n' +
                        '• **Hafta İçi:** 05.00 - 12.00\n' +
                        '• **Hafta Sonu:** 09.00 - 12.00'
                    )
                    .setImage(TMA_LOGO_URL)
                    .setColor(0x2f3136);

                const button = new ButtonBuilder()
                    .setCustomId('start_ticket_process')
                    .setLabel('Destek Talebi Oluştur')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🎫');

                return interaction.reply({
                    embeds: [embed],
                    components: [
                        new ActionRowBuilder().addComponents(button)
                    ]
                });
            }

            // DISCORD ROL VER
            if (commandName === 'rütbever') {
                const targetMember =
                    interaction.options.getMember('kullanici');
                const targetRole =
                    interaction.options.getRole('rol');

                if (!targetMember || !targetRole) {
                    return interaction.reply({
                        content: 'Üye veya rol bulunamadı.',
                        ephemeral: true
                    });
                }

                if (
                    targetRole.managed ||
                    targetRole.id === interaction.guild.id ||
                    targetRole.position >=
                        interaction.guild.members.me.roles.highest.position
                ) {
                    return interaction.reply({
                        content: 'Bu rol bot tarafından verilemez.',
                        ephemeral: true
                    });
                }

                if (
                    targetRole.permissions.has(
                        PermissionsBitField.Flags.Administrator
                    ) &&
                    !interaction.memberPermissions.has(
                        PermissionsBitField.Flags.Administrator
                    )
                ) {
                    return interaction.reply({
                        content: 'Administrator rolünü veremezsin.',
                        ephemeral: true
                    });
                }

                try {
                    await targetMember.roles.add(
                        targetRole,
                        `TMA rol komutu: ${interaction.user.tag}`
                    );

                    return interaction.reply({
                        content:
                            `${targetMember} üyesine **${targetRole.name}** ` +
                            'rolü verildi.',
                        ephemeral: true
                    });
                } catch (error) {
                    return interaction.reply({
                        content:
                            'Rol verilemedi. Botun rol sırasını ve izinlerini kontrol et.',
                        ephemeral: true
                    });
                }
            }

            // DISCORD ROL AL
            if (commandName === 'rütbeal') {
                const targetMember =
                    interaction.options.getMember('kullanici');
                const targetRole =
                    interaction.options.getRole('rol');

                if (!targetMember || !targetRole) {
                    return interaction.reply({
                        content: 'Üye veya rol bulunamadı.',
                        ephemeral: true
                    });
                }

                if (
                    targetRole.managed ||
                    targetRole.position >=
                        interaction.guild.members.me.roles.highest.position
                ) {
                    return interaction.reply({
                        content: 'Bu rol bot tarafından alınamaz.',
                        ephemeral: true
                    });
                }

                try {
                    await targetMember.roles.remove(
                        targetRole,
                        `TMA rol kaldırma komutu: ${interaction.user.tag}`
                    );

                    return interaction.reply({
                        content:
                            `${targetMember} üyesinden **${targetRole.name}** ` +
                            'rolü alındı.',
                        ephemeral: true
                    });
                } catch (error) {
                    return interaction.reply({
                        content: 'Rol alınamadı. Bot izinlerini kontrol et.',
                        ephemeral: true
                    });
                }
            }

            // ROBLOX OYUN AKTİFLİĞİ
            if (commandName === 'aktiflik-sorgu') {
                await interaction.deferReply();

                const playerCount = await getRobloxPlayerCount();

                const embed = new EmbedBuilder()
                    .setTitle(`🟢 TMA oyununun aktifliği: ${playerCount}`)
                    .setDescription(
                        `Oyuna katılmak için tıkla:\n` +
                        `[🔗 Oyuna Git](${ROBLOX_OYUN_LINKI})`
                    )
                    .setColor(0x00FF00);

                return interaction.editReply({
                    embeds: [embed]
                });
            }

            // BİLGİ KOMUTU
            if (commandName === 'bilgi') {
                const embed = new EmbedBuilder()
                    .setTitle('TMA Bot Bilgileri')
                    .setDescription(
                        `Bot: ${client.user.tag}\n` +
                        `Sunucular: ${client.guilds.cache.size}\n` +
                        `Gecikme: ${client.ws.ping} ms`
                    )
                    .setColor(0x3498DB);

                return interaction.reply({
                    embeds: [embed],
                    ephemeral: true
                });
            }

            // Diğer Roblox komutları mevcut isimleriyle korunuyor.
            // Gerçek Roblox API işlemleri bu komutlara henüz bağlanmadı.
            return interaction.reply({
                content: `**/${commandName}** komutu için işlem entegrasyonu gerekiyor.`,
                ephemeral: true
            });
        }

        // ==================================================
        // 9. BİLET MENÜSÜNÜ AÇ
        // ==================================================

        if (
            interaction.isButton() &&
            interaction.customId === 'start_ticket_process'
        ) {
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('ticket_select_category')
                .setPlaceholder('Destek kategorinizi seçin...')
                .addOptions([
                    {
                        label: 'Moderatör Bileti',
                        value: 'moderator_bilet',
                        emoji: '🛡️'
                    },
                    {
                        label: 'Reklam Destek Bileti',
                        value: 'reklam_bilet',
                        emoji: '⚖️'
                    },
                    {
                        label: 'Gamepass Bileti',
                        value: 'gamepass_bilet',
                        emoji: '🪙'
                    },
                    {
                        label: 'Oyun Destek Bileti',
                        value: 'oyun_bilet',
                        emoji: '⬛'
                    },
                    {
                        label: 'Geri Dönüş Bileti',
                        value: 'geridonus_bilet',
                        emoji: '🎖️'
                    },
                    {
                        label: 'Transfer Bileti',
                        value: 'transfer_bilet',
                        emoji: '🌐'
                    },
                    {
                        label: 'Rütbe Destek Bileti',
                        value: 'rutbe_bilet',
                        emoji: '👥'
                    }
                ]);

            const openButton = new ButtonBuilder()
                .setCustomId('open_selected_ticket')
                .setLabel('Bilet Aç')
                .setStyle(ButtonStyle.Success)
                .setEmoji('🎫');

            return interaction.reply({
                content:
                    'Bilet kategorisini seç ve aşağıdaki **Bilet Aç** ' +
                    'butonuna bas.',
                components: [
                    new ActionRowBuilder().addComponents(selectMenu),
                    new ActionRowBuilder().addComponents(openButton)
                ],
                ephemeral: true
            });
        }

        // ==================================================
        // 10. BİLET KATEGORİSİ SEÇ
        // ==================================================

        if (
            interaction.isStringSelectMenu() &&
            interaction.customId === 'ticket_select_category'
        ) {
            const selectedCategory = interaction.values[0];

            if (!Object.hasOwn(BILET_ROLLERI, selectedCategory)) {
                return interaction.reply({
                    content: 'Geçersiz bilet kategorisi.',
                    ephemeral: true
                });
            }

            userSelectedCategory.set(
                `${interaction.guildId}:${interaction.user.id}`,
                selectedCategory
            );

            return interaction.update({
                content:
                    `Seçilen kategori: **${selectedCategory}**\n` +
                    'Şimdi **Bilet Aç** butonuna basabilirsin.',
                components: interaction.message.components
            });
        }

        // ==================================================
        // 11. GÜVENLİ BİLET OLUŞTURMA
        // ==================================================

        if (
            interaction.isButton() &&
            interaction.customId === 'open_selected_ticket'
        ) {
            const guild = interaction.guild;
            const member = interaction.member;

            if (!guild || !member) {
                return interaction.reply({
                    content: 'Bu işlem yalnızca sunucuda kullanılabilir.',
                    ephemeral: true
                });
            }

            const selectionKey = `${guild.id}:${member.id}`;
            const selectedCategory =
                userSelectedCategory.get(selectionKey);

            if (
                !selectedCategory ||
                !Object.hasOwn(BILET_ROLLERI, selectedCategory)
            ) {
                return interaction.reply({
                    content: 'Lütfen önce geçerli bir kategori seç.',
                    ephemeral: true
                });
            }

            // Aynı üyenin birden fazla bilet açmasını engelle.
            const existingTicket = guild.channels.cache.find(channel =>
                channel.type === ChannelType.GuildText &&
                channel.topic === `TMA_TICKET_OWNER:${member.id}`
            );

            if (existingTicket) {
                return interaction.reply({
                    content: `Zaten açık bir biletin var: ${existingTicket}`,
                    ephemeral: true
                });
            }

            const targetRoleID = BILET_ROLLERI[selectedCategory];

            const targetRole = guild.roles.cache.get(targetRoleID);
            const staffRole1 = guild.roles.cache.get(ANA_YETKILI_ROL_1);
            const staffRole2 = guild.roles.cache.get(ANA_YETKILI_ROL_2);

            if (!targetRole || !staffRole1 || !staffRole2) {
                return interaction.reply({
                    content:
                        'Bilet rolleri bulunamadı. Rol ID ayarlarını kontrol et.',
                    ephemeral: true
                });
            }

            await interaction.deferReply({ ephemeral: true });

            try {
                const ticketChannel = await guild.channels.create({
                    name: `bilet-${safeChannelName(member.user.username)}`,
                    type: ChannelType.GuildText,
                    topic: `TMA_TICKET_OWNER:${member.id}`,
                    permissionOverwrites: [
                        {
                            id: guild.id,
                            deny: [
                                PermissionsBitField.Flags.ViewChannel
                            ]
                        },
                        {
                            id: member.id,
                            allow: [
                                PermissionsBitField.Flags.ViewChannel,
                                PermissionsBitField.Flags.SendMessages,
                                PermissionsBitField.Flags.ReadMessageHistory,
                                PermissionsBitField.Flags.AttachFiles,
                                PermissionsBitField.Flags.EmbedLinks
                            ]
                        },
                        {
                            id: targetRoleID,
                            allow: [
                                PermissionsBitField.Flags.ViewChannel,
                                PermissionsBitField.Flags.SendMessages,
                                PermissionsBitField.Flags.ReadMessageHistory
                            ]
                        },
                        {
                            id: ANA_YETKILI_ROL_1,
                            allow: [
                                PermissionsBitField.Flags.ViewChannel,
                                PermissionsBitField.Flags.SendMessages,
                                PermissionsBitField.Flags.ReadMessageHistory
                            ]
                        },
                        {
                            id: ANA_YETKILI_ROL_2,
                            allow: [
                                PermissionsBitField.Flags.ViewChannel,
                                PermissionsBitField.Flags.SendMessages,
                                PermissionsBitField.Flags.ReadMessageHistory
                            ]
                        }
                    ]
                });

                userSelectedCategory.delete(selectionKey);

                const closeButton = new ButtonBuilder()
                    .setCustomId('close_ticket')
                    .setLabel('Bileti Kapat')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🔒');

                const closeRow = new ActionRowBuilder()
                    .addComponents(closeButton);

                const ticketEmbed = new EmbedBuilder()
                    .setTitle('TMA Destek Talebi')
                    .setDescription(
                        `Talep sahibi: ${member}\n` +
                        `Kategori: **${selectedCategory}**\n\n` +
                        'Yetkililer en kısa sürede ilgilenecektir. Lütfen bekleyiniz.'
                    )
                    .setColor(0x3498DB);

                await ticketChannel.send({
                    embeds: [ticketEmbed],
                    components: [closeRow],
                    allowedMentions: {
                        users: [member.id],
                        roles: []
                    }
                });

                await interaction.editReply({
                    content: `Destek talebin oluşturuldu: ${ticketChannel}`
                });

                // 2 saat boyunca mesaj gelmezse otomatik kapat.
                const collector = ticketChannel.createMessageCollector({
                    idle: SECURITY.TICKET_IDLE_MS
                });

                collector.on('end', async (collected, reason) => {
                    if (reason !== 'idle') return;

                    try {
                        await ticketChannel.send(
                            'Bu bilet 2 saat boyunca etkinlik olmadığı için kapatılıyor.'
                        );

                        setTimeout(() => {
                            ticketChannel.delete().catch(() => {});
                        }, SECURITY.TICKET_DELETE_DELAY_MS);
                    } catch (error) {
                        console.error('Otomatik bilet kapatma:', error.message);
                    }
                });
            } catch (error) {
                console.error('Bilet oluşturma hatası:', error);

                if (interaction.deferred) {
                    await interaction.editReply({
                        content:
                            'Bilet kanalı oluşturulamadı. Botun kanal izinlerini kontrol et.'
                    }).catch(() => {});
                }
            }
        }

        // ==================================================
        // 12. YETKİ KONTROLLÜ BİLET KAPATMA
        // ==================================================

        if (
            interaction.isButton() &&
            interaction.customId === 'close_ticket'
        ) {
            const channel = interaction.channel;
            const guild = interaction.guild;
            const member = interaction.member;

            if (!channel || !guild || !member) {
                return interaction.reply({
                    content: 'Kanal bilgisi alınamadı.',
                    ephemeral: true
                });
            }

            if (
                channel.type !== ChannelType.GuildText ||
                !channel.topic ||
                !channel.topic.startsWith('TMA_TICKET_OWNER:')
            ) {
                return interaction.reply({
                    content: 'Bu kanal bir TMA bileti değil.',
                    ephemeral: true
                });
            }

            const ownerId = channel.topic.replace(
                'TMA_TICKET_OWNER:',
                ''
            );

            const isOwner = interaction.user.id === ownerId;
            const isStaff = isSecurityStaff(member);

            if (!isOwner && !isStaff) {
                return interaction.reply({
                    content:
                        'Bu bileti yalnızca bilet sahibi veya yetkili ekip kapatabilir.',
                    ephemeral: true
                });
            }

            await interaction.reply({
                content: 'Bilet 5 saniye içinde kapatılıyor...'
            });

            setTimeout(() => {
                channel.delete('TMA bilet kapatma işlemi').catch(() => {});
            }, SECURITY.TICKET_DELETE_DELAY_MS);
        }
    } catch (error) {
        console.error('Interaction hatası:', error);

        if (!interaction.isRepliable()) return;

        const response = {
            content:
                'İşlem sırasında bir hata oluştu. Lütfen tekrar dene.',
            ephemeral: true
        };

        if (interaction.deferred) {
            await interaction.editReply({
                content: response.content
            }).catch(() => {});
        } else if (!interaction.replied) {
            await interaction.reply(response).catch(() => {});
        }
    }
});

// ==================================================
// 13. GENEL HATA YÖNETİMİ
// ==================================================

client.on('error', (error) => {
    console.error('Discord istemci hatası:', error);
});

client.on('shardError', (error) => {
    console.error('Discord bağlantı hatası:', error);
});

process.on('unhandledRejection', (reason) => {
    console.error('Yakalanmamış Promise hatası:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('Yakalanmamış çalışma zamanı hatası:', error);
});

// ==================================================
// 14. BOTU BAŞLAT
// ==================================================

if (!process.env.DISCORD_TOKEN) {
    console.error(
        'HATA: Render Environment Variables bölümüne DISCORD_TOKEN ekle!'
    );
} else {
    client.login(process.env.DISCORD_TOKEN).catch((error) => {
        console.error('Discord giriş hatası:', error);
    });
}
