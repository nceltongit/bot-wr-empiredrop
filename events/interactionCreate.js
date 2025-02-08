const { Events } = require('discord.js');
const z = require("zod");
const axios = require("axios");
const AsciiTable = require("ascii-table");
const {intervalToDuration, formatDuration, format, addHours} = require("date-fns");

const schema = z.object({
    startTimestamp: z.number().gte(1704067200, "Format error on start_timestamp").lte(9999999999, "Format error on start_timestamp"),
    endTimestamp: z.number().gte(1704067200, "Format error on end_timestamp").lte(9999999999, "Format error on end_timestamp"),
    rewards: z.array(z.number({ invalid_type_error: "Format error on rewards" }), { invalid_type_error: "Format error on rewards" }).min(1, "Rewards must contain at least 1 element")
}).superRefine(({ start_timestamp, end_timestamp, rewards }, ctx) => {
    let prevReward = undefined;
    rewards.forEach((reward, index) => {
        if (index !== 0 && reward > prevReward) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "The rewards table format must be from biggest to smallest amount",
            });
            return;
        }
        prevReward = reward;
    });

    if (start_timestamp <= end_timestamp) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Invalid range, start_timestamp is greater than end_timestamp",
        });
    }
});

function fetchEmpireDrop(startTimestamp, endTimestamp, publicKey, privateKey) {
    const data = {
        start_timestamp: startTimestamp,
        end_timestamp: endTimestamp,
    };
    const options = {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'X-Private-Key': privateKey,
        },
        data: JSON.stringify(data),
    };

    return axios(`https://api.empiredrop.com/api/v1/race/affiliates/${publicKey}`, options);
}

