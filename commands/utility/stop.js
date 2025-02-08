const { SlashCommandBuilder } = require('discord.js');
const { stopTask } = require("../../cron");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Stop the wager race'),
    async execute(interaction) {
        await interaction.deferReply();
        await stopTask(interaction);
    },
};