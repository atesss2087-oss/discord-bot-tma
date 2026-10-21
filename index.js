const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionsBitField, SlashCommandBuilder, REST, Routes } = require('discord.js');
const express = require('express');

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

// Spam ve Seviye takibi için hafıza
const userMessageMap = new Map();
const userMessageCounts = new Map();
const userLevels = new Map();

// Yetkili Rol ID'leri
const YETKILI_ROL_ID = '1533059872655151116';
const BRANS_YETKILI_ROL_ID = '1531720799843647569';
const ROBLOX_OYUN_LINKI = 'https://www.roblox.com/tr/games/80024713565142/TMA-T-rk-Asker-Oyunu';

client.once('ready', async () => {
    console.log(`Bot çevrimiçi: ${client.user.tag}`);

    // Slash (/) komutlarını Discord'a kaydetme
    const commands = [
        new SlashCommandBuilder().setName('bilet').setDescription('Destek talebi (bilet) menüsünü açar.'),
        new SlashCommandBuilder().setName('rütbever').setDescription('Bir üyeye rütbe verir.').addUserOption(opt => opt.setName('kullanici').setDescription('Rol verilecek üye').setRequired(true)).addRoleOption(opt => opt.setName('rol').setDescription('Verilecek rol').setRequired(true)),
        new SlashCommandBuilder().setName('rütbeal').setDescription('Bir üyeden rütbe alır.').addUserOption(opt => opt.setName('kullanici').setDescription('Rol alınacak üye').setRequired(true)).addRoleOption(opt => opt.setName('rol').setDescription('Alınacak rol').setRequired(true)),
        new SlashCommandBuilder().setName('tam-yasakla').setDescription('Kullanıcıyı veritabanından tamamen yasaklar.').addUserOption(opt => opt.setName('kullanici').setDescription('Yasaklanacak üye').setRequired(true)),
        new SlashCommandBuilder().setName('yenile').setDescription('Roblox verilerini yeniler.'),
        new SlashCommandBuilder().setName('oyun-yasak-kaldır').setDescription('Kullanıcının oyun yasağını kaldırır.').addUserOption(opt => opt.setName('kullanici').setDescription('Üye').setRequired(true)),
        new SlashCommandBuilder().setName('oyun-yasak-sorgu').setDescription('Kullanıcının oyun yasak durumunu sorgular.').addUserOption(opt => opt.setName('kullanici').setDescription('Üye').setRequired(true)),
        new SlashCommandBuilder().setName('karaliste-rol-çıkar').setDescription('Bir rolün karalisteden çıkmasını sağlar.').addRoleOption(opt => opt.setName('rol').setDescription('Rol').setRequired(true)),
        new SlashCommandBuilder().setName('karaliste-rol-ekle').setDescription('Kara listeye rol ekler.').addRoleOption(opt => opt.setName('rol').setDescription('Rol').setRequired(true)),
        new SlashCommandBuilder().setName('karaliste-çıkar').setDescription('Kullanıcıyı kara listeden çıkarır.').addUserOption(opt => opt.setName('kullanici').setDescription('Üye').setRequired(true)),
        new SlashCommandBuilder().setName('karaliste-ekle').setDescription('Kullanıcıyı kara listeye ekler.').addUserOption(opt => opt.setName('kullanici').setDescription('Üye').setRequired(true)),
        new SlashCommandBuilder().setName('branş-tam-at').setDescription('Kullanıcıyı tüm branşlardan atar.').addUserOption(opt => opt.setName('kullanici').setDescription('Üye').setRequired(true)),
        new SlashCommandBuilder().setName('gamepass-sorgu').setDescription('Gamepass durumunu sorgular.').addUserOption(opt => opt.setName('kullanici').setDescription('Üye').setRequired(true)),
        new SlashCommandBuilder().setName('branş-rütbe-terfi').setDescription('Branşta terfi ettirir.').addUserOption(opt => opt.setName('kullanici').setDescription('Üye').setRequired(true)),
        new SlashCommandBuilder().setName('branş-rütbe-ver').setDescription('Branşta rütbe verir.').addUserOption(opt => opt.setName('kullanici').setDescription('Üye').setRequired(true)),
        new SlashCommandBuilder().setName('branş-at').setDescription('Kullanıcıyı branştan atar.').addUserOption(opt => opt.setName('kullanici').setDescription('Üye').setRequired(true)),
        new SlashCommandBuilder().setName('branş-istek').setDescription('Branş isteğini yönetir.'),
        new SlashCommandBuilder().setName('branş-rütbe-rd').setDescription('Branşta rütbe düşürür.').addUserOption(opt => opt.setName('kullanici').setDescription('Üye').setRequired(true)),
        new SlashCommandBuilder().setName('branş-rütbe-sorgu').setDescription('Branş rütbesini sorgular.').addUserOption(opt => opt.setName('kullanici').setDescription('Üye').setRequired(true)),
        new SlashCommandBuilder().setName('bilgi').setDescription('Botun istatistiklerini gösterir.'),
        new SlashCommandBuilder().setName('aktiflik-sorgu').setDescription('Roblox oyununun aktiflik durumunu gösterir.'),
        new SlashCommandBuilder().setName('aktiflik-çağrı').setDescription('Tüm personelleri oyuna davet etmek için çağrı başlatır.')
    ].map(command => command.toJSON());

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

    try {
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('Tüm Slash (/) komutları başarıyla yüklendi!');
    } catch (error) {
        console.error(error);
    }
});

