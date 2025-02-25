const {promises: fs} = require("fs");
let tasks = [];

const add = (task, guildId) => {
    tasks.push({ task, guildId });
};

const get = (guildId) => tasks.find((task) => task.guildId === guildId)?.task;
const deleteTask = async (guildId) => {
    tasks = tasks.filter((task) => task.guildId !== guildId);
    await fs.unlink(`./races/race_${guildId}.json`);
}

module.exports = {
    add,
    get,
    deleteTask,
};