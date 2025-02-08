const cron = require('node-cron');
const {getStartCommandArgs, fetchEmpireDrop, buildWagerRaceResults, checkConnectionWithEmpireDrop} = require("./utils");
const { add, get } = require("./taskManager");


const startTask = async (interaction) => {
    const guildId = interaction.guild.id;
    if (get(guildId)) {
        interaction.editReply('A wager race is already started on this server, please use **/stop** before create a new one');
        return;
    }

    await checkConnectionWithEmpireDrop(interaction);

    const { channel, startTimestamp, endTimestamp, privateKey, publicKey, rewardsNotParsed } = getStartCommandArgs(interaction);

    let rewards = [];
    try {
        rewards = JSON.parse(rewardsNotParsed);
    } catch (e) {
        await interaction.editReply("Rewards format is incorrect");
        return;
    }

    const task = cron.schedule('0 * * * *', async () => {
        console.log(`Wager race running on id: ${guildId}`)
        const res = await fetchEmpireDrop(startTimestamp, endTimestamp, publicKey, privateKey);
        const empireDropRace = (await res.data);
        const players = empireDropRace.ranking.slice(0, rewards.length);

        const { content, endTask } = await buildWagerRaceResults(rewards, players, startTimestamp, endTimestamp);

        channel.send(content);

        if (endTask) {
            task.stop();
        }
    }, {
        scheduled: false
    });

    add(task, guildId);

    task.start();
}

const stopTask = async (interaction) => {
    const guildId = interaction.guild.id;
    const taskByGuildId = get(guildId);

    if (taskByGuildId) {
        taskByGuildId.stop();
        await interaction.editReply("The wager race is now stopped");
    } else {
        await interaction.editReply("There is no wager race to stop.");
    }
}

module.exports = { startTask, stopTask };