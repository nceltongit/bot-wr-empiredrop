const {promises: fs} = require("fs");
const {logger} = require("./logger");
let tasks = [];

const add = (task, guildId) => {
    tasks.push({ task, guildId });
};

const get = (guildId) => tasks.find((task) => task.guildId === guildId)?.task;
const deleteTask = async (guildId, guildName) => {
    tasks = tasks.filter((task) => task.guildId !== guildId);
    try {
        await fs.unlink(`./races/race_${guildId}.json`);
        logger.info(`Successfully deleting race file on server ${guildId} and name is ${guildName}`);
    } catch (e) {
        logger.error(`Error when deleting race file on server ${guildId} and name is ${guildName} ${e}`);
    }
}

module.exports = {
    add,
    get,
    deleteTask,
};