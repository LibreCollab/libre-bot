import { EmbedBuilder, hyperlink } from "discord.js";
import appConfig from "../config.js";
import { getDailyCodingChallenge } from "../utils/leetcodeAPI.js";

const LEETCODE_BASE_URL = "https://leetcode.com";

/**
 * Retrieves the last notified LeetCode problem slug from the database.
 * @param {import('mongodb').Db} db - The MongoDB database instance.
 * @returns {Promise<string|null>} The slug of the last notified problem or null.
 */
const getLastNotifiedProblemSlug = async (db) => {
  const stateCollection = db.collection(appConfig.leetcodeStateCollectionName);
  const state = await stateCollection.findOne({ _id: "dailyProblemState" });
  return state ? state.lastNotifiedSlug : null;
};

/**
 * Updates the last notified LeetCode problem slug in the database.
 * @param {import('mongodb').Db} db - The MongoDB database instance.
 * @param {string} slug - The slug of the newly notified problem.
 */
const updateLastNotifiedProblemSlug = async (db, slug) => {
  const stateCollection = db.collection(appConfig.leetcodeStateCollectionName);
  await stateCollection.updateOne(
    { _id: "dailyProblemState" },
    { $set: { lastNotifiedSlug: slug } },
    { upsert: true }
  );
};

export const checkLeetCodeDaily = async (client) => {
  if (!client.db || !client.httpClient) {
    console.error("[LeetCodeTask] DB or HTTP client not initialized.");
    return;
  }
  console.log("[LeetCodeTask] Checking for new LeetCode daily problem...");

  const dailyProblemData = await getDailyCodingChallenge();

  if (
    !dailyProblemData ||
    !dailyProblemData.question ||
    !dailyProblemData.question.titleSlug
  ) {
    console.warn("[LeetCodeTask] No daily problem data received from API.");
    return;
  }

  const currentProblemSlug = dailyProblemData.question.titleSlug;
  const lastNotifiedSlug = await getLastNotifiedProblemSlug(client.db);

  if (currentProblemSlug === lastNotifiedSlug) {
    return;
  }

  console.log(
    `[LeetCodeTask] New daily problem found: ${dailyProblemData.question.title}`
  );

  const notificationChannelId = appConfig.leetcodeNotificationsChannelId;
  const roleId = appConfig.leetcodeDailyRoleId;

  let notificationChannel;
  let roleToPing;

  try {
    notificationChannel = await client.channels.fetch(notificationChannelId);
    if (!notificationChannel || !notificationChannel.isTextBased()) {
      console.error(
        `[LeetCodeTask] Notification channel ${notificationChannelId} not found or not text-based.`
      );
      return;
    }
  } catch (error) {
    console.error(
      `[LeetCodeTask] Error fetching notification channel ${notificationChannelId}:`,
      error
    );
    return;
  }

  try {
    const guild =
      client.guilds.cache.get(appConfig.guildId) || client.guilds.cache.first();
    if (guild) {
      roleToPing = await guild.roles.fetch(roleId);
    }
    if (!roleToPing) {
      console.warn(
        `[LeetCodeTask] Role ID ${roleId} not found in guild ${
          guild ? guild.id : "any available guild"
        }.`
      );
    }
  } catch (error) {
    console.error(`[LeetCodeTask] Error fetching role ID ${roleId}:`, error);
  }

  const question = dailyProblemData.question;
  const problemUrl = `${LEETCODE_BASE_URL}${dailyProblemData.link}`;

  const difficultyColors = {
    Easy: 0x00af87,
    Medium: 0xffb800,
    Hard: 0xff2d55,
  };

  const embed = new EmbedBuilder()
    .setTitle(`🆕 ${question.title}`)
    .setURL(problemUrl)
    .setDescription(
      `A new daily coding challenge is available on LeetCode! Good luck! 🍀`
    )
    .addFields(
      { name: "Difficulty", value: question.difficulty || "N/A", inline: true },
      {
        name: "Success Rate",
        value: `${parseFloat(question.acRate).toFixed(1)}%` || "N/A",
        inline: true,
      },

      { name: "Link", value: hyperlink("Solve Problem", problemUrl) }
    )
    .setColor(difficultyColors[question.difficulty] || 0x7289da)
    .setTimestamp(new Date(dailyProblemData.date));

  if (question.topicTags && question.topicTags.length > 0) {
    embed.addFields({
      name: "Topics",
      value: question.topicTags.map((tag) => tag.name).join(", "),
      inline: false,
    });
  }
  embed.setFooter({ text: "LeetCode Daily Challenge" });

  try {
    let content = "Hey everyone!";
    if (roleToPing) {
      content = `${roleToPing.toString()}, a new daily challenge is up!`;
    } else {
      content = "A new LeetCode daily challenge is up!";
    }

    await notificationChannel.send({
      content: content,
      embeds: [embed],
    });
    console.log(
      `[LeetCodeTask] Successfully notified new daily problem: ${question.title}`
    );
    await updateLastNotifiedProblemSlug(client.db, currentProblemSlug);
  } catch (error) {
    console.error("[LeetCodeTask] Error sending notification:", error);
  }
};
