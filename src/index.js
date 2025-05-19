import { Client, Events, GatewayIntentBits, Collection } from "discord.js";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MongoClient, ServerApiVersion } from "mongodb";
import axios from "axios";
import appConfig from "./config.js";
import { loadCommands } from "./utils/commandLoader.js";
import { checkHetznerAuction } from "./tasks/hetznerAuctionTask.js";

const token = appConfig.discordToken;

if (!token) {
  console.error(
    "Error: DISCORD_TOKEN is missing. Please check your .env and config.js."
  );
  process.exit(1);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.mongo = null;
client.db = null;
client.httpClient = axios.create({
  timeout: 10000,
});
client.commands = new Collection();
let hetznerCheckInterval = null;

async function initializeCommands() {
  const commandsPath = path.join(__dirname, "commands");
  const loadedCommands = await loadCommands(commandsPath);
  for (const command of loadedCommands) {
    if ("data" in command && "execute" in command) {
      client.commands.set(command.data.name, command);
      console.log(`[INFO] Registered command: ${command.data.name}`);
    }
  }
}

client.once(Events.ClientReady, async (readyClient) => {
  await initializeCommands();
  console.log(`Ready! Logged in as ${readyClient.user.tag}`);
  console.log(
    `libreBot is on ${client.guilds.cache.size} server(s). Invite link: https://discord.com/oauth2/authorize?client_id=${appConfig.clientId}&scope=bot%20applications.commands&permissions=8`
  );

  client.user.setPresence({
    activities: [{ name: "Hetzner auctions", type: 3 }],
    status: "online",
  });

  console.log("[INFO] Starting Hetzner auction check task...");
  try {
    await checkHetznerAuction(client);
    hetznerCheckInterval = setInterval(
      async () => await checkHetznerAuction(client),
      31 * 60 * 1000 // 31 minutes
    );
    console.log("[INFO] Hetzner auction check task scheduled.");
  } catch (error) {
    console.error("[ERROR] Failed to start Hetzner auction task:", error);
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const command = interaction.client.commands.get(interaction.commandName);
  if (!command) {
    console.error(`No command matching ${interaction.commandName} was found.`);
    await interaction.reply({
      content: `Error: Command "${interaction.commandName}" not found by the bot.`,
      ephemeral: true,
    });
    return;
  }
  try {
    await command.execute(interaction);
  } catch (error) {
    console.error("Error executing command:", error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({
        content: "There was an error while executing this command!",
        ephemeral: true,
      });
    } else {
      await interaction.reply({
        content: "There was an error while executing this command!",
        ephemeral: true,
      });
    }
  }
});

async function main() {
  try {
    console.log("[DB] Connecting to MongoDB...");
    const mongoClient = new MongoClient(appConfig.mongodbURI, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
    });
    await mongoClient.connect();
    client.mongo = mongoClient;
    client.db = mongoClient.db(appConfig.dbName);
    console.log(
      `[DB] Successfully connected to MongoDB. Database: ${appConfig.dbName}`
    );

    await client.login(token);
  } catch (error) {
    console.error("[FATAL] Could not start the bot or connect to DB:", error);
    if (client.mongo) {
      await client.mongo.close();
    }
    process.exit(1);
  }
}

async function shutdown(signal) {
  console.log(`[INFO] Received ${signal}. Shutting down gracefully...`);
  if (hetznerCheckInterval) {
    clearInterval(hetznerCheckInterval);
    console.log("[INFO] Stopped Hetzner auction check task.");
  }
  if (client.mongo) {
    await client.mongo.close();
    console.log("[DB] MongoDB connection closed.");
  }
  if (client) {
    client.destroy();
    console.log("[INFO] Discord client destroyed.");
  }
  process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

main();
