require('dotenv').config();
const { SlashCommandBuilder } = require('discord.js');
const {getStartCommandArgs, fetchEmpireDrop, buildWagerRaceResults, schema} = require("../../utils");
const z = require("zod");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('result')
        .setDescription('Get the result of the wager race')
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
                .setRequired(true)),
    async execute(interaction) {
        const { startTimestamp, endTimestamp, privateKey, publicKey, rewardsNotParsed } = getStartCommandArgs(interaction);

        let rewards = [];
        try {
            rewards = JSON.parse(rewardsNotParsed);
        } catch (e) {
            await interaction.reply("Rewards format is incorrect");
            return;
        }

        try {
            schema.parse({
                startTimestamp,
                endTimestamp,
                rewards,
            })
        } catch (err) {
            const errorMessages = [];
            if (err instanceof z.ZodError) {
                console.log(err.issues);
                err.issues.forEach((issue) => {
                    errorMessages.push(issue.message);
                })
            }
            await interaction.reply(errorMessages.join("\n"));
            return;
        }


        const res = await fetchEmpireDrop(startTimestamp, endTimestamp, publicKey, privateKey);
        const empireDropRace = (await res.data);
        const players = empireDropRace.ranking.slice(0, rewards.length);

        const { content } = await buildWagerRaceResults(rewards, players, startTimestamp, endTimestamp, true);

        interaction.reply(content);
    },
};