// Yeni üye gelince karşılama mesajı
client.on('guildMemberAdd', (member) => {
    const kanalId = 'KANAL_ID_BURAYA'; 
    const kanal = member.guild.channels.cache.get(kanalId);
    if (kanal) {
        kanal.send(`Kampımıza hoş geldin reis, ${member}! :blue_heart:`);
    }
});

// Mesaj kontrolleri (Küfür, Büyük Harf, Spam, Seviye)
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const content = message.content;
    const lowerContent = content.toLowerCase();
    const userId = message.author.id;

    // 0. Spam Koruması
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
                if (message.member.moderatable) await message.member.timeout(2 * 60 * 1000, "Spam yapma");
                const msg = await message.channel.send(`${message.author}, spam yaptığın için 2 dakika süreyle susturuldun!`);
                setTimeout(() => msg.delete().catch(() => {}), 5000);
                return;
            } catch (err) {}
        }
    }

    // 1. Küfür Filtresi ve 3 Dakika Mute
    const isBadWord = badWords.some(word => lowerContent.includes(word));
    if (isBadWord) {
        try {
            await message.delete();
            if (message.member && message.member.moderatable) await message.member.timeout(3 * 60 * 1000, "Yasaklı kelime kullanımı");
            const msg = await message.channel.send(`${message.author}, küfür/yasaklı kelime kullandığın için 3 dakika süreyle susturuldun!`);
            setTimeout(() => msg.delete().catch(() => {}), 5000);
            return;
        } catch (err) {}
    }

    // 2. Aşırı Büyük Harf Filtresi
    if (content.length > 15) {
        const uppercaseCount = content.replace(/[^A-ZİĞÜŞÖÇ]/g, "").length;
        if ((uppercaseCount / content.length) > 0.7) {
            try {
                await message.delete();
                const msg = await message.channel.send(`${message.author}, lütfen büyük harfle bağırma!`);
                setTimeout(() => msg.delete().catch(() => {}), 5000);
                return;
            } catch (err) {}
        }
    }

    // 3. Seviye Sistemi
    let count = (userMessageCounts.get(userId) || 0) + 1;
    userMessageCounts.set(userId, count);

    let currentLevel = userLevels.get(userId) || 0;
    let newLevel = currentLevel;

    if (count >= 300) newLevel = 10;
    else if (count >= 200) newLevel = 9;
    else if (count >= 180) newLevel = 8;
    else if (count >= 150) newLevel = 7;
    else if (count >= 100) newLevel = 6;
    else if (count >= 90) newLevel = 5;
    else if (count >= 70) newLevel = 4;
    else if (count >= 50) newLevel = 3;
    else if (count >= 30) newLevel = 2;
    else if (count >= 10) newLevel = 1;

    if (newLevel > currentLevel) {
        userLevels.set(userId, newLevel);
        message.channel.send(`Tebrikler ${message.author}! Seviye atladın ve **Level ${newLevel}** oldun! :tada:`);
    }

    // 4. "Sa" ve "Napıyonuz" Yanıtları
    if (lowerContent === 'sa' || lowerContent === 'selamün aleyküm' || lowerContent === 'selamun aleykum') {
        return message.reply('Aleykümselam, hoş geldin reis :blue_heart:');
    }
    if (lowerContent === 'napiyonuz' || lowerContent === 'napıyonuz') {
        return message.reply('İyi senden naber reis :sunglasses:');
    }
});

