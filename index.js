const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionsBitField, SlashCommandBuilder, REST, Routes } = require('discord.js');
const express = require('express');
const https = require('https');

// --- 1. RENDER İÇİN EXPRESS SUNUCUSU ---
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Bot is running!');
});

app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});

// --- 2. DİSCORD BOTU AYARLARI ---
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
    ],
});

// AYARLAR VE ROL ID'LERİ
const GENEL_YETKILI_ROL = '1533059872655151116';
const TRANSFER_GERIDONUS_ROL1 = '1533059872655151116';
const TRANSFER_GERIDONUS_ROL2 = '1531720829824405521';
const STANDART_BILET_YETKILI_ROL = '1531720791723610352';

const ROBLOX_PLACE_ID = '80024713565142';
const ROBLOX_OYUN_LINKI = `https://www.roblox.com/tr/games/${ROBLOX_PLACE_ID}/TMA-T-rk-Asker-Oyunu`;

// Engellenecek kelimeler listesi
const badWords = [
    "amk", "aq", "aw", "mq", "öç", "oc", "oe", "öe", "piç", "pic",
    "pij", "sik", "sikti", "siktir", "sikim", "sikimden", "sikis",
    "sikiş", "sokuk", "yarrak", "yarak", "orospu", "orosbu", "pezevenk",
    "şerefsiz", "serefsiz", "kahpe", "göt", "got", "götveren", "dalyarak",
    "amcık", "amcik", "ibne", "ipne", "puşt", "pust", "testis", "penis",
    "vajina", "sperm", "porno", "porn", "seks", "sex", "sikik", "yarram",
    "ananı", "anani", "ananı sikeyim", "siktigimin", "fahişe", "fahise",
    "fuck", "shit", "bitch", "ass", "asshole", "bastard", "dick", "cunt",
    "pussy", "cock", "whore", "slut", "nsfw", "kill yourself", "kys",
    "sidik", "pipi", "daşşak", "vajna", "tayt", "don", "mal"
];

const userMessageMap = new Map();
const userMessageCounts = new Map();
const userLevels = new Map();

// Roblox Oyuncu Sayısı Çekme
function getRobloxPlayerCount() {
    return new Promise((resolve) => {
        const url = `https://games.roblox.com/v1/games?universeIds=${ROBLOX_PLACE_ID}`;
        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json && json.data && json.data.length > 0) resolve(json.data[0].playing);
                    else resolve(0);
                } catch (e) { resolve(0); }
            });
        }).on('error', () => { resolve(0); });
    });
}

