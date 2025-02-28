const { SlashCommandBuilder } = require('discord.js');
const { stopTask } = require("../../cron");
const {logger} = require("../../logger");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Stop the wager race'),
    async execute(interaction) {
        await interaction.deferReply();
        logger.info(`Stop command on server ${interaction.guild.id} and name is ${interaction.guild.name} by ${interaction.user.username}`);
        await stopTask(interaction);
    },
};