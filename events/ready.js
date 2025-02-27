const { Events } = require('discord.js');
const { readJSONFile, fetchEmpireDrop, buildWagerRaceResults} = require("../utils");
const fs = require("fs");
const cron = require("node-cron");
const {add, deleteTask} = require("../taskManager");
const {logger} = require("../logger");

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        logger.info(`Ready ! Logged in as ${client.user.tag}`);

        try {
            const racesFiles = fs.readdirSync('./races').filter(file => file.endsWith('.json'));

            logger.info(`${racesFiles.length} races found`);

            for (const file of racesFiles) {
                const {
                    startTimestamp,
                    endTimestamp,
                    publicKey,
                    privateKey,
                    channelId,
                    guildId,
                    guildName,
                    rewards,
                    updateEvery
                } = await readJSONFile(`./races/${file}`);

                const task = cron.schedule(updateEvery, async () => {
                    logger.info(`Wager race running on id: ${guildId} and name: ${guildName}`);
                    const res = await fetchEmpireDrop(startTimestamp, endTimestamp, publicKey, privateKey);
                    const empireDropRace = (await res.data);
                    const players = empireDropRace.ranking.slice(0, rewards.length);

                    const { content, endTask } = await buildWagerRaceResults(rewards, players, startTimestamp, endTimestamp);

                    const channel = client.channels.cache.get(channelId);

                    channel.send(content).catch(async e => {
                        logger.error(e);
                        logger.error(`Message not send on server ${guildId} and name: ${guildName}`);
                    });

                    if (endTask) {
                        task.stop();
                        await deleteTask(guildId, guildName);
                        logger.info(`The race is ended automatically on server ${guildId} and name: ${guildName}`);
                    }
                }, {
                    scheduled: false
                });

                add(task, guildId);

                logger.info(`Task start after reading files on server ${guildId} and name: ${guildName}`);
                task.start();
            }
        } catch (error) {
            logger.error(error);
            logger.error(`Error when reading file for server ${guildId} and name: ${guildName}`);
        }
    },
};
