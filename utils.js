const z = require("zod");
const axios = require("axios");
const AsciiTable = require("ascii-table");
const { addHours, format, intervalToDuration, formatDuration } = require("date-fns");

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

const fetchEmpireDrop = (startTimestamp, endTimestamp, publicKey, privateKey) => {
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

const getStartCommandArgs = (interaction) => {
    const channel = interaction.options.getChannel('channel');
    const startTimestamp = interaction.options.getInteger('start_timestamp');
    const endTimestamp = interaction.options.getInteger('end_timestamp');
    const privateKey = interaction.options.getString('private_key');
    const publicKey = interaction.options.getString('public_key');
    const rewardsNotParsed = interaction.options.getString('rewards');

    return { channel, startTimestamp, endTimestamp, privateKey, publicKey, rewardsNotParsed };
}

const checkConnectionWithEmpireDrop = async (interaction) => {
    const { startTimestamp, endTimestamp, privateKey, publicKey, rewardsNotParsed } = getStartCommandArgs(interaction);

    let rewards = [];
    try {
        rewards = JSON.parse(rewardsNotParsed);
    } catch (e) {
        await interaction.editReply("Rewards format is incorrect");
        return;
    }

    try {
        schema.parse({
            startTimestamp,
            endTimestamp,
            rewards,
        })
    } catch (err) {
        const errorMessages = [];
        if (err instanceof z.ZodError) {
            console.log(err.issues);
            err.issues.forEach((issue) => {
                errorMessages.push(issue.message);
            })
        }
        await interaction.editReply(errorMessages.join("\n"));
        return;
    }

    try {
        const res = await fetchEmpireDrop(startTimestamp, endTimestamp, publicKey, privateKey);
        (await res.data);
    } catch (e) {
        console.log(e);
        if (e?.response?.data?.message) {
            await interaction.editReply(e.response.data.message);
            return;
        }
        await interaction.editReply("Error while fetching EMPIREDROP, please verify the public key you provided");
    }

    await interaction.editReply("You are now connected with the EMPIREDROP api, result should be posted every hours !");
}

const getAsciiTable = (rewards, players, withUserId) => {
    const heading = withUserId ? ['Rank', 'Username', 'UserId', 'prize'] : ['Rank', 'Username', 'prize'];
    const tableContent = rewards.map((reward, index) => {
        const username = players?.[index].user.name ?? '';

        const rank = index + 1;

        if (withUserId) {
            const userId = players?.[index].user.hash_id ?? '';
            return [rank, username, userId, reward];
        }

        return [rank, username, reward];
    });

    const table = new AsciiTable()
        .setHeading(heading)
        .addRowMatrix(tableContent);

    return `\`\`\`\n${table.toString()}\`\`\``;
}

const buildWagerRaceResults = async (rewards, players, startTimestamp, endTimestamp, resultWithUserId) => {
    const startDate = new Date(startTimestamp * 1000);
    const endDate = new Date(endTimestamp * 1000);

    let codeblock = '';

    if (resultWithUserId) {
        codeblock = getAsciiTable(rewards, players, true);
    } else {
        codeblock = getAsciiTable(rewards, players);
    }

    if (addHours(new Date(), 1) > endDate) {
        return {
            content: `# FINAL RESULT WAGER RACE _EMPIREDROP_ \n## ${format(
                startDate,
                'dd/MM/yyyy h:mm aaa',
            )} - ${format(
                endDate,
                'dd/MM/yyyy h:mm aaa',
            )} \n ${codeblock}\n${!resultWithUserId ? '-# If you want the users ids please use the /result command in a private channel' : ''}`,
            endTask: true,
        };
    } else if (new Date() > endDate) {
        return {
            content: `# WAGER RACE _EMPIREDROP_ \n## ${format(
                startDate,
                'dd/MM/yyyy h:mm aaa',
            )} - ${format(
                endDate,
                'dd/MM/yyyy h:mm aaa',
            )}\n ENDED \n Please wait one more hour to get the final result`,
        };
    } else {
        let duration = intervalToDuration({
            start: new Date(),
            end: endDate,
        })

        const timeleft = formatDuration(duration, {
            delimiter: ', ',
            format: ['days', 'hours', 'minutes']
        });

        return {
            content: `# WAGER RACE _EMPIREDROP_ \n ## ${format(
                startDate,
                'dd/MM/yyyy h:mm aaa',
            )} - ${format(
                endDate,
                'dd/MM/yyyy h:mm aaa',
            )}\n ### TIMELEFT :  ${timeleft}  \n ${codeblock}`,
        };
    }
}

module.exports = {
    checkConnectionWithEmpireDrop,
    buildWagerRaceResults,
    getStartCommandArgs,
    fetchEmpireDrop,
    schema
}