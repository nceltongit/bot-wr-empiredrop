const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { stopTask } = require("../../cron");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Stop the wager race')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        await stopTask(interaction);
    },
};