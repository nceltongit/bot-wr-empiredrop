require('dotenv').config();
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Stop the wager race'),
    async execute(interaction) {
        interaction.reply("The wager race");
    },
};