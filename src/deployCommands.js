import { REST, Routes } from "discord.js";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadCommands } from "./utils/commandLoader.js";

dotenv.config();

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

if (!token || !clientId) {
  console.error(
    "Error: DISCORD_TOKEN or CLIENT_ID is missing. Please set them in your .env file."
  );
  process.exit(1);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const apiCommands = [];

async function prepareApiCommands() {
  const commandsPath = path.join(__dirname, "commands");
  const loadedCommandModules = await loadCommands(commandsPath);

  for (const commandModule of loadedCommandModules) {
    apiCommands.push(commandModule.data.toJSON());
    console.log(
      `[Deploy] Prepared command for deployment: ${commandModule.data.name}`
    );
  }
}

const rest = new REST({ version: "10" }).setToken(token);

(async () => {
  try {
    await prepareApiCommands();

    if (apiCommands.length === 0) {
      console.log("[Deploy] No commands found to deploy.");
      return;
    }

    console.log(
      `[Deploy] Started refreshing ${apiCommands.length} application (/) commands.`
    );

    let data;
    if (guildId) {
      console.log(`[Deploy] Deploying commands to guild: ${guildId}`);
      data = await rest.put(
        Routes.applicationGuildCommands(clientId, guildId),
        { body: apiCommands }
      );
    } else {
      console.log("[Deploy] Deploying commands globally.");
      data = await rest.put(Routes.applicationCommands(clientId), {
        body: apiCommands,
      });
    }

    console.log(
      `[Deploy] Successfully reloaded ${data.length} application (/) commands.`
    );
  } catch (error) {
    console.error("[Deploy] Error during command deployment:", error);
  }
})();
