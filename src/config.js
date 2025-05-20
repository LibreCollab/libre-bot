import dotenv from "dotenv";

dotenv.config();

const config = {
  discordToken: process.env.DISCORD_TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID,
  mongodbURI: process.env.MONGODB_URI,
  hetznerNotificationsChannelId: process.env.HETZNER_NOTIFICATIONS_CHANNEL_ID,
  leetcodeDailyRoleId: process.env.LEETCODE_DAILY_ROLE_ID,
  leetcodeNotificationsChannelId: process.env.LEETCODE_NOTIFICATIONS_CHANNEL_ID,
  leetcodeStateCollectionName: 'leetcode_state',
  dbName: "hetzner_alerts_db",
  hetznerCollectionName: "user_configs",
};

// Basic validation for essential configs
const requiredConfigs = [
  {
    key: 'discordToken',
    envVar: 'DISCORD_TOKEN',
    message: 'Error: DISCORD_TOKEN is missing.',
  },
  {
    key: 'clientId',
    envVar: 'CLIENT_ID',
    message: 'Error: CLIENT_ID is missing.',
  },
  {
    key: 'mongodbURI',
    envVar: 'MONGODB_URI',
    message: 'Error: MONGODB_URI is missing.',
  },
  {
    key: 'hetznerNotificationsChannelId',
    envVar: 'HETZNER_NOTIFICATIONS_CHANNEL_ID',
    message: 'Error: HETZNER_NOTIFICATIONS_CHANNEL_ID is missing.',
  },
  {
    key: 'leetcodeDailyRoleId',
    envVar: 'LEETCODE_DAILY_ROLE_ID',
    message: 'Error: LEETCODE_DAILY_ROLE_ID is missing.',
  },
  {
    key: 'leetcodeNotificationsChannelId',
    envVar: 'LEETCODE_NOTIFICATIONS_CHANNEL_ID',
    message: 'Error: LEETCODE_NOTIFICATIONS_CHANNEL_ID is missing.',
  },
  // Add other essential configs here if needed
];

let hasMissingConfig = false;
for (const required of requiredConfigs) {
  if (!config[required.key]) {
    console.error(
      `${required.message} Please set ${required.envVar} in your .env file.`,
    );
    hasMissingConfig = true;
  }
}

if (hasMissingConfig) {
  console.error('Exiting due to missing critical configuration(s).');
  process.exit(1);
}

export default Object.freeze(config);