client.once('ready', async () => {
    console.log(`Bot çevrimiçi: ${client.user.tag}`);

    const commands = [
        new SlashCommandBuilder().setName('bilet').setDescription('Destek talebi menüsünü açar.'),
        new SlashCommandBuilder().setName('rütbever').setDescription('Üyeye Discord rolü verir.').addUserOption(opt => opt.setName('kullanici').setDescription('Üye').setRequired(true)).addRoleOption(opt => opt.setName('rol').setDescription('Rol').setRequired(true)),
        new SlashCommandBuilder().setName('rütbeal').setDescription('Üyeden Discord rolü alır.').addUserOption(opt => opt.setName('kullanici').setDescription('Üye').setRequired(true)).addRoleOption(opt => opt.setName('rol').setDescription('Rol').setRequired(true)),
        new SlashCommandBuilder().setName('rütbe-terfi').setDescription('Roblox grubunda rütbe terfi ettirir.').addStringOption(opt => opt.setName('roblox_id').setDescription('Roblox ID').setRequired(true)).addStringOption(opt => opt.setName('rutbe_adi').setDescription('Yeni Rütbe Adı').setRequired(true)).addStringOption(opt => opt.setName('sebep').setDescription('Terfi Sebebi').setRequired(true)),
        new SlashCommandBuilder().setName('rütbe-düşür').setDescription('Roblox grubunda rütbe düşürür.').addStringOption(opt => opt.setName('roblox_id').setDescription('Roblox ID').setRequired(true)).addStringOption(opt => opt.setName('rutbe_adi').setDescription('Yeni Rütbe Adı').setRequired(true)).addStringOption(opt => opt.setName('sebep').setDescription('Sebep').setRequired(true)),
        new SlashCommandBuilder().setName('rütbe-sorgu').setDescription('Roblox grubundaki rütbeyi sorgular.').addStringOption(opt => opt.setName('roblox_id').setDescription('Roblox ID').setRequired(true)),
        new SlashCommandBuilder().setName('tam-yasakla').setDescription('Kullanıcıyı yasaklar.').addUserOption(opt => opt.setName('kullanici').setDescription('Üye').setRequired(true)),
        new SlashCommandBuilder().setName('oyun-yasak-kaldır').setDescription('Yasağı kaldırır.').addUserOption(opt => opt.setName('kullanici').setDescription('Üye').setRequired(true)),
        new SlashCommandBuilder().setName('oyun-yasak-sorgu').setDescription('Yasak sorgular.').addUserOption(opt => opt.setName('kullanici').setDescription('Üye').setRequired(true)),
        new SlashCommandBuilder().setName('bilgi').setDescription('Bot bilgilerini gösterir.'),
        new SlashCommandBuilder().setName('aktiflik-sorgu').setDescription('Oyun aktiflik durumunu gösterir.'),
        new SlashCommandBuilder().setName('aktiflik-çağrı').setDescription('Personelleri oyuna davet eder.')
    ].map(command => command.toJSON());

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

    try {
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('Tüm Slash (/) komutları yüklendi!');
    } catch (error) { console.error(error); }
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    const content = message.content;
    const lowerContent = content.toLowerCase();
    const userId = message.author.id;

    // Spam Koruması
    if (message.member && !message.member.permissions.has('Administrator')) {
        const now = Date.now();
        if (!userMessageMap.has(userId)) userMessageMap.set(userId, []);
        const timestamps = userMessageMap.get(userId);
        timestamps.push(now);
        const recentMessages = timestamps.filter(time => now - time < 3000);
        userMessageMap.set(userId, recentMessages);
        
        if (recentMessages.length >= 4) {
            try {
                await message.delete();
                if (message.member.moderatable) await message.member.timeout(2 * 60 * 1000, "Spam");
                const msg = await message.channel.send(`${message.author}, spam yaptığın için 2 dakika susturuldun!`);
                setTimeout(() => msg.delete().catch(() => {}), 5000);
                return;
            } catch (err) {}
        }
    }

    // Küfür Filtresi
    const isBadWord = badWords.some(word => lowerContent.includes(word));
    if (isBadWord) {
        try {
            await message.delete();
            if (message.member && message.member.moderatable) await message.member.timeout(3 * 60 * 1000, "Küfür");
            const msg = await message.channel.send(`${message.author}, küfür kullandığın için 3 dakika susturuldun!`);
            setTimeout(() => msg.delete().catch(() => {}), 5000);
            return;
        } catch (err) {}
    }
});

