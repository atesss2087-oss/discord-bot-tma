const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionsBitField, SlashCommandBuilder, StringSelectMenuBuilder, REST, Routes } = require('discord.js');
const express = require('express');
const https = require('https');
const FuzzySet = require('fuzzyset');

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
const userMessageMap = new Map();

const ROBLOX_PLACE_ID = '80024713565142';
const ROBLOX_OYUN_LINKI = `https://www.roblox.com/tr/games/${ROBLOX_PLACE_ID}/TMA-T-rk-Asker-Oyunu`;
const TMA_LOGO_URL = 'https://i.ibb.co/68v8z92/1000032255.jpg';

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

// --- KÜFÜR VE SPAM KORUMA EVENTİ ---
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
    const badWordsSchema = require('./Modeller/badWordsSchema');
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

// --- BUTON VE KOMUT ETKİLEŞİMLERİ ---
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
            const targetMember = interaction.options.getMember('
