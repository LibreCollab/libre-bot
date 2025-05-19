import { Client, Events, GatewayIntentBits, Collection } from "discord.js";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadCommands } from "./utils/commandLoader.js";

dotenv.config();

const token = process.env.DISCORD_TOKEN;

if (!token) {
  console.error(
    "Error: DISCORD_TOKEN is missing. Please set it in your .env file."
  );
  process.exit(1);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.commands = new Collection();

async function initializeCommands() {
  const commandsPath = path.join(__dirname, "commands");
  const loadedCommands = await loadCommands(commandsPath);

  for (const command of loadedCommands) {
    if ("data" in command && "execute" in command) {
      client.commands.set(command.data.name, command);
      console.log(`[INFO] Registered command: ${command.data.name}`);
    } else {
      console.warn(
        `[WARNING] A loaded command object is missing "data" or "execute".`
      );
    }
  }
}

client.once(Events.ClientReady, async (readyClient) => {
  await initializeCommands();

  console.log(`Ready! Logged in as ${readyClient.user.tag}`);
  console.log(
    `libreBot is on ${client.guilds.cache.size} server(s). Invite link: https://discord.com/oauth2/authorize?client_id=${process.env.CLIENT_ID}&scope=bot%20applications.commands&permissions=8`
  );
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

(async () => {
  await client.login(token);
})();
