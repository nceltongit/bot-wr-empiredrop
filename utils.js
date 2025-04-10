const fs = require("fs").promises;
const z = require("zod");
const axios = require("axios");
const AsciiTable = require("ascii-table");
const { addHours, format, intervalToDuration, formatDuration, isAfter, isBefore} = require("date-fns");
const {UTCDate} = require("@date-fns/utc");
const {logger} = require("./logger");

const schema = z.object({
    startTimestamp: z.number().gte(1704067200, "Format error on start_timestamp").lte(9999999999, "Format error on start_timestamp"),
    endTimestamp: z.number().gte(1704067200, "Format error on end_timestamp").lte(9999999999, "Format error on end_timestamp"),
    rewards: z.array(z.number({ invalid_type_error: "Format error on prize_by_rank" }), { invalid_type_error: "Format error on rewards" }).min(1, "Prize by rank must contain at least 1 element")
}).superRefine(({ start_timestamp, end_timestamp, rewards }, ctx) => {
    let prevReward = undefined;
    rewards.forEach((reward, index) => {
        if (index !== 0 && reward > prevReward) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "The prize_by_rank table format must be from biggest to smallest amount",
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
    const rewardsNotParsed = interaction.options.getString('prize_by_rank');
    const updateEvery = interaction.options.getString('update_every');

    return { channel, startTimestamp, endTimestamp, privateKey, publicKey, rewardsNotParsed, updateEvery };
}

const checkConnectionWithEmpireDrop = async (interaction) => {
    const { startTimestamp, endTimestamp, privateKey, publicKey, rewardsNotParsed, updateEvery, channel } = getStartCommandArgs(interaction);
    const guildId = interaction.guild.id;
    const guildName = interaction.guild.name;

    let rewards = [];
    try {
        rewards = JSON.parse(rewardsNotParsed);
    } catch (e) {
        logger.error(e);
        logger.info(`Prize by rank format is incorrect on server ${guildId} and name is ${guildName}`);
        await interaction.editReply("Prize by rank format is incorrect");
        return false;
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
            logger.error(err.issues);
            err.issues.forEach((issue) => {
                errorMessages.push(issue.message);
            })
        }
        logger.error(errorMessages.join("\n"));
        await interaction.editReply(errorMessages.join("\n"));
        return false;
    }

    try {
        const res = await fetchEmpireDrop(startTimestamp, endTimestamp, publicKey, privateKey);
        const empireDropRace = (await res.data);
        const players = empireDropRace.ranking.slice(0, rewards.length);

        const { content } = await buildWagerRaceResults(rewards, players, startTimestamp, endTimestamp);

        channel.send(content).catch(async e => {
            logger.error(e);
            logger.error(`The bot doesn't have the permission to send message on server ${guildId} and name is ${guildName}`);
            await interaction.editReply("The bot doesn't have the permission to send message on the channel");
        });

    } catch (e) {
        logger.error(e);
        if (e?.response?.data?.message) {
            await interaction.editReply(e.response.data.message);
            return false;
        }
        logger.error(`Error while fetching EMPIREDROP on server ${guildId} and name is ${guildName}`);
        logger.error(`With startTimestamp: ${startTimestamp}, endTimestamp: ${endTimestamp}, privateKey: ${privateKey}, publicKey: ${publicKey}, rewards: ${rewardsNotParsed}, updateEvery: ${updateEvery}, channel: ${channel}`);
        await interaction.editReply("Error while fetching EMPIREDROP, please verify the public key you provided");
        return false;
    }

    let hours = '';

    switch (updateEvery) {
        case '0 */6 * * *':
            hours = '6';
            break;
        case '0 */12 * * *':
            hours = '12';
            break;
        case '0 0 * * *':
            hours = '24';
            break;
        default:
            hours = '6';
    }

    await interaction.editReply(`You are now connected with the EMPIREDROP api, result should be posted every ${hours} hours !`);
    logger.info(`Connected with the EMPIREDROP api on server ${guildId} and name is ${guildName}`);

    return true;
}

const getAsciiTable = (rewards, players, withUserId) => {
    const heading = withUserId ? ['Rank', 'Username', 'UserId', 'Wager', 'Prizes'] : ['Rank', 'Username', 'Wager', 'Prizes'];
    const tableContent = rewards.map((reward, index) => {
        const username = players?.[index]?.user.name ?? '';
        const wager = players?.[index]?.total_value ?? '';

        const rank = index + 1;

        if (withUserId) {
            const userId = players?.[index]?.user.hash_id ?? '';
            return [rank, username, userId, `${wager}€`, `${reward}€` ];
        }

        return [rank, username, `${wager}€`, `${reward}€`];
    });

    const table = new AsciiTable()
        .setHeading(heading)
        .addRowMatrix(tableContent);

    return `\`\`\`\n${table.toString()}\`\`\``;
}

const buildWagerRaceResults = async (
    rewards,
    players,
    startTimestamp,
    endTimestamp,
    resultWithUserId,
) => {
  const startDate = new UTCDate(startTimestamp * 1000)
  const endDate = new UTCDate(endTimestamp * 1000)

  let codeblock = ''

  if (resultWithUserId) {
    codeblock = getAsciiTable(rewards, players, true)
  } else {
    codeblock = getAsciiTable(rewards, players)
  }

  const now = new UTCDate()

  if (isAfter(now, addHours(endDate, 1))) {
    return {
      content: `# FINAL RESULT WAGER RACE _EMPIREDROP_ \n## ${format(
          startDate,
          'dd/MM/yyyy h:mm aaa',
      )} UTC - ${format(endDate, 'dd/MM/yyyy h:mm aaa')} UTC \n ${codeblock}\n`,
      endTask: true,
    }
  } else if (isAfter(now, endDate)) {
    return {
      content: `# WAGER RACE _EMPIREDROP_ \n## ${format(
          startDate,
          'dd/MM/yyyy h:mm aaa',
      )} UTC - ${format(
          endDate,
          'dd/MM/yyyy h:mm aaa',
      )} UTC \n ${codeblock}\n Please wait the next message to get the final result`,
    }
  } else if (isBefore(now, startDate)) {
    let duration = intervalToDuration({
      start: new UTCDate(),
      end: startDate,
    })
    const timeleft = formatDuration(duration, {
      delimiter: ', ',
      format: ['days', 'hours', 'minutes'],
    })

    return {
      content: `# WAGER RACE _EMPIREDROP_ \n## ${format(
          startDate,
          'dd/MM/yyyy h:mm aaa',
      )} UTC - ${format(
          endDate,
          'dd/MM/yyyy h:mm aaa',
      )} UTC \n The wager race will begin in ${timeleft}`,
    }
  } else {
    let duration = intervalToDuration({
      start: new UTCDate(),
      end: endDate,
    })

    const timeleft = formatDuration(duration, {
      delimiter: ', ',
      format: ['days', 'hours', 'minutes'],
    })

    return {
      content: `# WAGER RACE _EMPIREDROP_ \n ## ${format(
          startDate,
          'dd/MM/yyyy h:mm aaa',
      )} UTC - ${format(
          endDate,
          'dd/MM/yyyy h:mm aaa',
      )} UTC \n ### TIMELEFT :  ${timeleft}  \n ${codeblock}`,
    }
  }
}

async function readJSONFile(filename) {
    try {
        const data = await fs.readFile(filename, "utf8");
        return JSON.parse(data);
    } catch (error) {
        logger.error(`Error reading ${filename}: ${error}`);
        return [];
    }
}

module.exports = {
    checkConnectionWithEmpireDrop,
    buildWagerRaceResults,
    getStartCommandArgs,
    fetchEmpireDrop,
    readJSONFile,
    schema
}