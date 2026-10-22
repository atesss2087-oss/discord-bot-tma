const { SlashCommandBuilder, ChannelType, EmbedBuilder } = require('discord.js');
const badWordsSchema = require('../../Models/badWordsSchema');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('küfür-koruma')
        .setDescription('Gelişmiş küfür koruma sistemi yönetim komutu.')
        .addSubcommand(command =>
            command.setName('enable')
                .setDescription('Küfür koruma sistemini etkinleştirir.'))
        .addSubcommand(command =>
            command.setName('disable')
                .setDescription('Küfür koruma sistemini devre dışı bırakır.'))
        .addSubcommand(command =>
            command.setName('addwords')
                .setDescription('Yasaklı kelimeler listesine kelime ekler.')
                .addStringOption(option =>
                    option.setName('word')
                        .setDescription('Eklenecek kelime (birden fazla ise virgül ile ayırın).')
                        .setRequired(true)))
        .addSubcommand(command =>
            command.setName('removewords')
                .setDescription('Yasaklı kelimeler listesinden kelime çıkarır.')
                .addStringOption(option =>
                    option.setName('word')
                        .setDescription('Çıkarılacak kelimeyi girin.')
                        .setRequired(true)))
        .addSubcommand(command =>
            command.setName('list')
                .setDescription('Yasaklı kelimeleri listeler.'))
        .addSubcommand(command =>
            command.setName('delete')
                .setDescription('Tüm küfür listesini tamamen siler.'))
        .addSubcommand(command =>
            command.setName('log')
                .setDescription('Küfür edenlerin mesajlarının gönderileceği log kanalını seçer.')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Log Kanalını Seçin')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true))),

    async execute(interaction) {
        const { guild, options } = interaction;
        const sub = options.getSubcommand();

        switch (sub) {
            case 'enable':
                try {
                    await badWordsSchema.findOneAndUpdate(
                        { Guild: guild.id },
                        { ProtectionEnabled: true },
                        { upsert: true, new: true }
                    );
                    await interaction.reply({ content: '✅ Küfür koruma sistemi etkinleştirildi.', ephemeral: true });
                } catch (error) {
                    console.error('Veritabanı hatası:', error);
                    await interaction.reply({ content: '❌ Küfür koruma sistemi etkinleştirilirken bir hata oluştu.', ephemeral: true });
                }
                break;

            case 'disable':
                try {
                    await badWordsSchema.findOneAndUpdate(
                        { Guild: guild.id },
                        { ProtectionEnabled: false },
                        { upsert: true, new: true }
                    );
                    await interaction.reply({ content: '🛑 Küfür koruma sistemi devre dışı bırakıldı.', ephemeral: true });
                } catch (error) {
                    console.error('Veritabanı hatası:', error);
                    await interaction.reply({ content: '❌ Küfür koruma sistemi devre dışı bırakılırken bir hata oluştu.', ephemeral: true });
                }
                break;

            case 'addwords':
                try {
                    const word = options.getString('word');
                    const wordsArray = word.split(',').map(w => w.trim());

                    await badWordsSchema.findOneAndUpdate(
                        { Guild: guild.id },
                        { $push: { SwearWords: { $each: wordsArray } } },
                        { upsert: true, new: true }
                    );

                    await interaction.reply({ content: `✅ \`${wordsArray.join(', ')}\` küfür listesine eklendi.`, ephemeral: true });
                } catch (error) {
                    console.error('Veritabanı hatası:', error);
                    await interaction.reply({ content: '❌ Küfür kelimesi eklenirken bir hata oluştu.', ephemeral: true });
                }
                break;

            case 'removewords':
                try {
                    const word = options.getString('word');

                    await badWordsSchema.findOneAndUpdate(
                        { Guild: guild.id },
                        { $pull: { SwearWords: word } },
                        { upsert: true, new: true }
                    );

                    await interaction.reply({ content: `🗑️ \`${word}\` küfür listesinden çıkarıldı.`, ephemeral: true });
                } catch (error) {
                    console.error('Veritabanı hatası:', error);
                    await interaction.reply({ content: '❌ Küfür kelimesi çıkarılırken bir hata oluştu.', ephemeral: true });
                }
                break;

            case 'list':
                try {
                    const settings = await badWordsSchema.findOne({ Guild: guild.id });
                    if (!settings || !settings.SwearWords || settings.SwearWords.length === 0) {
                        return await interaction.reply({ content: '⚠️ Küfür listesi boş!', ephemeral: true });
                    }

                    const swearWordsList = settings.SwearWords.join(', ');
                    await interaction.reply({ content: `📜 Küfür Listesi: \`${swearWordsList}\``, ephemeral: true });
                } catch (error) {
                    console.error('Veritabanı hatası:', error);
                    await interaction.reply({ content: '❌ Küfür listesini getirirken bir hata oluştu.', ephemeral: true });
                }
                break;

            case 'delete':
                try {
                    const removeData = await badWordsSchema.findOne({ Guild: guild.id });
                    if (!removeData) {
                        return await interaction.reply({ content: '⚠️ Henüz küfür listesi oluşturulmamış!', ephemeral: true });
                    }

                    await badWordsSchema.deleteOne({ Guild: guild.id });
                    await interaction.reply({ content: '🗑️ Tüm küfür listesi başarıyla silindi!', ephemeral: true });
                } catch (error) {
                    console.error('Veritabanı hatası:', error);
                    await interaction.reply({ content: '❌ Tüm küfürleri silerken bir hata oluştu.', ephemeral: true });
                }
                break;

            case 'log':
                try {
                    const channel = options.getChannel('channel');
                    await badWordsSchema.findOneAndUpdate(
                        { Guild: guild.id },
                        { LogChannel: channel.id },
                        { upsert: true, new: true }
                    );
                    await interaction.reply({ content: `✅ Log kanalı başarıyla ${channel} olarak ayarlandı.`, ephemeral: true });
                } catch (error) {
                    console.error('Veritabanı hatası:', error);
                    await interaction.reply({ content: '❌ Log kanalı ayarlanırken bir hata oluştu.', ephemeral: true });
                }
                break;
        }
    }
};
