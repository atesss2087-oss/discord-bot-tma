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
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    REST,
    Routes
} = require('discord.js');

const express = require('express');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3000;

app.disable('x-powered-by');

app.get('/', (req, res) => {
    res.status(200).send('Bot is running securely and perfectly!');
});

app.listen(PORT, () => {
    console.log(`Sunucu ${PORT} portunda güvenli şekilde çalışıyor.`);
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

// --- ROL VE KANAL ID'LERİ ---
const YETKILI_ROL_ID = '1533059872655151116';
const ANA_YETKILI_ROL_1 = '1558732739405025300';
const ANA_YETKILI_ROL_2 = '1532129489495130233';
const TRANSFER_BILET_ROL_ID = '1531720791723610352';
const LOG_CHANNEL_ID = '1562784881140961281';
const FILM_KANAL_ID = '1563177477289811968';
const LINK_ATABILEN_ROL_ID = '1536812259815202857';

const BILET_ROLLERI = {
    moderator_bilet: '1533064202950807712',
    reklam_bilet: '1531720771099951255',
    oyun_bilet: '1531720784735637534',
    gamepass_bilet: '1531720771691479133',
    geridonus_bilet: '1531720829824405521',
    transfer_bilet: TRANSFER_BILET_ROL_ID,
    rutbe_bilet: '1533064202950807712'
};

const SECURITY = {
    MESSAGE_WINDOW_MS: 3000,
    MAX_MESSAGES_PER_WINDOW: 3,
    SPAM_TIMEOUT_MS: 3 * 60 * 1000,
    COMMAND_COOLDOWN_MS: 2000,
    WARNING_DELETE_MS: 5000,
    TICKET_DELETE_DELAY_MS: 5000,
    MAX_TICKET_NAME_LENGTH: 50
};

const userSelectedCategory = new Map();
const securityMessageMap = new Map();
const securityCommandMap = new Map();
const guildSecurityStatus = new Map();
const userMessageCounts = new Map();

// --- PROFESYONEL FİLM ARŞİVİ ---
const FILM_ARSIVI = [
    { baslik: "Hababam Sınıfı", tur: "Komedi / Klasik", yil: 1975, puan: "9.3/10", konu: "Özel Çamlıca Lisesi'ne yeni gelen müdür muavini Mahmut Hoca ile hayatı neşe ve haylazlıkla geçiren öğrencilerin maceraları.", afis: "https://upload.wikimedia.org/wikipedia/tr/b/b5/Hababam_S%C4%B1n%C4%B1f%C4%B1_film_afii.jpg" },
    { baslik: "Dağ II", tur: "Savaş / Aksiyon / Dram", yil: 2016, puan: "8.8/10", konu: "Zorlu şartlarda vatan savunması yapan MAK timinin destansı hikayesi.", afis: "https://upload.wikimedia.org/wikipedia/tr/3/36/Da%C4%9F_2_film_afii.jpg" },
    { baslik: "The Dark Knight", tur: "Aksiyon / Suç", yil: 2008, puan: "9.0/10", konu: "Batman, şehri kaosa sürükleyen Joker'e karşı adalet mücadelesi verir.", afis: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=500" },
    { baslik: "Kutsal Damacana", tur: "Komedi / Absürt", yil: 2007, puan: "7.1/10", konu: "Fakir bir hayat süren Fikret'in tesadüfler sonucu yaşadığı absürt komedi olayları.", afis: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500" },
    { baslik: "The Conjuring", tur: "Korku / Gizem", yil: 2013, puan: "7.5/10", konu: "Yeni taşındıkları çiftlik evinde paranormal olaylar yaşayan aileye yardım eden araştırmacılar.", afis: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500" }
];

function rastgeleFilmSec() {
    return FILM_ARSIVI[Math.floor(Math.random() * FILM_ARSIVI.length)];
}

function hasStaffPermission(member) {
    if (!member) return false;
    if (member.permissions.has(PermissionsBitField.Flags.Administrator)) return true;
    return member.roles.cache.has(YETKILI_ROL_ID) || member.roles.cache.has(ANA_YETKILI_ROL_1) || member.roles.cache.has(ANA_YETKILI_ROL_2);
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

client.once('ready', async () => {
    console.log(`Bot başarıyla çevrimiçi: ${client.user.tag}`);

    const commands = [
        new SlashCommandBuilder().setName('bilet').setDescription('Destek ve Bilet merkezini açar (Yetkili).'),
        new SlashCommandBuilder().setName('duyuru').setDescription('Sunucu duyurusu yayınlar (Yetkili).').addChannelOption(opt => opt.setName('kanal').setDescription('Kanal').setRequired(true)).addStringOption(opt => opt.setName('mesaj').setDescription('Mesaj').setRequired(true)),
        new SlashCommandBuilder().setName('sunucu-bilgi').setDescription('Sunucu istatistiklerini gösterir.'),
        new SlashCommandBuilder().setName('at').setDescription('Üyeyi sunucudan atar (Yetkili).').addUserOption(opt => opt.setName('kullanici').setDescription('Üye').setRequired(true)).addStringOption(opt => opt.setName('sebep').setDescription('Sebep').setRequired(false)),
        new SlashCommandBuilder().setName('yasakla').setDescription('Üyeyi yasaklar (Yetkili).').addUserOption(opt => opt.setName('kullanici').setDescription('Üye').setRequired(true)).addStringOption(opt => opt.setName('sebep').setDescription('Sebep').setRequired(false)),
        new SlashCommandBuilder().setName('guvenlik').setDescription('Güvenlik modülünü açar/kapatır (Yönetici).').addStringOption(opt => opt.setName('durum').setDescription('Aktif/İnaktif').setRequired(true).addChoices({ name: 'Aktif', value: 'aktif' }, { name: 'İnaktif', value: 'inaktif' })),
        new SlashCommandBuilder().setName('bilgi').setDescription('Bot bilgi sistemini gösterir.'),
        new SlashCommandBuilder().setName('film-öneri').setDescription('Sinema kanalına afişi sağda olan rastgele film önerisi gönderir.')
    ].map(command => command.toJSON());

    try {
        if (!process.env.DISCORD_TOKEN) throw new Error('DISCORD_TOKEN eksik!');
        const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('Slash komutları senkronize edildi.');
    } catch (error) { console.error('Komut kayıt hatası:', error); }
});

const badWords = ["amk", "aq", "aw", "mq", "mk", "amq", "orospu", "orosbu", "piç", "pic", "pezevenk", "sik", "sikerim", "yarrak", "yarak", "göt", "got"];

function normalizeText(text) {
    return text.toLocaleLowerCase("tr-TR").normalize("NFKC").replace(/[^p{L}p{N}]+/gu, " ").trim();
}

const normalizedBadWords = badWords.map(normalizeText);

client.on("messageCreate", async (message) => {
    if (!message.guild || message.author.bot || !message.member) return;

    const isSecurityActive = guildSecurityStatus.get(message.guild.id) ?? true;
    if (!isSecurityActive) return;

    const member = message.member;
    const rawContent = message.content;
    const content = normalizeText(rawContent);

    // Link koruması
    const linkVarMi = rawContent.includes("http://") || rawContent.includes("https://") || rawContent.includes("www.") || rawContent.includes("discord.gg") || rawContent.includes("t.me");
    if (linkVarMi) {
        const linkAtabilirMi = hasStaffPermission(member) || member.roles.cache.has(LINK_ATABILEN_ROL_ID);
        if (!linkAtabilirMi) {
            try {
                if (message.deletable) await message.delete();
                const warningMsg = await message.channel.send({
                    content: `${message.author}, bu kanalda sadece yetkililer veya izinli kişiler link paylaşabilir! 🛑`,
                    allowedMentions: { users: [message.author.id] }
                });
                setTimeout(() => { warningMsg.delete().catch(() => {}); }, SECURITY.WARNING_DELETE_MS);
            } catch (err) {}
            return;
        }
    }

    // Küfür koruması
    const küfürBulundu = normalizedBadWords.some(word => (` ${content} `).includes(` ${word} `));
    if (küfürBulundu) {
        try {
            if (message.deletable) await message.delete();
            if (member.moderatable) await member.timeout(SECURITY.SPAM_TIMEOUT_MS, "Otomatik koruma");
            const warningMsg = await message.channel.send({
                content: `${message.author}, uygunsuz dil tespiti nedeniyle mesajın silindi ve 3 dakika susturuldun! 🛑`,
                allowedMentions: { users: [message.author.id] }
            });
            setTimeout(() => { warningMsg.delete().catch(() => {}); }, SECURITY.WARNING_DELETE_MS);
        } catch (error) {}
        return;
    }
});

client.on('interactionCreate', async (interaction) => {
    try {
        if (interaction.isChatInputCommand()) {
            const { commandName, options, guild, member } = interaction;

            if (!canUseCommand(interaction.user.id, commandName, SECURITY.COMMAND_COOLDOWN_MS)) {
                return interaction.reply({ content: 'Komutları çok hızlı kullanıyorsun, lütfen 2 saniye bekle! ⏳', ephemeral: true });
            }

            // --- FİLM ÖNERİ KOMUTU ---
            if (commandName === 'film-öneri') {
                const hedefKanal = guild.channels.cache.get(FILM_KANAL_ID);
                if (!hedefKanal) {
                    return interaction.reply({ content: '❌ Film öneri kanalı bulunamadı!', ephemeral: true });
                }

                const film = rastgeleFilmSec();
                const embed = new EmbedBuilder()
                    .setTitle(`🎬 Sinema Kulübü: ${film.baslik}`)
                    .setDescription(`**Film Konusu:**\n> ${film.konu}`)
                    .addFields(
                        { name: '🍿 Tür', value: film.tur, inline: true },
                        { name: '⭐ Puan', value: film.puan, inline: true },
                        { name: '📅 Yayın Yılı', value: `${film.yil}`, inline: true }
                    )
                    .setColor(0xE50914)
                    .setThumbnail(film.afis) // Afiş sağ tarafta
                    .setFooter({ text: `Öneren: ${interaction.user.tag}` })
                    .setTimestamp();

                await hedefKanal.send({ embeds: [embed] });
                return interaction.reply({ content: `✅ Film önerisi başarıyla <#${FILM_KANAL_ID}> kanalına gönderildi! 🍿`, ephemeral: true });
            }

            if (commandName === 'duyuru') {
                if (!hasStaffPermission(member)) return interaction.reply({ content: 'Yetkin yok!', ephemeral: true });
                const kanal = options.getChannel('kanal');
                const mesaj = options.getString('mesaj');

                const embed = new EmbedBuilder()
                    .setTitle('📢 Sunucu Duyurusu')
                    .setDescription(mesaj)
                    .setColor(0x3498DB)
                    .setFooter({ text: `Yayınlayan: ${interaction.user.tag}` })
                    .setTimestamp();

                await kanal.send({ embeds: [embed] });
                return interaction.reply({ content: `✅ Duyuru ${kanal} kanalına gönderildi!`, ephemeral: true });
            }

            if (commandName === 'sunucu-bilgi') {
                const embed = new EmbedBuilder()
                    .setTitle(`📊 ${guild.name} — İstatistikler`)
                    .addFields({ name: '👥 Toplam Üye', value: `${guild.memberCount}`, inline: true })
                    .setColor(0x3498DB);
                return interaction.reply({ embeds: [embed] });
            }

            if (commandName === 'at') {
                if (!hasStaffPermission(member)) return interaction.reply({ content: 'Yetkin yok!', ephemeral: true });
                const hedef = options.getMember('kullanici');
                await hedef.kick(options.getString('sebep') || 'Belirtilmedi');
                return interaction.reply({ content: `✅ Üye sunucudan atıldı.` });
            }

            if (commandName === 'yasakla') {
                if (!hasStaffPermission(member)) return interaction.reply({ content: 'Yetkin yok!', ephemeral: true });
                const hedef = options.getMember('kullanici');
                await hedef.ban({ reason: options.getString('sebep') || 'Belirtilmedi' });
                return interaction.reply({ content: `🔨 Üye yasaklandı.` });
            }

            if (commandName === 'bilet') {
                if (!hasStaffPermission(member)) return interaction.reply({ content: 'Yetkin yok!', ephemeral: true });
                const embed = new EmbedBuilder().setTitle('Destek Merkezi').setDescription('Destek talebi açmak için butona basın.').setColor(0x2F3136);
                const btn = new ButtonBuilder().setCustomId('start_ticket_process').setLabel('Destek Talebi Oluştur').setStyle(ButtonStyle.Secondary).setEmoji('🎫');
                return interaction.reply({ embeds: [embed], components: [new ActionRowBuilder().addComponents(btn)] });
            }

            if (commandName === 'guvenlik') {
                if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) return interaction.reply({ content: 'Yönetici olmalısın!', ephemeral: true });
                guildSecurityStatus.set(guild.id, options.getString('durum') === 'aktif');
                return interaction.reply({ content: `🛡️ Güvenlik durumu güncellendi.` });
            }

            if (commandName === 'bilgi') {
                return interaction.reply({ embeds: [new EmbedBuilder().setTitle('Bot Bilgi').setDescription('Sistemler aktif ve koruma altında.').setColor(0x3498DB)] });
            }
        }

        // --- BİLET İŞLEMLERİ ---
        if (interaction.isButton() && interaction.customId === 'start_ticket_process') {
            const menu = new StringSelectMenuBuilder().setCustomId('ticket_select_category').setPlaceholder('Kategori seçin...').addOptions([
                { label: 'Moderatör Bileti', value: 'moderator_bilet', emoji: '🛡️' },
                { label: 'Reklam Bileti', value: 'reklam_bilet', emoji: '⚖️' },
                { label: 'Gamepass Bileti', value: 'gamepass_bilet', emoji: '🪙' },
                { label: 'Oyun Bileti', value: 'oyun_bilet', emoji: '⬛' },
                { label: 'Geri Dönüş Bileti', value: 'geridonus_bilet', emoji: '🎖️' },
                { label: 'Transfer Bileti', value: 'transfer_bilet', emoji: '🌐' },
                { label: 'Destek Bileti', value: 'rutbe_bilet', emoji: '👥' }
            ]);
            const btn = new ButtonBuilder().setCustomId('open_selected_ticket').setLabel('Bilet Aç').setStyle(ButtonStyle.Success).setEmoji('🎫');
            return interaction.reply({ content: 'Kategori seçip bilet açabilirsiniz.', components: [new ActionRowBuilder().addComponents(menu), new ActionRowBuilder().addComponents(btn)], ephemeral: true });
        }

        if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_select_category') {
            userSelectedCategory.set(`${interaction.guildId}:${interaction.user.id}`, interaction.values[0]);
            return interaction.update({ content: `Seçilen kategori: **${interaction.values[0]}**. Şimdi Bilet Aç butonuna basabilirsiniz.` });
        }

        if (interaction.isButton() && interaction.customId === 'open_selected_ticket') {
            const key = `${interaction.guild.id}:${interaction.member.id}`;
            const cat = userSelectedCategory.get(key);
            if (!cat) return interaction.reply({ content: 'Önce kategori seçmelisin!', ephemeral: true });

            await interaction.deferReply({ ephemeral: true });
            const channel = await interaction.guild.channels.create({
                name: `bilet-${safeChannelName(interaction.user.username)}`,
                type: ChannelType.GuildText,
                permissionOverwrites: [
                    { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                    { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
                    { id: BILET_ROLLERI[cat], allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
                ]
            });
            userSelectedCategory.delete(key);
            const closeBtn = new ButtonBuilder().setCustomId('close_ticket').setLabel('Bileti Kapat').setStyle(ButtonStyle.Danger).setEmoji('🔒');
            await channel.send({ content: 'Destek talebi başlatıldı.', components: [new ActionRowBuilder().addComponents(closeBtn)] });
            return interaction.editReply({ content: `Bilet açıldı: ${channel}` });
        }

        if (interaction.isButton() && interaction.customId === 'close_ticket') {
            await interaction.reply({ content: 'Bilet kapatılıyor...' });
            setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
        }
    } catch (e) { console.error(e); }
});

client.on('error', console.error);
process.on('unhandledRejection', console.error);

if (!process.env.DISCORD_TOKEN) console.error('TOKEN YOK!');
else client.login(process.env.DISCORD_TOKEN);
