const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionsBitField, SlashCommandBuilder, StringSelectMenuBuilder, REST, Routes } = require('discord.js');
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

// YETKİLİ VE BİLET ROL ID'LERİ
const YETKILI_ROL_ID = '1533059872655151116';
const ANA_YETKILI_ROL_1 = '1558732739405025300';
const ANA_YETKILI_ROL_2 = '1532129489495130233';

const BILET_ROLLERI = {
    'moderator_bilet': '1533064202950807712',
    'reklam_bilet': '1531720771099951255',
    'oyun_bilet': '1531720784735637534',
    'gamepass_bilet': '1531720771691479133',
    'geridonus_bilet': '1531720829824405521',
    'transfer_bilet': '1531720829824405521',
    'rutbe_bilet': '1533064202950807712'
};

const userSelectedCategory = new Map();

const ROBLOX_PLACE_ID = '80024713565142';
const ROBLOX_OYUN_LINKI = `https://www.roblox.com/tr/games/${ROBLOX_PLACE_ID}/TMA-T-rk-Asker-Oyunu`;
const TMA_LOGO_URL = 'https://i.ibb.co/68v8z92/1000032255.jpg';

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
        }).on('error', () => {
            resolve(0);
        });
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
        const hasPermission = interaction.member.permissions.has('Administrator') || interaction.member.roles.cache.has(YETKILI_ROL_ID);

        const korumaliKomutlar = ['rütbever', 'rütbeal', 'rütbe-terfi', 'rütbe-düşür', 'tam-yasakla', 'oyun-yasak-kaldır'];
        if (korumaliKomutlar.includes(commandName) && !hasPermission) {
            return interaction.reply({ content: 'Bu komutu kullanmak için gerekli yetkiye sahip değilsin!', ephemeral: true });
        }

        if (commandName === 'bilet') {
            const embed = new EmbedBuilder()
                .setTitle('TMA | Destek Sistemi')
                .setDescription('Yardıma mı ihtiyacınız var?\nAşağıdaki **Destek Talebi Oluştur** butonuna tıklayarak bilet menüsüne ulaşabilirsiniz.\n\n⏱️ **Mesai Saatleri:**\n• **Hafta İçi:** 05.00 - 12.00\n• **Hafta Sonu:** 09.00 - 12.00')
                .setImage(TMA_LOGO_URL)
                .setColor(0x2f3136);

            const button = new ButtonBuilder()
                .setCustomId('start_ticket_process')
                .setLabel('Destek Talebi Oluştur')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('🎫');

            const row = new ActionRowBuilder().addComponents(button);
            return interaction.reply({ embeds: [embed], components: [row] });
        }

        if (commandName === 'rütbever') {
            const targetMember = interaction.options.getMember('kullanici');
            const targetRole = interaction.options.getRole('rol');
            try {
                await targetMember.roles.add(targetRole);
                return interaction.reply({ content: `Başarıyla ${targetMember} adlı üyeye **${targetRole.name}** rütbesi verildi!`, ephemeral: true });
            } catch (err) {
                return interaction.reply({ content: 'Rol verilemedi!', ephemeral: true });
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

        const row1 = new ActionRowBuilder().addComponents(selectMenu);
        const row2 = new ActionRowBuilder().addComponents(openButton);

        return interaction.reply({ content: 'Lütfen açmak istediğiniz bilet kategorisini seçip aşağıdaki **Bilet Aç** tuşuna basın:', components: [row1, row2], ephemeral: true });
    }

    if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_select_category') {
        userSelectedCategory.set(interaction.user.id, interaction.values[0]);
        return interaction.update({ content: `Seçilen kategori: **${interaction.values[0]}**. Şimdi aşağıdaki **Bilet Aç** tuşuna basabilirsin.`, components: interaction.message.components });
    }

    if (interaction.isButton() && interaction.customId === 'open_selected_ticket') {
        const guild = interaction.guild;
        const member = interaction.member;
        const selectedCategory = userSelectedCategory.get(member.id);

        if (!selectedCategory) {
            return interaction.reply({ content: 'Lütfen önce menüden bir kategori seçin!', ephemeral: true });
        }

        const targetRoleID = BILET_ROLLERI[selectedCategory];

        try {
            const ticketChannel = await guild.channels.create({
                name: `bilet-${member.user.username}`,
                type: ChannelType.GuildText,
                permissionOverwrites: [
                    { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                    { id: member.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
                    { id: targetRoleID, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
                    { id: ANA_YETKILI_ROL_1, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
                    { id: ANA_YETKILI_ROL_2, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
                ],
            });

            const closeRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('close_ticket').setLabel('Bileti Kapat').setStyle(ButtonStyle.Danger).setEmoji('🔒')
            );

            await interaction.reply({ content: `Destek talebin başarıyla oluşturuldu: ${ticketChannel}`, ephemeral: true });
            
            await ticketChannel.send({
                embeds: [new EmbedBuilder().setTitle('TMA Destek Talebi').setDescription('Yetkililer en kısa sürede ilgilenecektir lütfen bekleyiniz.').setColor(0x3498DB)],
                components: [closeRow]
            });

            const collector = ticketChannel.createMessageCollector({ time: 2 * 60 * 60 * 1000 });
            let hasActivity = false;
            collector.on('collect', () => { hasActivity = true; });
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

    if (interaction.isButton() && interaction.customId === 'close_ticket') {
        await interaction.reply({ content: 'Bilet 5 saniye içinde kapatılıyor...' });
        setTimeout(() => {
            interaction.channel.delete().catch(() => {});
        }, 5000);
    }
});

client.login(process.env.DISCORD_TOKEN);
const { EmbedBuilder } = require('discord.js');
const badWordsSchema = require('./Modeller/badWordsSchema');
const FuzzySet = require('fuzzyset');

const userMessageMap = new Map();

client.on('messageCreate', async (message) => {
    if (!message.guild || message.author.bot) return;

    const userId = message.author.id;
    const content = message.content;
    const lowerContent = content.toLowerCase();

    // 1. Spam ve ard arda mesaj koruması
    if (message.member && !message.member.permissions.has('Administrator')) {
        const now = Date.now();
        if (!userMessageMap.has(userId)) userMessageMap.set(userId, []);
        const timestamps = userMessageMap.get(userId);
        timestamps.push(now);
        const recentMessages = timestamps.filter(time => now - time < 3000);
        userMessageMap.set(userId, recentMessages);
        
        if (recentMessages.length >= 3) {
            try {
                await message.delete();
                if (message.member.moderatable) {
                    await message.member.timeout(3 * 60 * 1000, "Spam koruması");
                }
                return;
            } catch (err) {}
        }
    }

    // 2. Küfür ve uygunsuz kelime filtresi
    const settings = await badWordsSchema.findOne({ Guild: message.guild.id });
    if (!settings || !settings.ProtectionEnabled) return;

    const defaultBadWords = [
        "amk", "aq", "aw", "mq", "hdabla", "sik", "sikti", "siktir", "sikim", "sokuk", 
        "yarrak", "yarak", "orospu", "orosbu", "pezevenk", "şerefsiz", "kahpe", 
        "göt", "got", "ibne", "ipne", "puşt", "pust", "mal", "porno", "porn", 
        "sex", "seks", "31", "sidik", "meme", "göğüs", "ananı", "anani"
    ];

    const dbWords = settings.SwearWords || [];
    const allBadWords = [...new Set([...defaultBadWords, ...dbWords])];
    const swearWordsSet = FuzzySet(allBadWords);
    const threshold = 0.65;

    const words = lowerContent.split(/\s+/);
    let küfürBulundu = false;

    for (const word of words) {
        const result = swearWordsSet.get(word);
        if (result && result[0][0] >= threshold) {
            küfürBulundu = true;
            break;
        }
    }

    if (!küfürBulundu) {
        const result2 = swearWordsSet.get(lowerContent);
        if (result2 && result2[0][0] >= threshold) {
            küfürBulundu = true;
        }
    }

    if (küfürBulundu) {
        try {
            if (message.deletable) await message.delete();

            if (message.member && message.member.moderatable) {
                await message.member.timeout(3 * 60 * 1000, "Küfür koruması");
            }

            // Uyarı mesajı sadece o kişiye özel (ephemeral tarzı silinebilir geçici uyarı)
            const warningMsg = await message.channel.send(`${message.author}, küfür veya uygunsuz kelime kullandığın için mesajın silindi ve 3 dakika susturuldun! 🛑`);
            setTimeout(() => warningMsg.delete().catch(() => {}), 4000);

            const logChannelId = settings.LogChannel;
            const logChannel = message.guild.channels.cache.get(logChannelId);
            if (logChannel) {
                const embed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle('⚠️ Küfür Tespit Edildi!')
                    .setDescription(`**Üye:** ${message.author.tag} (${message.author})\n**Kanal:** ${message.channel}\n**Mesaj:** \`${message.content}\``)
                    .setTimestamp();
                await logChannel.send({ embeds: [embed] });
            }
        } catch (err) {
            console.error('Hata:', err);
        }
    }
});
