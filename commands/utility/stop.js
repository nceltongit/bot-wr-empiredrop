const { SlashCommandBuilder } = require('discord.js');
const { stopTask } = require("../../cron");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Stop the wager race'),
    async execute(interaction) {
        await interaction.deferReply();
        console.log(`Stop command on server ${interaction.guild.id} and name is ${interaction.guild.name}`);
        await stopTask(interaction);
    },
};