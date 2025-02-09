let tasks = [];

const add = (task, guildId) => {
    tasks.push({ task, guildId });
};

const get = (guildId) => tasks.find((task) => task.guildId === guildId)?.task;
const deleteTask = (guildId) => {
    tasks = tasks.filter((task) => task.guildId !== guildId);
}

module.exports = {
    add,
    get,
    deleteTask,
};