let interval;

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        if (!interaction.isChatInputCommand()) return;

        if (interaction.user.id !== interaction.guild.ownerId) {
            interaction.reply('Only admin can use this command')
            return;
        }

        if (interaction.commandName === 'start') {
            if (interval) {
                interaction.reply('start already running');
                return;
            }
            const channel = interaction.options.getChannel('channel');
            const startTimestamp = interaction.options.getInteger('start_timestamp');
            const endTimestamp = interaction.options.getInteger('end_timestamp');
            const privateKey = interaction.options.getString('private_key');
            const publicKey = interaction.options.getString('public_key');
            const rewardsNotParsed = interaction.options.getString('rewards');

            let rewards = [];
            try {
                rewards = JSON.parse(rewardsNotParsed);
            } catch (e) {
                interaction.reply("Rewards format is incorrect");
                return;
            }

            try {
                schema.parse({
                    startTimestamp,
                    endTimestamp,
                    rewards,
                })
            } catch (err) {
                const errorMessages= [];
                if (err instanceof z.ZodError) {
                    console.log(err.issues);
                    err.issues.forEach((issue) => {
                        errorMessages.push(issue.message);
                    })
                }
                interaction.reply(errorMessages.join("\n"));
                return;
            }

            try {
                const res = await fetchEmpireDrop(startTimestamp, endTimestamp, publicKey, privateKey);
                (await res.data);
            } catch (e) {
                console.log(e);
                if (e?.response?.data?.message) {
                    interaction.reply(e.response.data.message);
                    return;
                }
                interaction.reply("Error while fetching EMPIREDROP, please verify the public key you provided");
                return;
            }

            interaction.reply("You are now connected with the EMPIREDROP api, result should be posted every hours !");

            interval = setInterval(async () => {
                const res = await fetchEmpireDrop(startTimestamp, endTimestamp, publicKey, privateKey);
                const empireDropRace = (await res.data);
                const players = empireDropRace.ranking.slice(0, rewards.length);

                const tableContent = rewards.map((reward, index) => {
                    const username = players?.[index].user.name ?? '';

                    const rank = index + 1;

                    return [rank, username, reward];
                });

                const table = new AsciiTable()
                    .setHeading('Rank', 'Username', 'prize')
                    .addRowMatrix(tableContent);

                const codeblock = `\`\`\`\n${table.toString()}\`\`\``;

                const startDate = new Date(startTimestamp * 1000);
                const endDate = new Date(endTimestamp * 1000);

                if (addHours(new Date(), 1) > endDate) {
                    const content = {
                        content: `# FINAL RESULT WAGER RACE _EMPIREDROP_ \n## ${format(
                            startDate,
                            'dd/MM/yyyy h:mm aaa',
                        )} - ${format(
                            endDate,
                            'dd/MM/yyyy h:mm aaa',
                        )} \n ${codeblock}\n-# If you want the users id please use the command /getresult in a private channel`,
                    };

                    channel.send(content);
                    clearInterval(interval);
                } else if (new Date() > endDate) {
                    const content = {
                        content: `# WAGER RACE _EMPIREDROP_ \n## ${format(
                            startDate,
                            'dd/MM/yyyy h:mm aaa',
                        )} - ${format(
                            endDate,
                            'dd/MM/yyyy h:mm aaa',
                        )}\n ENDED \n Please wait one more hour to get the final result`,
                    };

                    channel.send(content);
                } else {
                    let duration = intervalToDuration({
                        start: new Date(),
                        end: endDate,
                    })

                    const timeleft = formatDuration(duration, {
                        delimiter: ', ',
                        format: ['days', 'hours', 'minutes']
                    });

                    const content = {
                        content: `# WAGER RACE _EMPIREDROP_ \n ## ${format(
                            startDate,
                            'dd/MM/yyyy h:mm aaa',
                        )} - ${format(
                            endDate,
                            'dd/MM/yyyy h:mm aaa',
                        )}\n ### TIMELEFT :  ${timeleft}  \n ${codeblock}`,
                    };

                    channel.send(content);
                }
            }, 10000);
            return;
        }

        if (interaction.commandName === 'stop') {
            clearInterval(interval);
            interaction.reply("The wager race is now stopped.");
            return;
        }

        if (interaction.commandName === 'getresult') {
            const channel = interaction.options.getChannel('channel');
            const startTimestamp = interaction.options.getInteger('start_timestamp');
            const endTimestamp = interaction.options.getInteger('end_timestamp');
            const privateKey = interaction.options.getString('private_key');
            const publicKey = interaction.options.getString('public_key');
            const rewardsNotParsed = interaction.options.getString('rewards');

            let rewards = [];
            try {
                rewards = JSON.parse(rewardsNotParsed);
            } catch (e) {
                interaction.reply("Rewards format is incorrect");
                return;
            }

            try {
                schema.parse({
                    startTimestamp,
                    endTimestamp,
                    rewards,
                })
            } catch (err) {
                const errorMessages= [];
                if (err instanceof z.ZodError) {
                    console.log(err.issues);
                    err.issues.forEach((issue) => {
                        errorMessages.push(issue.message);
                    })
                }
                interaction.reply(errorMessages.join("\n"));
                return;
            }

            try {
                const res = await fetchEmpireDrop(startTimestamp, endTimestamp, publicKey, privateKey);
                const empireDropRace = (await res.data);
                const players = empireDropRace.ranking.slice(0, rewards.length);

                const tableContent = rewards.map((reward, index) => {
                    const username = players?.[index].user.name ?? '';
                    const userId = players?.[index].user.hash_id ?? '';

                    const rank = index + 1;

                    return [rank, username, userId, reward];
                });

                const table = new AsciiTable()
                    .setHeading('Rank', 'Username', 'UserId', 'prize')
                    .addRowMatrix(tableContent);

                const codeblock = `\`\`\`\n${table.toString()}\`\`\``;

                const startDate = new Date(startTimestamp * 1000);
                const endDate = new Date(endTimestamp * 1000);

                const content = {
                    content: `# FINAL RESULT WAGER RACE _EMPIREDROP_ \n## ${format(
                        startDate,
                        'dd/MM/yyyy h:mm aaa',
                    )} - ${format(
                        endDate,
                        'dd/MM/yyyy h:mm aaa',
                    )} \n ${codeblock}`,
                };

                channel.send(content);
            } catch (e) {
                console.log(e);
                if (e?.response?.data?.message) {
                    interaction.reply(e.response.data.message);
                    return;
                }
                interaction.reply("Error while fetching EMPIREDROP, please verify the public key you provided");
                return;
            }
        }

        console.error(`No command matching ${interaction.commandName} was found.`);
    },
};
