const tasks = [];

const add = (task, guildId) => {
    tasks.push({ task, guildId });
};

const get = (guildId) => tasks.find((task) => task.guildId === guildId)?.task;

module.exports = {
    add,
    get,
};