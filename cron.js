const cron = require('node-cron');
const {getStartCommandArgs, fetchEmpireDrop, buildWagerRaceResults, checkConnectionWithEmpireDrop} = require("./utils");

let task;

const startTask = async (interaction, guildId) => {
    if (task) {
        interaction.reply('Wager race already started');
        return;
    }

    await checkConnectionWithEmpireDrop(interaction);

    const { channel, startTimestamp, endTimestamp, privateKey, publicKey, rewardsNotParsed } = getStartCommandArgs(interaction);

    let rewards = [];
    try {
        rewards = JSON.parse(rewardsNotParsed);
    } catch (e) {
        await interaction.reply("Rewards format is incorrect");
        return;
    }

    task = cron.schedule(guildId, '* * * * *', async () => {
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

    task.start();
}

const stopTask = async (interaction) => {
    task.stop();
    await interaction.reply("The wager race is now stopped");
}

module.exports = { startTask, stopTask };