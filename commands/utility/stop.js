const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Stop the wager race')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {},
};