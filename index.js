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
    res.status(200).send('Bot is running securely and perfectly!');
});

app.listen(PORT, () => {
    console.log(`Sunucu ${PORT} portunda aktif.`);
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
const FILM_KANAL_ID = '1563177477289811968';
const GELISTIRICI_ID = 'nesne123';

const ROBLOX_PLACE_ID = '80024713565142';
const ROBLOX_GROUP_ID = '267214689';
const ROBLOX_GRUP_LINKI = `https://www.roblox.com/tr/communities/${ROBLOX_GROUP_ID}/TMA-Turkish-Modern-Army#!/about`;
const ROBLOX_OYUN_LINKI = `https://www.roblox.com/tr/games/${ROBLOX_PLACE_ID}/TMA-T-rk-Asker-Oyunu`;

const BILET_ROLLERI = {
    transfer_bilet: ['1533059872655151116', '1531720829824405521'],
    moderator_bilet: ['1533064202950807712', '1531720771099951255'],
    oyun_bilet: ['1531720784735637534']
};

const userSelectedCategory = new Map();
const securityCommandMap = new Map();

// --- AĞAÇ SİSTEMİ VERİSİ ---
let treeData = {
    height: 33,
    lastWateredBy: "Henüz sulanmadı",
    image: "https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=600"
};

// --- HONEYPOT SAYACI ---
let honeypotKicks = 0;

// --- FİLM ARŞİVİ ---
const FILM_ARSIVI = [
    { baslik: "Hababam Sınıfı", tur: "Komedi / Klasik", yil: 1975, puan: "9.3/10", konu: "Özel Çamlıca Lisesi'ndeki neşeli ve haylaz öğrencilerin maceraları.", afis: "https://upload.wikimedia.org/wikipedia/tr/b/b5/Hababam_S%C4%B1n%C4%B1f%C4%B1_film_afii.jpg" },
    { baslik: "Dağ II", tur: "Aksiyon / Dram", yil: 2016, puan: "8.8/10", konu: "Zorlu şartlarda vatan savunması yapan özel timin hikayesi.", afis: "https://upload.wikimedia.org/wikipedia/tr/3/36/Da%C4%9F_2_film_afii.jpg" },
    { baslik: "The Dark Knight", tur: "Aksiyon / Suç", yil: 2008, puan: "9.0/10", konu: "Şehri kaosa sürükleyen suç dehasına karşı verilen adalet mücadelesi.", afis: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=500" },
    { baslik: "The Conjuring", tur: "Korku / Gizem", yil: 2013, puan: "7.5/10", konu: "Paranormal olaylar yaşayan ailenin gerilim dolu hikayesi.", afis: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500" }
];

function rastgeleFilmSec() {
    return FILM_ARSIVI[Math.floor(Math.random() * FILM_ARSIVI.length)];
}

function hasStaffPermission(member) {
    if (!member) return false;
    if (member.permissions.has(PermissionsBitField.Flags.Administrator)) return true;
    if (member.roles.cache.has(YETKILI_ROL_ID)) return true;

    const targetRole = member.guild.roles.cache.get(YETKILI_ROL_ID);
    if (targetRole) {
        const highestMemberRole = member.roles.highest;
        if (highestMemberRole.position >= targetRole.position) return true;
    }
    return false;
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
    return username.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 50) || 'uye';
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
    console.log(`Bot aktif: ${client.user.tag}`);

    const commands = [
        new SlashCommandBuilder().setName('aktiflık-sorgu').setDescription('Oyundaki anlık aktif oyuncu sayısını gösterir.'),
        new SlashCommandBuilder().setName('profil').setDescription('Kullanıcının profilini, avatarını ve durumunu gösterir.').addUserOption(opt => opt.setName('kullanici').setDescription('Üye').setRequired(false)),
        new SlashCommandBuilder().setName('sunucu-bilgi').setDescription('Sunucu ve aktiflik bilgilerini gösterir.'),
        new SlashCommandBuilder().setName('film-öneri').setDescription('Sinema kanalına rastgele film önerisi gönderir.').addStringOption(opt => opt.setName('isim').setDescription('Film ismi (isteğe bağlı)').setRequired(false)),
        new SlashCommandBuilder().setName('bilet').setDescription('Destek ve bilet merkezini açar (Sadece yetkili).'),
        new SlashCommandBuilder().setName('duyuru').setDescription('Sunucu duyurusu yapar (Sadece yetkili).').addChannelOption(opt => opt.setName('kanal').setDescription('Kanal').setRequired(true)).addStringOption(opt => opt.setName('mesaj').setDescription('Duyuru metni').setRequired(true)),
        new SlashCommandBuilder().setName('rehber').setDescription('Bilgilendirme ve grup rehberini gönderir (Sadece yetkili).'),
        new SlashCommandBuilder().setName('rütbeler').setDescription('Ordu rütbe listesini gösterir.'),
        new SlashCommandBuilder().setName('grup').setDescription('Roblox grup bağlantısını gösterir.'),
        new SlashCommandBuilder().setName('ban').setDescription('Üyeyi süreli yasaklar (Sadece yetkili).').addUserOption(opt => opt.setName('kullanici').setDescription('Üye').setRequired(true)).addStringOption(opt => opt.setName('sebep').setDescription('Sebep').setRequired(false)),
        new SlashCommandBuilder().setName('tam-yasakla').setDescription('Üyeyi süresiz tamamen yasaklar (Sadece yetkili).').addUserOption(opt => opt.setName('kullanici').setDescription('Üye').setRequired(true)).addStringOption(opt => opt.setName('sebep').setDescription('Sebep').setRequired(false)),
        new SlashCommandBuilder().setName('at').setDescription('Üyeyi sunucudan atar ve 24 saat engel koyar (Sadece yetkili).').addUserOption(opt => opt.setName('kullanici').setDescription('Üye').setRequired(true)).addStringOption(opt => opt.setName('sebep').setDescription('Sebep').setRequired(false)),
        new SlashCommandBuilder().setName('güvenlik').setDescription('Üst düzey güvenlik sistemini aktif eder (Sadece yetkili).'),
        new SlashCommandBuilder().setName('kurallar').setDescription('Sunucu kurallarını gönderir.'),
        new SlashCommandBuilder().setName('oyun-başlat').setDescription('Rus ruleti oyununu başlatır.'),
        new SlashCommandBuilder().setName('grup-liste').setDescription('Roblox kullanıcısının gruplarını sayfa sayfa listeler.').addStringOption(opt => opt.setName('kullaniciadi').setDescription('Roblox kullanıcı adı').setRequired(true)),
        new SlashCommandBuilder().setName('aktiflik-duyuru').setDescription('TMA aktiflik çağrısı yayınlar (Sadece yetkili).').addChannelOption(opt => opt.setName('kanal').setDescription('Kanal').setRequired(true)),
        new SlashCommandBuilder().setName('kanal-kilitle').setDescription('Bulunulan kanalı mesaj yazımına kapatır (Sadece yetkili).'),
        new SlashCommandBuilder().setName('kanal-aç').setDescription('Kilitli olan kanalı tekrar mesaj yazımına açar (Sadece yetkili).'),
        new SlashCommandBuilder().setName('ağaç').setDescription('Sunucu için büyüme ağacı panelini kurar.'),
        new SlashCommandBuilder().setName('honeypot-kur').setDescription('Bulunulan kanala Türkçe Honeypot güvenlik paneli kurar (Sadece yetkili).').addChannelOption(opt => opt.setName('kanal').setDescription('Panelin kurulacağı kanal').setRequired(true))
    ].map(command => command.toJSON());

    try {
        const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('Tüm komutlar başarıyla yüklendi.');
    } catch (error) { console.error('Komut yükleme hatası:', error); }
});

client.on("messageCreate", async (message) => {
    if (!message.guild || message.author.bot || !message.member) return;

    // --- HONEYPOT KONTROLÜ ---
    if (message.channel.name.includes('buraya-yazma') || message.channel.name.includes('honeypot')) {
        try {
            if (message.deletable) await message.delete();
            honeypotKicks++;
            if (message.member.kickable) {
                await message.member.kick("Honeypot kanalına mesaj atma ihlali");
            }
        } catch (e) {}
        return;
    }

    const rawContent = message.content;
    const content = rawContent.toLowerCase();

    // --- LİNK KORUMA (Yetkili rolü ve üstü hariç) ---
    const linkVarMi = rawContent.includes("http://") || rawContent.includes("https://") || rawContent.includes("www.") || rawContent.includes("discord.gg") || rawContent.includes("t.me");
    if (linkVarMi) {
        if (!hasStaffPermission(message.member)) {
            try {
                if (message.deletable) await message.delete();
                const warningMsg = await message.channel.send({
                    content: `${message.author}, bu kanalda sadece yetkililer link paylaşabilir! 🛑`,
                    allowedMentions: { users: [message.author.id] }
                });
                setTimeout(() => warningMsg.delete().catch(() => {}), 5000);
            } catch (e) {}
            return;
        }
    }

    // --- SOHBET YANITLARI ---
    if (content === 'sa' || content === 'selam' || content === 'merhaba') {
        await message.reply('As cano hoş geldin nasılsın');
        return;
    }

    if (content.includes('iyi sen') || content.includes('iyiyim sen') || content === 'iyi' || content === 'iyiyim') {
        await message.reply('Ben de çok iyiyim çok teşekkür ederim cano adamsın kralsın');
        return;
    }
});

client.on('interactionCreate', async (interaction) => {
    try {
        if (interaction.isChatInputCommand()) {
            const { commandName, options, guild, member } = interaction;

            if (!canUseCommand(interaction.user.id, commandName, 2000)) {
                return interaction.reply({ content: 'Çok hızlı komut kullanıyorsun, 2 saniye bekle! ⏳', ephemeral: true });
            }

            const staffOnlyCommands = ['bilet', 'duyuru', 'rehber', 'güvenlik', 'tam-yasakla', 'yasakla', 'aktiflik-duyuru', 'at', 'ban', 'kanal-kilitle', 'kanal-aç', 'honeypot-kur'];
            
            if (staffOnlyCommands.includes(commandName) && !hasStaffPermission(member)) {
                return interaction.reply({ content: '❌ Bu komutu kullanmak için yeterli yetkiye sahip değilsin (Gerekli rol: <@&' + YETKILI_ROL_ID + '> ve üstü).', ephemeral: true });
            }

            if (commandName === 'aktiflık-sorgu') {
                await interaction.deferReply();
                const count = await getRobloxPlayerCount();
                return interaction.editReply({ content: `🟢 Roblox oyunundaki anlık aktif oyuncu sayısı: **${count}**` });
            }

            if (commandName === 'profil') {
                const hedefU = options.getUser('kullanici') || interaction.user;
                const embed = new EmbedBuilder()
                    .setTitle(`👤 Profil: ${hedefU.username}`)
                    .setThumbnail(hedefU.displayAvatarURL({ dynamic: true }))
                    .addFields(
                        { name: '🛡️ Karaliste Durumu', value: '🟢 Temiz / Kayıt Yok', inline: true },
                        { name: '🎖️ Kampta Bulunma Durumu', value: '✅ Daha önce kampta bulunmuş.', inline: true }
                    )
                    .setColor(0x3498DB)
                    .setTimestamp();
                return interaction.reply({ embeds: [embed] });
            }

            if (commandName === 'sunucu-bilgi') {
                const toplamUye = guild.memberCount;
                const aktifUye = guild.members.cache.filter(m => m.presence && m.presence.status !== 'offline').size;
                const embed = new EmbedBuilder()
                    .setTitle(`📊 ${guild.name} Sunucu İstatistikleri`)
                    .addFields(
                        { name: '👥 Toplam Üye', value: `${toplamUye}`, inline: true },
                        { name: '🟢 Aktif Üye', value: `${aktifUye}`, inline: true }
                    )
                    .setColor(0x3498DB)
                    .setTimestamp();
                return interaction.reply({ embeds: [embed] });
            }

            if (commandName === 'film-öneri') {
                const hedefKanal = guild.channels.cache.get(FILM_KANAL_ID);
                if (!hedefKanal) return interaction.reply({ content: '❌ Film kanalı bulunamadı!', ephemeral: true });

                const isimOpt = options.getString('isim');
                let film = rastgeleFilmSec();
                if (isimOpt) {
                    film.baslik = isimOpt;
                    film.konu = `${isimOpt} özel olarak önerildi ve sinema listesine eklendi.`;
                }

                const embed = new EmbedBuilder()
                    .setTitle(`🎬 Sinema Kulübü: ${film.baslik}`)
                    .setDescription(`**Açıklama:**\n> ${film.konu}`)
                    .addFields(
                        { name: '🍿 Tür', value: film.tur, inline: true },
                        { name: '⭐ Puan', value: film.puan, inline: true },
                        { name: '📅 Yayınlanış Tarihi (Yıl)', value: `${film.yil}`, inline: true }
                    )
                    .setColor(0xE50914)
                    .setThumbnail(film.afis)
                    .setFooter({ text: `Öneren: ${interaction.user.tag}` })
                    .setTimestamp();

                await hedefKanal.send({ embeds: [embed] });
                return interaction.reply({ content: `✅ Film önerisi başarıyla <#${FILM_KANAL_ID}> kanalına gönderildi! 🍿`, ephemeral: true });
            }

            if (commandName === 'ağaç') {
                const embed = new EmbedBuilder()
                    .setTitle('🌲 TMA AĞAÇ')
                    .setDescription(`Your tree is **${treeData.height}ft** tall.\n\nLast watered by: ${treeData.lastWateredBy}\n\nReady to be watered!`)
                    .setImage(treeData.image)
                    .setColor(0x2ECC71)
                    .setTimestamp();

                const waterButton = new ButtonBuilder()
                    .setCustomId('water_tree')
                    .setEmoji('💧')
                    .setStyle(ButtonStyle.Primary);

                const row = new ActionRowBuilder().addComponents(waterButton);

                return interaction.reply({ embeds: [embed], components: [row] });
            }

            if (commandName === 'honeypot-kur') {
                const hedefKanal = options.getChannel('kanal');
                
                const embed = new EmbedBuilder()
                    .setTitle('🍯 GÜVENLİK UYARISI')
                    .setDescription('**BU KANALA MESAJ GÖNDERMEK YASAKTIR!**\n\nBu kanal spam botlarını ve kural ihlallerini yakalamak için kurulmuştur. Buraya atılacak herhangi bir mesaj sahibini doğrudan sunucudan atacaktır.')
                    .addFields({ name: '🍯 Atılan Kişi Sayısı (Kicks)', value: `${honeypotKicks}`, inline: true })
                    .setColor(0xE67E22)
                    .setTimestamp();

                await hedefKanal.send({ embeds: [embed] });
                return interaction.reply({ content: `✅ Türkçe Honeypot güvenlik paneli başarıyla ${hedefKanal} kanalına kuruldu!`, ephemeral: true });
            }

            if (commandName === 'bilet') {
                const embed = new EmbedBuilder()
                    .setTitle('Destek Merkezi')
                    .setDescription('Destek talebi açmak için aşağıdaki menüden kategori seçip bilet oluşturabilirsiniz.')
                    .setColor(0x2F3136);
                const btn = new ButtonBuilder().setCustomId('start_ticket_process').setLabel('Bilet Aç').setStyle(ButtonStyle.Secondary).setEmoji('🎫');
                return interaction.reply({ embeds: [embed], components: [new ActionRowBuilder().addComponents(btn)] });
            }

            if (commandName === 'duyuru') {
                const kanal = options.getChannel('kanal');
                const mesaj = options.getString('mesaj');

                const embed = new EmbedBuilder()
                    .setTitle(`📢 Duyuru — ${interaction.user.tag}`)
                    .setDescription(`**Duyuru:**\n${mesaj}`)
                    .setColor(0x3498DB)
                    .setTimestamp();

                await kanal.send({ content: '@everyone', embeds: [embed] });
                return interaction.reply({ content: `✅ Duyuru başarıyla ${kanal} kanalına gönderildi ve @everyone etiketlendi!`, ephemeral: true });
            }

            if (commandName === 'rehber') {
                const rehberMetni = 
                    "GRUPLAR\n" +
                    "▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n" +
                    "➥ [🌐 | TMA | Ana Sunucu](https://discord.gg/tmaarmy)\n" +
                    "▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n" +
                    "➥ [🎮 | TMA | Roblox Grubu](https://www.roblox.com/share/g/267214689)\n" +
                    "▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n" +
                    "➥ [| TMA | Özel Kuvvetler Komutanlığı](https://discord.gg/fqpGr44S7)\n" +
                    "▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n" +
                    "➥ [| TMA | Kara Kuvvetleri Komutanlığı](https://discord.gg/2fCyepR9f)\n" +
                    "▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n" +
                    "➥ [| TMA | Hava Kuvvetleri Komutanlığı](https://discord.gg/ztuu6ef4f)\n" +
                    "▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n" +
                    "➥ [| TMA | Jandarma Genel Komutanlığı](https://discord.gg/e9Sq8TEVn)\n" +
                    "▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n" +
                    "➥ [| TMA | Deniz Kuvvetleri Komutanlığı](https://discord.gg/fabmwbg6d)\n" +
                    "▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n" +
                    "➥ [| TMA | Askeri İnzibat](https://discord.gg/46ed2xXsG)\n" +
                    "▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n" +
                    "➥ [| TMA | Sınır Müfettişleri](https://discord.gg/AfeV3EJD5)";
                return interaction.reply({ content: rehberMetni });
            }

            if (commandName === 'rütbeler') {
                const rutbeMetni = 
                    "Ordu Personelleri\n" +
                    "[OR-1] Acemi Er\n" +
                    "[OR-1/B] Sözleşmeli Er\n" +
                    "OR-1 C Uzman er\n" +
                    "[OR-3] Uzman Onbaşı\n" +
                    "[OR-4] Çavuş\n" +
                    "[OR-5] Uzman Çavuş\n" +
                    "[OR-6] Astsubay Çavuş\n" +
                    "[OR-7] Astsubay Üstçavuş\n" +
                    "[OR-8] Astsubay Başçavuş\n" +
                    "[OR-9] Astsubay Kıdemli Başçavuş\n" +
                    "Ordu Subayları\n" +
                    "[OF-1/A] Asteğmen\n" +
                    "[OF-1/B] Teğmen\n" +
                    "[OF-1/C] Üsteğmen\n" +
                    "[OF-2] Yüzbaşı\n" +
                    "[OF-3] Binbaşı\n" +
                    "[OF-4] Yarbay\n" +
                    "[OF-5] Albay\n" +
                    "Ordu Generalleri\n" +
                    "[OF-6] Tuğgeneral\n" +
                    "[OF-7] Tümgeneral\n" +
                    "[OF-8] Korgeneral\n" +
                    "[OF-9] Orgeneral\n" +
                    "Kıdemli Ordu Generalleri\n" +
                    "Yüksek Askerî Şûra\n" +
                    "Genelkurmay Başkanı\n" +
                    "Genelkurmay\n" +
                    "Ordu Yönetimi\n" +
                    "Yönetim Kurulu\n" +
                    "Yönetim Kurulu Başkan Yard.\n" +
                    "Yönetim Kurulu Başkanı\n" +
                    "OF-10 Mareşal\n" +
                    "Co Holder\n" +
                    "Holder";
                return interaction.reply({ content: rutbeMetni });
            }

            if (commandName === 'grup') {
                return interaction.reply({ content: `🔗 Resmi Roblox Grubu: ${ROBLOX_GRUP_LINKI}` });
            }

            if (commandName === 'bilgi') {
                const embed = new EmbedBuilder()
                    .setTitle('Bot Bilgi Sistemi')
                    .setDescription(`Geliştirici / Sahip: @${GELISTIRICI_ID}\n\nBu bot sunucunuzu yönetmek, eğlenceli etkinlikler yapmak ve destek sağlamak için özel olarak geliştirilmiştir.`)
                    .setColor(0x3498DB)
                    .setTimestamp();
                return interaction.reply({ embeds: [embed] });
            }

            if (commandName === 'kurallar') {
                const kuralMetni = 
                    "***` | TMA | Türkish Modern Army`***\n\n" +
                    "***`Genel Topluma Saygı`***\n" +
                    "***Gerçek hayatta yapmayacağınız davranışları burada sergilemeyin. Kısaca herkese saygılı davranın. Bir başka kullanıcıyı kışkırtacak hareketlerde bulunmanız yasaktır.***\n\n" +
                    "***`Reklam`***\n" +
                    "***Sesli, yazılı veya özel mesajlar (DM) üzerinden herhangi bir şekilde reklam bağlantısı göndermek yasaktır. Bu gibi durumları Yetkili Personellere üyelerine bildirerek sunucu güvenliğine destek sağlamış olursunuz.***\n\n" +
                    "***`Tartışma , kavga`***\n" +
                    "***Sunucu içerisinde yaşanan bir tartışmayı özel mesajlara (DM) taşımak yasaktır. Taşınması durumunda sunucu yetkilileri duruma müdahale edebilir.***\n\n" +
                    "***`Discord Yaş Kısıtlaması`***\n" +
                    "***Discord T.O.S. kuralları gereğince 13 yaşından küçük bireylerin Discord uygulamasını kullanması yasaktır. Bundan ötürü bu sunucu dahil hiçbir sunucuda bulunamazlar.***\n\n" +
                    "***`Sunucu Dili`***\n" +
                    "***Sunucu ana dili Türkçe olduğu için sunucu içerisinde Türkçe harici bir dil konuşmak kesinlikle yasaktır. Bu durum sohbet-kanalı yazılı kanalı için geçersizdir. Yetkililerde dahildir.***\n\n" +
                    "***`Tehdit`***\n" +
                    "***Bir kullanıcıyı herhangi bir şekilde (özel mesajlar/sunucu içi) tehdit etmeniz durumunda sunucumuzdan kalıcı olarak uzaklaştırılırsınız.***\n\n" +
                    "***`Spam, Flood`***\n" +
                    "***Flood abartılmadığı sürece serbesttir. Spam, walltext ve türevleri ise kesinlikle yasaktır.***\n\n" +
                    "***`Etiket Kuralı`***\n" +
                    "***Yönetim Kurulu ve üstü kişileri etiketlemek yasaktır. Herhangi bir kullanıcıyı rahatsız etme amacı ile birçok kez etiketlemek yasaktır.***\n\n" +
                    "***`Argo, Küfür`***\n" +
                    "***Sesli ve yazılı sohbet kanalları içerisinde herhangi bir şekilde küfür veya hakaret edici bir söz kullanmak yasaktır. Küfür niteliği taşıyan sözleri kullanmak veya ima etmek yasaktır.***";
                return interaction.reply({ content: kuralMetni });
            }

            if (commandName === 'oyun-başlat') {
                return interaction.reply({ content: '🎯 **Rus Ruleti** oyunu başlatıldı! Tetiği çeken ilk şanslı kişi kim olacak? (Simülasyon aktif)' });
            }

            if (commandName === 'güvenlik') {
                return interaction.reply({ content: '🛡️ **Üst düzey güvenlik sistemi AKTİF edildi!** Anti-Nuke, Anti-Raid, küfür ve izinsiz bağlantı korumaları devreye sokuldu.' });
            }

            if (commandName === 'at') {
                const hedef = options.getMember('kullanici');
                await hedef.kick(options.getString('sebep') || 'Belirtilmedi');
                return interaction.reply({ content: `✅ Üye sunucudan atıldı (24 saat boyunca tekrar katılamaz).` });
            }

            if (commandName === 'ban') {
                const hedef = options.getMember('kullanici');
                await hedef.ban({ reason: options.getString('sebep') || 'Süreli Yasaklama' });
                return interaction.reply({ content: `🔨 Üye süreli olarak yasaklandı.` });
            }

            if (commandName === 'tam-yasakla') {
                const hedef = options.getMember('kullanici');
                await hedef.ban({ reason: options.getString('sebep') || 'Kalıcı Yasaklama' });
                return interaction.reply({ content: `⚖️ Üye tamamen ve süresiz şekilde yasaklandı!` });
            }

            if (commandName === 'kanal-kilitle') {
                await interaction.channel.permissionOverwrites.edit(interaction.guild.id, { SendMessages: false });
                return interaction.reply({ content: '🔒 Bu kanal üyelerin mesaj yazmasına kapatıldı (Kilitlendi).' });
            }

            if (commandName === 'kanal-aç') {
                await interaction.channel.permissionOverwrites.edit(interaction.guild.id, { SendMessages: null });
                return interaction.reply({ content: '🔓 Bu kanal tekrar üyelerin mesaj yazmasına açıldı.' });
            }

            if (commandName === 'aktiflik-duyuru') {
                const kanal = options.getChannel('kanal');
                const duyuruMetni = `TMA aktiflik çağrısı\nTüm TMA personellerini oyuna davet ediyorum.\n[🔗 Oyuna Katıl](${ROBLOX_OYUN_LINKI})`;
                await kanal.send({ content: `${duyuruMetni}\nÇağrıyı yapan: ${interaction.user}` });
                return interaction.reply({ content: `✅ Aktiflik çağrısı ${kanal} kanalına gönderildi!`, ephemeral: true });
            }

            if (commandName === 'grup-liste') {
                const username = options.getString('kullaniciadi');
                await interaction.deferReply();
                const result = await getRobloxUserGroups(username);
                if (!result || !result.groups || result.groups.length === 0) {
                    return interaction.editReply({ content: `❌ ${username} adına kayıtlı grup bulunamadı.` });
                }

                const groups = result.groups;
                const pageSize = 10;
                const totalPages = Math.ceil(groups.length / pageSize);
                let page = 0;

                const generateEmbed = (p) => {
                    const start = p * pageSize;
                    const slice = groups.slice(start, start + pageSize);
                    let desc = `**${result.username}** adlı kullanıcının grupları (Sayfa ${p + 1}/${totalPages}):\n\n`;
                    slice.forEach((g, idx) => {
                        desc += `**${start + idx + 1}.** ${g.group.name} | Rütbe: \`${g.role.name}\`\n`;
                    });
                    return new EmbedBuilder().setTitle('Roblox Grup Listesi').setDescription(desc).setColor(0x3498DB);
                };

                const getRows = (p) => {
                    return new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('prev_page').setLabel('◀ Önceki').setStyle(ButtonStyle.Primary).setDisabled(p === 0),
                        new ButtonBuilder().setCustomId('next_page').setLabel('Sonraki ▶').setStyle(ButtonStyle.Primary).setDisabled(p === totalPages - 1)
                    );
                };

                const response = await interaction.editReply({ embeds: [generateEmbed(page)], components: totalPages > 1 ? [getRows(page)] : [] });
                if (totalPages <= 1) return;

                const collector = response.createMessageComponentCollector({ time: 60000 });
                collector.on('collect', async i => {
                    if (i.user.id !== interaction.user.id) return i.reply({ content: 'Bu butonları sadece komutu kullanan kişi yönetebilir!', ephemeral: true });
                    if (i.customId === 'prev_page' && page > 0) page--;
                    if (i.customId === 'next_page' && page < totalPages - 1) page++;
                    await i.update({ embeds: [generateEmbed(page)], components: [getRows(page)] });
                });
                return;
            }
        }

        // --- AĞAÇ SULAMA BUTONU ---
        if (interaction.isButton() && interaction.customId === 'water_tree') {
            treeData.height += 1;
            treeData.lastWateredBy = `${interaction.user}`;

            const updatedEmbed = new EmbedBuilder()
                .setTitle('🌲 TMA AĞAÇ')
                .setDescription(`Your tree is **${treeData.height}ft** tall.\n\nLast watered by: ${treeData.lastWateredBy}\n\nReady to be watered!`)
                .setImage(treeData.image)
                .setColor(0x2ECC71)
                .setTimestamp();

            const waterButton = new ButtonBuilder()
                .setCustomId('water_tree')
                .setEmoji('💧')
                .setStyle(ButtonStyle.Primary);

            const row = new ActionRowBuilder().addComponents(waterButton);

            await interaction.update({ embeds: [updatedEmbed], components: [row] });
            return;
        }

        // --- BİLET SİSTEMİ ---
        if (interaction.isButton() && interaction.customId === 'start_ticket_process') {
            const menu = new StringSelectMenuBuilder().setCustomId('ticket_select_category').setPlaceholder('Kategori seçin...').addOptions([
                { label: 'Moderatör Bileti', value: 'moderator_bilet', emoji: '🛡️' },
                { label: 'Transfer Bileti', value: 'transfer_bilet', emoji: '🌐' },
                { label: 'Oyun Destek Bileti', value: 'oyun_bilet', emoji: '⬛' }
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
            
            let rolePermissionOverwrites = BILET_ROLLERI[cat].map(roleId => ({
                id: roleId,
                allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages]
            }));

            const channel = await interaction.guild.channels.create({
                name: `bilet-${safeChannelName(interaction.user.username)}`,
                type: ChannelType.GuildText,
                permissionOverwrites: [
                    { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                    { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
                    ...rolePermissionOverwrites
                ]
            });
            userSelectedCategory.delete(key);

            const closeBtn = new ButtonBuilder().setCustomId('close_ticket').setLabel('Bileti Kapat').setStyle(ButtonStyle.Danger).setEmoji('🔒');
            const roleMentions = BILET_ROLLERI[cat].map(id => `<@&${id}>`).join(' ');
            
            await channel.send({ content: `Destek talebi başlatıldı. İlgili yetkililer: ${roleMentions}`, components: [new ActionRowBuilder().addComponents(closeBtn)] });
            return interaction.editReply({ content: `Bilet açıldı: ${channel}` });
        }

        if (interaction.isButton() && interaction.customId === 'close_ticket') {
            await interaction.reply({ content: 'Bilet kapatılıyor...' });
            setTimeout(() => interaction.channel.delete().catch(() => {}), 3000);
        }
    } catch (e) { console.error(e); }
});

client.login(process.env.DISCORD_TOKEN);
