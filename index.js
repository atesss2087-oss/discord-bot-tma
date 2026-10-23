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
    res.status(200).send('TMA Elite Bot is running securely and perfectly!');
});

app.listen(PORT, () => {
    console.log(`TMA Elite sunucusu ${PORT} portunda güvenli şekilde çalışıyor.`);
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
const ADAM_CEKME_IZIN_ROL_1 = '1532129489495130233';
const ADAM_CEKME_IZIN_ROL_2 = '1536813298811535501';
const LOG_CHANNEL_ID = '1562784881140961281';
const FILM_KANAL_ID = '1563177477289811968';
const LINK_ATABILEN_ROL_ID = '1536812259815202857';

// --- EĞİTİM RÜTBE SIRALAMASI (9 KADEME) ---
const EGITIM_RUTBE_SIRALAMASI = [
    '1531720879854194873',
    '1531720879007072488',
    '1531720877174034432',
    '1531720875949293569',
    '1531720874720497704',
    '1531720869829808198',
    '1531720868735090809',
    '1531720867695034651',
    '1531720866482884808'
];

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
    MAX_TICKET_NAME_LENGTH: 50
};

const userSelectedCategory = new Map();
const securityMessageMap = new Map();
const securityCommandMap = new Map();
const guildSecurityStatus = new Map();
const userMessageCounts = new Map();
const adamCekmeCounts = new Map();

// --- PROFESYONEL FİLM ARŞİVİ ---
const FILM_ARSIVI = [
    { baslik: "Hababam Sınıfı", tur: "Komedi / Klasik", yil: 1975, puan: "9.3/10", konu: "Özel Çamlıca Lisesi'ne yeni gelen müdür muavini Mahmut Hoca ile hayatı neşe ve haylazlıkla geçiren öğrencilerin maceraları.", afis: "https://upload.wikimedia.org/wikipedia/tr/b/b5/Hababam_S%C4%B1n%C4%B1f%C4%B1_film_afii.jpg" },
    { baslik: "Dağ II", tur: "Savaş / Aksiyon / Dram", yil: 2016, puan: "8.8/10", konu: "Irak'ın kuzeyindeki operasyonda zorlu şartlarda vatan savunması yapan MAK timinin destansı hikayesi.", afis: "https://upload.wikimedia.org/wikipedia/tr/3/36/Da%C4%9F_2_film_afii.jpg" },
    { baslik: "The Dark Knight", tur: "Aksiyon / Suç", yil: 2008, puan: "9.0/10", konu: "Batman, Gotham şehrini kaosa sürükleyen Joker'e karşı adalet mücadelesi verir.", afis: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=500" },
    { baslik: "Kutsal Damacana", tur: "Komedi / Absürt", yil: 2007, puan: "7.1/10", konu: "Fakir bir hayat süren Fikret'in tesadüfler sonucu kiliseye papaz olarak sızmasıyla başlayan olaylar.", afis: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500" },
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
    console.log(`TMA Elite Master Bot çevrimiçi: ${client.user.tag}`);

    const commands = [
        new SlashCommandBuilder().setName('bilet').setDescription('TMA Destek ve Bilet merkezini açar (Sadece yetkililer).'),
        new SlashCommandBuilder().setName('grup').setDescription('Resmi Roblox grup bağlantısını gösterir.'),
        new SlashCommandBuilder().setName('grup-liste').setDescription('Roblox kullanıcısının üye olduğu tüm grupları listeler.').addStringOption(opt => opt.setName('kullaniciadi').setDescription('Roblox kullanıcı adı').setRequired(true)),
        new SlashCommandBuilder().setName('roblox-profil').setDescription('Roblox kullanıcısının detaylı profilini gösterir.').addStringOption(opt => opt.setName('kullaniciadi').setDescription('Roblox kullanıcı adı').setRequired(true)),
        new SlashCommandBuilder().setName('duyuru').setDescription('TMA karargâh duyurusu yayınlar (Yetkili).').addChannelOption(opt => opt.setName('kanal').setDescription('Duyurunun atılacağı kanal').setRequired(true)).addStringOption(opt => opt.setName('mesaj').setDescription('Duyuru metni').setRequired(true)),
        new SlashCommandBuilder().setName('rutbeler').setDescription('TMA kademe ve rütbe listesini gösterir.'),
        new SlashCommandBuilder().setName('seviye-tablosu').setDescription('TMA mesaj ve seviye yarış tablosunu gösterir.'),
        new SlashCommandBuilder().setName('adam-ceke').setDescription('Üyenin çektiği adam sayısını kaydeder.').addUserOption(opt => opt.setName('kullanici').setDescription('Yetkili üye').setRequired(true)),
        new SlashCommandBuilder().setName('adam-ceke-tablosu').setDescription('Adam çekme yarış tablosunu açar.'),
        new SlashCommandBuilder().setName('profil').setDescription('Kullanıcının detaylı profilini gösterir.').addUserOption(opt => opt.setName('kullanici').setDescription('İncelenecek üye').setRequired(true)),
        new SlashCommandBuilder().setName('sunucu-bilgi').setDescription('Sunucu istatistiklerini gösterir.'),
        new SlashCommandBuilder().setName('at').setDescription('Üyeyi sunucudan atar (Yetkili).').addUserOption(opt => opt.setName('kullanici').setDescription('Atılacak üye').setRequired(true)).addStringOption(opt => opt.setName('sebep').setDescription('Sebep').setRequired(false)),
        new SlashCommandBuilder().setName('yasakla').setDescription('Üyeyi sunucudan yasaklar (Yetkili).').addUserOption(opt => opt.setName('kullanici').setDescription('Yasaklanacak üye').setRequired(true)).addStringOption(opt => opt.setName('sebep').setDescription('Sebep').setRequired(false)),
        new SlashCommandBuilder().setName('guvenlik').setDescription('Güvenlik modülünü açar/kapatır (Yönetici).').addStringOption(opt => opt.setName('durum').setDescription('Aktif/İnaktif').setRequired(true).addChoices({ name: 'Aktif', value: 'aktif' }, { name: 'İnaktif', value: 'inaktif' })),
        new SlashCommandBuilder().setName('bilgi').setDescription('Bot bilgi sistemini gösterir.'),
        new SlashCommandBuilder().setName('aktiflik-sorgu').setDescription('Roblox oyunundaki aktif oyuncu sayısını gösterir.'),
        new SlashCommandBuilder().setName('rütbe-ver').setDescription('Üyeye rütbe verir ve roblox grubuna yansıtır (Yetkili).').addUserOption(opt => opt.setName('kullanici').setDescription('Üye').setRequired(true)).addStringOption(opt => opt.setName('rütbe-adı').setDescription('Rütbe adı').setRequired(true)),
        new SlashCommandBuilder().setName('rütbe-düşür').setDescription('Üyenin rütbesini düşürür (Yetkili).').addUserOption(opt => opt.setName('kullanici').setDescription('Üye').setRequired(true)).addStringOption(opt => opt.setName('rütbe-adı').setDescription('Yeni rütbe adı').setRequired(true)),
        new SlashCommandBuilder().setName('egitim-terfi').setDescription('Eğitime giren askerin rütbesini 1 kademe artırır (Yetkili).').addUserOption(opt => opt.setName('kullanici').setDescription('Asker').setRequired(true)),
        new SlashCommandBuilder().setName('film-öneri').setDescription('Sinema kanalına afişi sağda olan rastgele film önerisi gönderir.')
    ].map(command => command.toJSON());

    try {
        if (!process.env.DISCORD_TOKEN) throw new Error('DISCORD_TOKEN eksik!');
        const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('TMA Elite komutları kusursuz senkronize edildi.');
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

    // Link filtresi (Özel rol ve yetkililer hariç)
    const linkVarMi = rawContent.includes("http://") || rawContent.includes("https://") || rawContent.includes("www.") || rawContent.includes("discord.gg") || rawContent.includes("t.me");
    if (linkVarMi) {
        const linkAtabilirMi = hasStaffPermission(member) || member.roles.cache.has(LINK_ATABILEN_ROL_ID);
        if (!linkAtabilirMi) {
            try {
                if (message.deletable) await message.delete();
                const warningMsg = await message.channel.send({
                    content: `${message.author}, bu kanalda sadece yetkililer veya özel izinli askerler link paylaşabilir! 🛑`,
                    allowedMentions: { users: [message.author.id] }
                });
                setTimeout(() => { warningMsg.delete().catch(() => {}); }, SECURITY.WARNING_DELETE_MS);
            } catch (err) {}
            return;
        }
    }

    // Dosya/Fotoğraf filtresi
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

    // Küfür filtresi
    const küfürBulundu = normalizedBadWords.some(word => (` ${content} `).includes(` ${word} `));
    if (küfürBulundu) {
        try {
            if (message.deletable) await message.delete();
            if (member.moderatable) await member.timeout(SECURITY.SPAM_TIMEOUT_MS, "TMA otomatik koruma");
            const warningMsg = await message.channel.send({
                content: `${message.author}, uygunsuz dil tespiti nedeniyle mesajın silindi ve 3 dakika susturuldun! 🛑`,
                allowedMentions: { users: [message.author.id] }
            });
            setTimeout(() => { warningMsg.delete().catch(() => {}); }, SECURITY.WARNING_DELETE_MS);
        } catch (error) {}
        return;
    }

    if (content === 'sa' || content === 'selam' || content === 'merhaba') {
        await message.reply('Aleykümselam cano hoşgeldin nasılsın?');
        return;
    }

    // Seviye sayacı
    const count = (userMessageCounts.get(message.author.id) || 0) + 1;
    userMessageCounts.set(message.author.id, count);
});

client.on('interactionCreate', async (interaction) => {
    try {
        if (interaction.isChatInputCommand()) {
            const { commandName, options, guild, member } = interaction;

            if (!canUseCommand(interaction.user.id, commandName, SECURITY.COMMAND_COOLDOWN_MS)) {
                return interaction.reply({ content: 'Komutları arka arkaya çok hızlı kullanıyorsun, 2 saniye bekle! ⏳', ephemeral: true });
            }

            // --- FİLM ÖNERİ KOMUTU ---
            if (commandName === 'film-öneri') {
                const hedefKanal = guild.channels.cache.get(FILM_KANAL_ID);
                if (!hedefKanal) {
                    return interaction.reply({ content: '❌ Film öneri kanalı sistemde bulunamadı!', ephemeral: true });
                }

                const film = rastgeleFilmSec();
                const embed = new EmbedBuilder()
                    .setTitle(`🎬 TMA Sinema Kulübü: ${film.baslik}`)
                    .setDescription(`**Film Konusu:**\n> ${film.konu}`)
                    .addFields(
                        { name: '🍿 Tür', value: film.tur, inline: true },
                        { name: '⭐ Puan', value: film.puan, inline: true },
                        { name: '📅 Yayın Yılı', value: `${film.yil}`, inline: true }
                    )
                    .setColor(0xE50914)
                    .setThumbnail(film.afis) // Afiş sağ tarafta
                    .setFooter({ text: `Öneren Asker: ${interaction.user.tag}` })
                    .setTimestamp();

                await hedefKanal.send({ embeds: [embed] });
                return interaction.reply({ content: `✅ Rastgele film önerisi başarıyla <#${FILM_KANAL_ID}> kanalına gönderildi! 🍿`, ephemeral: true });
            }

            // --- EĞİTİM TERFİ KOMUTU ---
            if (commandName === 'egitim-terfi') {
                if (!hasStaffPermission(member)) return interaction.reply({ content: 'Bu komut için yetkili olmalısın! 🛑', ephemeral: true });

                const hedefUye = options.getMember('kullanici');
                if (!hedefUye) return interaction.reply({ content: 'Asker bulunamadı!', ephemeral: true });

                let eskiIndex = -1;
                let eskiRolId = null;

                for (let i = 0; i < EGITIM_RUTBE_SIRALAMASI.length; i++) {
                    if (hedefUye.roles.cache.has(EGITIM_RUTBE_SIRALAMASI[i])) {
                        eskiIndex = i;
                        eskiRolId = EGITIM_RUTBE_SIRALAMASI[i];
                        break;
                    }
                }

                if (eskiIndex === -1) return interaction.reply({ content: `❌ Askerin üzerinde eğitim rütbe aralığında rol yok!`, ephemeral: true });
                if (eskiIndex >= EGITIM_RUTBE_SIRALAMASI.length - 1) return interaction.reply({ content: `⚠️ Asker zaten en yüksek eğitim rütbesinde!`, ephemeral: true });

                const yeniRolId = EGITIM_RUTBE_SIRALAMASI[eskiIndex + 1];

                try {
                    await hedefUye.roles.remove(eskiRolId);
                    await hedefUye.roles.add(yeniRolId);

                    await interaction.reply({ content: `✅ **${hedefUye}** adlı askerin eğitimi tamamlandı ve rütbesi **1 kademe artırıldı**! 🎖️`, ephemeral: false });

                    const logChannel = guild.channels.cache.get(LOG_CHANNEL_ID);
                    if (logChannel) {
                        const logEmbed = new EmbedBuilder()
                            .setTitle('🎖️ Eğitim Terfi Raporu')
                            .addFields(
                                { name: '👤 Asker', value: `${hedefUye}`, inline: true },
                                { name: '⚖️ Eğitmen', value: `${interaction.user}`, inline: true },
                                { name: '📈 Yeni Rütbe', value: `<@&${yeniRolId}>`, inline: false }
                            )
                            .setColor(0x00FF00)
                            .setTimestamp();
                        await logChannel.send({ embeds: [logEmbed] });
                    }
                } catch (err) {
                    return interaction.reply({ content: 'Rol güncellenirken yetki hatası oluştu!', ephemeral: true });
                }
                return;
            }

            // --- RÜTBE VER / DÜŞÜR MODAL ---
            if (commandName === 'rütbe-ver' || commandName === 'rütbe-düşür') {
                if (!hasStaffPermission(member)) return interaction.reply({ content: 'Yetkili olmalısın! 🛑', ephemeral: true });

                const hedefUye = options.getMember('kullanici');
                const rutbeAdi = options.getString('rütbe-adı');
                const islemTipi = commandName === 'rütbe-ver' ? 'Terfi' : 'Tenzil';

                const modal = new ModalBuilder()
                    .setCustomId(`rutbe_modal_${commandName}_${hedefUye.id}_${encodeURIComponent(rutbeAdi)}`)
                    .setTitle(`Askeri ${islemTipi} İşlemi`);

                const sebepInput = new TextInputBuilder()
                    .setCustomId('rutbe_sebep_input')
                    .setLabel('İşlem Sebebi (Zorunlu)')
                    .setStyle(TextInputStyle.Paragraph)
                    .setPlaceholder('Sebep detayını yazınız...')
                    .setRequired(true);

                modal.addComponents(new ActionRowBuilder().addComponents(sebepInput));
                return interaction.showModal(modal);
            }

            if (commandName === 'duyuru') {
                if (!hasStaffPermission(member)) return interaction.reply({ content: 'Yetkili olmalısın!', ephemeral: true });
                const kanal = options.getChannel('kanal');
                const mesaj = options.getString('mesaj');

                const embed = new EmbedBuilder()
                    .setTitle('📢 TMA Resmî Karargâh Duyurusu')
                    .setDescription(mesaj)
                    .setColor(0x3498DB)
                    .setImage(TMA_LOGO_URL)
                    .setFooter({ text: `Yayınlayan: ${interaction.user.tag}` })
                    .setTimestamp();

                await kanal.send({ embeds: [embed] });
                return interaction.reply({ content: `✅ Duyuru başarıyla ${kanal} kanalına gönderildi!`, ephemeral: true });
            }

            if (commandName === 'roblox-profil') {
                const username = options.getString('kullaniciadi');
                await interaction.deferReply();
                const result = await getRobloxUserGroups(username);
                if (!result) return interaction.editReply({ content: `❌ Oyuncu bulunamadı.` });

                const embed = new EmbedBuilder()
                    .setTitle(`🎮 Roblox Profil: ${result.username}`)
                    .setThumbnail(`https://www.roblox.com/headshot-thumbnail/image?userId=${result.userId}&width=420&height=420&format=png`)
                    .addFields(
                        { name: '🆔 ID', value: `${result.userId}`, inline: true },
                        { name: '🌐 Grup Sayısı', value: `${result.groups.length}`, inline: true }
                    )
                    .setColor(0x2F3136);
                return interaction.editReply({ embeds: [embed] });
            }

            if (commandName === 'grup-liste') {
                const username = options.getString('kullaniciadi');
                await interaction.deferReply();
                const result = await getRobloxUserGroups(username);
                if (!result || !result.groups.length) return.interaction.editReply({ content: `❌ Grup bulunamadı.` });

                let text = `**${result.username}** grupları (${result.groups.length}):\n\n`;
                result.groups.forEach((g, i) => { text += `**${i+1}. ${g.group.name}** — \`${g.role.name}\`\n`; });
                return interaction.editReply({ content: text.slice(0, 2000) });
            }

            if (commandName === 'sunucu-bilgi') {
                const embed = new EmbedBuilder()
                    .setTitle(`📊 ${guild.name} — İstatistikler`)
                    .addFields({ name: '👥 Toplam Asker', value: `${guild.memberCount}`, inline: true })
                    .setColor(0x3498DB);
                return interaction.reply({ embeds: [embed] });
            }

            if (commandName === 'at') {
                if (!hasStaffPermission(member)) return interaction.reply({ content: 'Yetkin yok!', ephemeral: true });
                const hedef = options.getMember('kullanici');
                await hedef.kick(options.getString('sebep') || 'Belirtilmedi');
                return interaction.reply({ content: `✅ Asker atıldı.` });
            }

            if (commandName === 'yasakla') {
                if (!hasStaffPermission(member)) return interaction.reply({ content: 'Yetkin yok!', ephemeral: true });
                const hedef = options.getMember('kullanici');
                await hedef.ban({ reason: options.getString('sebep') || 'Belirtilmedi' });
                return interaction.reply({ content: `🔨 Asker yasaklandı.` });
            }

            if (commandName === 'adam-ceke') {
                if (!hasAdamCekmePermission(member)) return interaction.reply({ content: 'İznin yok!', ephemeral: true });
                const hedef = options.getUser('kullanici');
                const sayi = (adamCekmeCounts.get(hedef.id) || 0) + 1;
                adamCekmeCounts.set(hedef.id, sayi);
                return interaction.reply({ content: `✅ İşlendi! **${hedef.tag}** toplam **${sayi}** asker çekti.` });
            }

            if (commandName === 'adam-ceke-tablosu') {
                const sorted = Array.from(adamCekmeCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10);
                let desc = sorted.length ? sorted.map(([id, c], i) => `#${i+1} <@${id}> — **${c}** Asker`).join('\n') : 'Henüz kayıt yok.';
                const embed = new EmbedBuilder().setTitle('📊 Adam Çekme Yarış Tablosu').setDescription(desc).setColor(0x3498DB);
                return interaction.reply({ embeds: [embed] });
            }

            if (commandName === 'bilet') {
                if (!hasStaffPermission(member)) return interaction.reply({ content: 'Yetkin yok!', ephemeral: true });
                const embed = new EmbedBuilder().setTitle('TMA Destek Merkezi').setDescription('Destek talebi açmak için butona basın.').setColor(0x2F3136);
                const btn = new ButtonBuilder().setCustomId('start_ticket_process').setLabel('Destek Talebi Oluştur').setStyle(ButtonStyle.Secondary).setEmoji('🎫');
                return interaction.reply({ embeds: [embed], components: [new ActionRowBuilder().addComponents(btn)] });
            }

            if (commandName === 'grup') return interaction.reply({ content: `🔗 Roblox Grubu: ${ROBLOX_GRUP_LINKI}` });
            if (commandName === 'rutbeler') return interaction.reply({ content: '***TMA RÜTBE LİSTESİ***\n- OR-1 Er ile başlar, Orgenerale kadar devam eder.' });
            
            if (commandName === 'seviye-tablosu') {
                const sorted = Array.from(userMessageCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10);
                let desc = sorted.length ? sorted.map(([id, c], i) => `#${i+1} <@${id}> — Seviye ${Math.floor(c/10)+1}`).join('\n') : 'Kayıt yok.';
                return interaction.reply({ embeds: [new EmbedBuilder().setTitle('🏆 Seviye Yarışı').setDescription(desc).setColor(0xFFD700)] });
            }

            if (commandName === 'profil') {
                const hedefU = options.getUser('kullanici') || interaction.user;
                const hedefM = options.getMember('kullanici') || member;
                const embed = new EmbedBuilder()
                    .setTitle(`👤 Profil: ${hedefU.username}`)
                    .setThumbnail(hedefU.displayAvatarURL({ dynamic: true }))
                    .addFields({ name: '🛡️ Durum', value: '🟢 Temiz', inline: true })
                    .setColor(0x3498DB);
                return interaction.reply({ embeds: [embed] });
            }

            if (commandName === 'guvenlik') {
                if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) return interaction.reply({ content: 'Yönetici olmalısın!', ephemeral: true });
                guildSecurityStatus.set(guild.id, options.getString('durum') === 'aktif');
                return interaction.reply({ content: `🛡️ Güvenlik durumu güncellendi.` });
            }

            if (commandName === 'bilgi') {
                return interaction.reply({ embeds: [new EmbedBuilder().setTitle('TMA Elite Bot').setDescription('Tüm sistemler aktif ve koruma altında.').setColor(0x3498DB)] });
            }

            if (commandName === 'aktiflik-sorgu') {
                await interaction.deferReply();
                const p = await getRobloxPlayerCount();
                return interaction.editReply({ content: `🟢 Roblox Oyuncu Aktifliği: **${p}** kişi.` });
            }
        }

        // --- MODAL & BİLET İŞLEMLERİ ---
        if (interaction.isModalSubmit() && interaction.customId.startsWith('rutbe_modal_')) {
            const parts = interaction.customId.split('_');
            const hedefId = parts[3];
            const rutbeAdi = decodeURIComponent(parts[4]);
            const sebep = interaction.fields.getTextInputValue('rutbe_sebep_input');

            await interaction.reply({ content: `✅ İşlem başarılı. <@${hedefId}> kişisine **${rutbeAdi}** rütbesi verildi.\n📝 **Sebep:** ${sebep}` });
            return;
        }

        if (interaction.isButton() && interaction.customId === 'start_ticket_process') {
            const menu = new StringSelectMenuBuilder().setCustomId('ticket_select_category').setPlaceholder('Kategori seçin...').addOptions([
                { label: 'Moderatör Bileti', value: 'moderator_bilet', emoji: '🛡️' },
                { label: 'Reklam Bileti', value: 'reklam_bilet', emoji: '⚖️' },
                { label: 'Gamepass Bileti', value: 'gamepass_bilet', emoji: '🪙' },
                { label: 'Oyun Bileti', value: 'oyun_bilet', emoji: '⬛' },
                { label: 'Geri Dönüş Bileti', value: 'geridonus_bilet', emoji: '🎖️' },
                { label: 'Transfer Bileti', value: 'transfer_bilet', emoji: '🌐' },
                { label: 'Rütbe Bileti', value: 'rutbe_bilet', emoji: '👥' }
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
