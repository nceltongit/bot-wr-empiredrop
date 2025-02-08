require('dotenv').config();
const { SlashCommandBuilder, ChannelType } = require('discord.js');
const { startTask } = require("../../cron");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('start')
        .setDescription('Start the wager race')
        .addIntegerOption(option =>
            option.setName('start_timestamp')
                .setDescription('The start timestamp of the wager race (format: 1714946400)')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('end_timestamp')
                .setDescription('The end timestamp of the wager race (format: 1714946400)')
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
            option.setName('rewards')
                .setDescription('The rewards table from biggest to smallest amount of the wager race  (format: [1000, 800, 700, ...])')
                .setRequired(true))
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('The channel to post result to')
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildText)),
    async execute(interaction) {
        await startTask(interaction);
    },
};