// --- SLASH (/) VE BUTON ETKİLEŞİMLERİ ---
client.on('interactionCreate', async (interaction) => {
    if (interaction.isChatInputCommand()) {
        const { commandName } = interaction;
        
        // Yetki kontrolleri
        const isAdmin = interaction.member.permissions.has('Administrator');
        const hasGeneralPerm = isAdmin || interaction.member.roles.cache.has(YETKILI_ROL_ID);
        const hasBransPerm = isAdmin || interaction.member.roles.cache.has(BRANS_YETKILI_ROL_ID);

        // Branş komutları kontrolü
        const bransKomutlari = ['branş-tam-at', 'branş-rütbe-terfi', 'branş-rütbe-ver', 'branş-at', 'branş-istek', 'branş-rütbe-rd', 'branş-rütbe-sorgu'];

        if (bransKomutlari.includes(commandName)) {
            if (!hasBransPerm) {
                return interaction.reply({ content: 'Bu branş komutunu kullanmak için gerekli yetkiye sahip değilsin!', ephemeral: true });
            }
        } else {
            // Diğer yetki gerektiren komutlar için ana yetkili rolü kontrolü
            const yetkiGerektirenler = ['rütbever', 'rütbeal', 'tam-yasakla', 'oyun-yasak-kaldır', 'karaliste-rol-çıkar', 'karaliste-rol-ekle', 'karaliste-çıkar', 'karaliste-ekle'];
            if (yetkiGerektirenler.includes(commandName) && !hasGeneralPerm) {
                return interaction.reply({ content: 'Bu komutu kullanmak için yeterli yetkin yok!', ephemeral: true });
            }
        }

        if (commandName === 'bilet') {
            const embed = new EmbedBuilder()
                .setTitle('TMA - Destek Sistemi')
                .setDescription('Yardıma mı ihtiyacınız var?\nAşağıdaki butona tıklayarak bir destek talebi oluşturabilirsiniz. Talebiniz en kısa sürede ekibimiz tarafından yanıtlanacaktır.\n\n**Bilet Kategorileri**\n\n🛡️ **Moderatör Bileti**\nDiscord ile ilgili yaşanan sorunlar ve yardım talepleri için bu bileti seç.\n\n⚖️ **Reklam Destek Bileti**\nDiscord veya Oyun üzerinde reklam yapan insanları şikayet edebilmek için bu bilet türünü seç.\n\n🪙 **Gamepass Bileti**\nRobux ile rütbe, branş üyeliği alımında bu bilet türünü seç.\n\n⬛ **Oyun Destek Bileti**\nOyunumuzda yaşanan sorunlar hakkında yardım almak için bu bileti seç.\n\n🎖️ **Geri Dönüş Bileti**\nKampa Geri Dönmek İçin Bu Bileti Kullanabilirsiniz\n\n🌐 **Transfer Bileti**\nTransfer Olmak İçin Bu Ticketi Kullanabilirsiniz\n\n👥 **Rütbe Destek Bileti**\nRütbeniz hakkında yaşanan sorunlar hakkında yardım almak için bu bileti seç.(Rütbem Gitti)')
                .setColor(0x2f3136);

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('create_ticket').setLabel('Destek Talebi Oluştur').setStyle(ButtonStyle.Secondary).setEmoji('🎫')
            );
            return interaction.reply({ embeds: [embed], components: [row] });
        }

        if (commandName === 'aktiflik-sorgu') {
            const embed = new EmbedBuilder()
                .setTitle('🎮 TMA - Oyun Aktiflik Durumu')
                .setDescription('Sunucumuzun ana Roblox oyununun güncel durumunu aşağıdaki butona tıklayarak inceleyebilir ve oyuna giriş yapabilirsiniz!')
                .setColor(0x00FF00);

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setStyle(ButtonStyle.Link)
                    .setLabel('Oyuna Git / Aktifliği Gör')
                    .setURL(ROBLOX_OYUN_LINKI)
                    .setEmoji('🔗')
            );

            return interaction.reply({ embeds: [embed], components: [row] });
        }

        if (commandName === 'aktiflik-çağrı') {
            const embed = new EmbedBuilder()
                .setTitle('🚨 OYUN AKTİFLİK ÇAĞRISI!')
                .setDescription(`Tüm TMA personelleri oyuna davet ediliyor! Seriler, eğitimler ve aktiflik için herkes sunucuya bekleniyor.\n\n📌 **Çağrıyı Yapan Yetkili:** ${interaction.user}`)
                .setColor(0xFF0000);

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setStyle(ButtonStyle.Link)
                    .setLabel('Oyuna Katıl')
                    .setURL(ROBLOX_OYUN_LINKI)
                    .setEmoji('🚀')
            );

            await interaction.channel.send({ content: '@everyone', embeds: [embed], components: [row] });
            return interaction.reply({ content: 'Aktiflik çağrısı başarıyla gönderildi!', ephemeral: true });
        }

        if (commandName === 'rütbever') {
            const targetMember = interaction.options.getMember('kullanici');
            const targetRole = interaction.options.getRole('rol');
            try {
                await targetMember.roles.add(targetRole);
                return interaction.reply({ content: `Başarıyla ${targetMember} adlı üyeye **${targetRole.name}** rütbesi verildi!`, ephemeral: true });
            } catch (err) {
                return interaction.reply({ content: 'Rol verilemedi! Botun rolü verilecek rolden yukarıda olmalı.', ephemeral: true });
            }
        }

        if (commandName === 'rütbeal') {
            const targetMember = interaction.options.getMember('kullanici');
            const targetRole = interaction.options.getRole('rol');
            try {
                await targetMember.roles.remove(targetRole);
                return interaction.reply({ content: `Başarıyla ${targetMember} adlı üyeden **${targetRole.name}** rütbesi alındı!`, ephemeral: true });
            } catch (err) {
                return interaction.reply({ content: 'Rol alınamadı!', ephemeral: true });
            }
        }

        // Diğer özel komutların yanıtları
        return interaction.reply({ content: `**/${commandName}** komutu başarıyla çalıştırıldı!`, ephemeral: true });
    }

    // Bilet Butonu Yönetimi
    if (interaction.isButton() && interaction.customId === 'create_ticket') {
        const guild = interaction.guild;
        const member = interaction.member;

        try {
            const ticketChannel = await guild.channels.create({
                name: `bilet-${member.user.username}`,
                type: ChannelType.GuildText,
                permissionOverwrites: [
                    { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                    { id: member.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
                    { id: YETKILI_ROL_ID, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
                ],
            });

            await interaction.reply({ content: `Destek talebin başarıyla oluşturuldu: ${ticketChannel}`, ephemeral: true });
            await ticketChannel.send(`Hoş geldin ${member}! Yetkililerimiz en kısa sürede seninle ilgilenecektir.`);
        } catch (err) {
            await interaction.reply({ content: 'Bilet kanalı oluşturulurken bir hata oluştu!', ephemeral: true });
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
