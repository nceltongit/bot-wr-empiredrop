const { Events } = require('discord.js');
const { readJSONFile, fetchEmpireDrop, buildWagerRaceResults} = require("../utils");
const fs = require("fs");
const cron = require("node-cron");
const {add, deleteTask} = require("../taskManager");

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log(`Ready ! Logged in as ${client.user.tag}`);

        try {
            const racesFiles = fs.readdirSync('./races').filter(file => file.endsWith('.json'));

            console.log(`${racesFiles.length} races found`);

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
                    console.log(`Wager race running on id: ${guildId} and name: ${guildName}`);
                    const res = await fetchEmpireDrop(startTimestamp, endTimestamp, publicKey, privateKey);
                    const empireDropRace = (await res.data);
                    const players = empireDropRace.ranking.slice(0, rewards.length);

                    const { content, endTask } = await buildWagerRaceResults(rewards, players, startTimestamp, endTimestamp);

                    const channel = client.channels.cache.get(channelId);

                    channel.send(content).catch(async e => {
                        console.error(e);
                        console.log(`Message not send on server ${guildId} and name: ${guildName}`);
                    });

                    if (endTask) {
                        task.stop();
                        deleteTask(guildId, guildName);
                        console.log(`The race is ended automatically on server ${guildId} and name: ${guildName}`);
                    }
                }, {
                    scheduled: false
                });

                add(task, guildId);

                console.log(`Task start after reading files on server ${guildId} and name: ${guildName}`);
                task.start();
            }
        } catch (error) {
            console.error(error);
            console.log(`Error when reading file for server ${guildId} and name: ${guildName}`);
        }
    },
};