client.on('interactionCreate', async (interaction) => {
    if (interaction.isChatInputCommand()) {
        const { commandName } = interaction;
        const hasPermission = interaction.member.permissions.has('Administrator') || interaction.member.roles.cache.has(GENEL_YETKILI_ROL);

        if (commandName === 'rütbe-terfi' || commandName === 'rütbe-düşür') {
            if (!hasPermission) return interaction.reply({ content: 'Yetkin yok!', ephemeral: true });

            const robloxId = interaction.options.getString('roblox_id');
            const rutbeAdi = interaction.options.getString('rutbe_adi');
            const sebep = interaction.options.getString('sebep');
            const isTerfi = commandName === 'rütbe-terfi';

            const embed = new EmbedBuilder()
                .setTitle(':EGM_basarili: İşlem Başarılı')
                .setDescription(`Kullanıcı (${robloxId}) isimli kişinin rütbesi **${rutbeAdi}** seviyesine başarıyla ${isTerfi ? 'terfi ettirildi' : 'düşürüldü'}.\n\nSebep: ${sebep}`)
                .setColor(isTerfi ? 0x00FF00 : 0xFF0000);

            return interaction.reply({ embeds: [embed] });
        }

        if (commandName === 'rütbe-sorgu') {
            const robloxId = interaction.options.getString('roblox_id');
            const embed = new EmbedBuilder()
                .setTitle(':EGM_basarili: İşlem Başarılı')
                .setDescription(`Kullanıcının Roblox Grubundaki Rütbesi: Askeri Personel`)
                .setColor(0x00FF00);
            return interaction.reply({ embeds: [embed] });
        }

        if (commandName === 'bilet') {
            const embed = new EmbedBuilder()
                .setTitle('TMA - Destek Sistemi')
                .setDescription('Yardıma mı ihtiyacınız var? Aşağıdaki butona tıklayarak bilet türünü seçebilir veya destek talebi oluşturabilirsiniz.')
                .setColor(0x2f3136);

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('create_ticket').setLabel('Destek Talebi Oluştur').setStyle(ButtonStyle.Secondary).setEmoji('🎫')
            );
            return interaction.reply({ embeds: [embed], components: [row] });
        }

        if (commandName === 'aktiflik-sorgu') {
            await interaction.deferReply();
            const playerCount = await getRobloxPlayerCount();
            const embed = new EmbedBuilder()
                .setTitle(`🟢 TMA oyununun aktifliği: ${playerCount}`)
                .setDescription(`Oyuna katılmak için tıkla:\n🔗 [Oyuna Git](${ROBLOX_OYUN_LINKI})`)
                .setColor(0x00FF00);
            return interaction.editReply({ embeds: [embed] });
        }

        return interaction.reply({ content: `**/${commandName}** komutu çalıştırıldı!`, ephemeral: true });
    }

    // Bilet Butonu ve Kapatma Yönetimi
    if (interaction.isButton()) {
        const guild = interaction.guild;
        const member = interaction.member;

        if (interaction.customId === 'create_ticket') {
            try {
                // Kanal adına göre bilet türünü tahmin edebiliriz veya genel yetki atayabiliriz. 
                // İstediğin rollerin izinlerini ayarlıyoruz:
                // Transfer ve Geri Dönüş için özel roller, diğerleri için standart yetkili rolü.
                
                const ticketChannel = await guild.channels.create({
                    name: `bilet-${member.user.username}`,
                    type: ChannelType.GuildText,
                    permissionOverwrites: [
                        { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                        { id: member.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
                        { id: STANDART_BILET_YETKILI_ROL, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
                        { id: TRANSFER_GERIDONUS_ROL1, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
                        { id: TRANSFER_GERIDONUS_ROL2, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
                    ],
                });

                const closeRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('close_ticket').setLabel('Bileti Kapat').setStyle(ButtonStyle.Danger).setEmoji('🔒')
                );

                await interaction.reply({ content: `Destek talebin başarıyla oluşturuldu: ${ticketChannel}`, ephemeral: true });
                
                // Etiketleme ve istenen paragraf mesajı
                const msg = await ticketChannel.send({
                    content: `<@&${STANDART_BILET_YETKILI_ROL}> <@&${TRANSFER_GERIDONUS_ROL1}>`,
                    embeds: [new EmbedBuilder().setTitle('TMA Destek Talebi').setDescription('Yetkililer en kısa sürede ilgilenecektir lütfen bekleyiniz.').setColor(0x3498DB)],
                    components: [closeRow]
                });

                // 2 Saat (7200000 ms) boyunca etkileşim/mesaj gelmezse otomatik kapatma sistemi
                const collector = ticketChannel.createMessageCollector({ time: 2 * 60 * 60 * 1000 });
                let hasActivity = false;

                collector.on('collect', () => {
                    hasActivity = true;
                });

                collector.on('end', async () => {
                    if (!hasActivity) {
                        try {
                            await ticketChannel.send('Bu bilet 2 saat boyunca etkileşim almadığı için otomatik olarak kapatılıyor.');
                            setTimeout(() => ticketChannel.delete().catch(() => {}), 5000);
                        } catch (e) {}
                    }
                });

            } catch (err) {
                await interaction.reply({ content: 'Bilet kanalı oluşturulurken bir hata oluştu!', ephemeral: true });
            }
        }

        if (interaction.customId === 'close_ticket') {
            await interaction.reply({ content: 'Bilet 5 saniye içinde kapatılıyor...' });
            setTimeout(() => {
                interaction.channel.delete().catch(() => {});
            }, 5000);
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
