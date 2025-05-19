import { REST, Routes } from "discord.js";
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

const commands = [];
const commandsPath = path.join(__dirname, "commands");

if (!fs.existsSync(commandsPath)) {
  console.error(
    "The 'commands' directory does not exist. Cannot deploy commands."
  );
  process.exit(1);
}

const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((file) => file.endsWith(".js"));

async function loadCommands() {
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const commandModule = await import(`file://${filePath}`);
    const command = commandModule.default || commandModule;

    if ("data" in command && "execute" in command) {
      commands.push(command.data.toJSON());
      console.log(
        `[INFO] Prepared command for deployment: ${command.data.name}`
      );
    } else {
      console.warn(
        `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
      );
    }
  }
}

const rest = new REST({ version: "10" }).setToken(token);

(async () => {
  try {
    await loadCommands();

    if (commands.length === 0) {
      console.log("No commands found to deploy.");
      return;
    }

    console.log(
      `Started refreshing ${commands.length} application (/) commands.`
    );

    let data;
    if (guildId) {
      console.log(`Deploying commands to guild: ${guildId}`);
      data = await rest.put(
        Routes.applicationGuildCommands(clientId, guildId),
        { body: commands }
      );
    } else {
      console.log("Deploying commands globally.");
      data = await rest.put(Routes.applicationCommands(clientId), {
        body: commands,
      });
    }

    console.log(
      `Successfully reloaded ${data.length} application (/) commands.`
    );
  } catch (error) {
    console.error(error);
  }
})();
