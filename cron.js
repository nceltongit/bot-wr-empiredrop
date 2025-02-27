const cron = require('node-cron');
const fs = require("fs").promises;
const {getStartCommandArgs, fetchEmpireDrop, buildWagerRaceResults, checkConnectionWithEmpireDrop} = require("./utils");
const { add, get, deleteTask } = require("./taskManager");
const {logger} = require("./logger");


const startTask = async (interaction) => {
    const guildId = interaction.guild.id;
    const guildName = interaction.guild.name;
    if (get(guildId)) {
        logger.info(`A wager race is already started on server ${guildId} and name is ${guildName}`);
        interaction.editReply('A wager race is already started on this server, please use **/stop** before create a new one');
        return;
    }

    const isConnected = await checkConnectionWithEmpireDrop(interaction);

    if (!isConnected) {
        return
    }

    const { channel, startTimestamp, endTimestamp, privateKey, publicKey, rewardsNotParsed, updateEvery } = getStartCommandArgs(interaction);

    let rewards = [];
    try {
        rewards = JSON.parse(rewardsNotParsed);
    } catch (e) {
        logger.error(e);
        await interaction.editReply("Prize by rank format is incorrect");
        return;
    }

    const task = cron.schedule(updateEvery, async () => {
        logger.info(`Wager race running on id: ${guildId} and name: ${guildName}`)
        const res = await fetchEmpireDrop(startTimestamp, endTimestamp, publicKey, privateKey);
        const empireDropRace = (await res.data);
        const players = empireDropRace.ranking.slice(0, rewards.length);

        const { content, endTask } = await buildWagerRaceResults(rewards, players, startTimestamp, endTimestamp);

        channel.send(content).catch(async e => {
            logger.error(e);
            logger.error(`The bot doesn't have the permission to send message on server ${guildId} and name is ${guildName}`)
            await interaction.editReply("The bot doesn't have the permission to send message on the channel");
        });

        if (endTask) {
            task.stop();
            await deleteTask(guildId, guildName);
            logger.info(`The race is ended automatically on server ${guildId} and name is ${guildName}`)
        }
    }, {
        scheduled: false
    });

    add(task, guildId);
    const race = {
        guildId,
        guildName,
        channelId: channel.id,
        startTimestamp,
        endTimestamp,
        privateKey,
        publicKey,
        rewards,
        updateEvery
    }

    try {
        await fs.writeFile(`./races/race_${guildId}.json`, JSON.stringify(race, null, 2));
        logger.info(`The race file is created on server ${guildId} and name is ${guildName}`);
        logger.info(`With startTimestamp: ${startTimestamp}, endTimestamp: ${endTimestamp}, privateKey: ${privateKey}, publicKey: ${publicKey}, rewards: ${rewardsNotParsed}, updateEvery: ${updateEvery}, channel: ${channel}`);
    } catch (e) {
        logger.error(`Error when creating race file on server ${guildId} and name is ${guildName} ${e}`);
    }

    task.start();
}

const stopTask = async (interaction) => {
    const guildId = interaction.guild.id;
    const guildName = interaction.guild.name;
    const taskByGuildId = get(guildId);

    if (taskByGuildId) {
        taskByGuildId.stop();
        await deleteTask(guildId, guildName);
        logger.info(`The race is successfully stop manually on server ${guildId} and name is ${guildName}`);
        await interaction.editReply("The wager race is now stopped");
    } else {
        logger.info(`There is no wager race to stop on server ${guildId} and name is ${guildName}`)
        await interaction.editReply("There is no wager race to stop.");
    }
}

module.exports = { startTask, stopTask };