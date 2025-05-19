import dotenv from "dotenv";

dotenv.config();

const config = {
  discordToken: process.env.DISCORD_TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID,

  mongodbURI: process.env.MONGODB_URI,
  hetznerNotificationsChannelId: process.env.HETZNER_NOTIFICATIONS_CHANNEL_ID,

  dbName: "hetzner_alerts_db",
  hetznerCollectionName: "user_configs",
};

// Basic validation for essential configs
if (!config.mongodbURI) {
  console.error(
    "Error: MONGODB_URI is missing. Please set it in your .env file."
  );
  process.exit(1);
}
if (!config.hetznerNotificationsChannelId) {
  console.error(
    "Error: HETZNER_NOTIFICATIONS_CHANNEL_ID is missing. Please set it in your .env file."
  );
  process.exit(1);
}

export default Object.freeze(config);
