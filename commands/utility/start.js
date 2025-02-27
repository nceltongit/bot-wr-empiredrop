require('dotenv').config();
const { SlashCommandBuilder, ChannelType } = require('discord.js');
const { startTask } = require("../../cron");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('start')
        .setDescription('Start the wager race')
        .addIntegerOption(option =>
            option.setName('start_timestamp')
                .setDescription('The start timestamp (format: 1714946400) can be generated here https://www.unixtimestamp.com/')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('end_timestamp')
                .setDescription('The end timestamp (format: 1714946400 can be generated here https://www.unixtimestamp.com/)')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('public_key')
                .setDescription('The public key of EMPIREDROP')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('private_key')
                .setDescription('The private key of EMPIREDROP')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('prize_by_rank')
                .setDescription('Prize by rank from biggest to smallest amount in Euros (format: [1000, 800, 700, ...])')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('update_every')
                .setDescription('The time the wager race will be refreshed (a new message will be posted in your channel)')
                .setRequired(true)
                .addChoices(
                    { name: 'Every 6h', value: '0 */6 * * *' },
                    { name: 'Every 12h', value: '0 */12 * * *' },
                    { name: 'Every 24h', value: '0 0 * * *' },
                ))
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('The channel to post result to')
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildText)),
    async execute(interaction) {
        await interaction.deferReply();
        console.log(`Start command on server ${interaction.guild.id} and name is ${interaction.guild.name}`);
        await startTask(interaction);
    },
};