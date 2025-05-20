import fs from "node:fs";
import path from "node:path";

/**
 * Asynchronously loads all command modules from a specified directory.
 * @param {string} commandsDirPath The absolute path to the commands directory.
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of command modules.
 *                                    Each module should have 'data' and 'execute' properties.
 */
export const loadCommands = async (commandsDirPath) => {
  const commands = [];

  if (!fs.existsSync(commandsDirPath)) {
    console.warn(
      `[CommandLoader] The commands directory was not found: ${commandsDirPath}`
    );
    return commands;
  }

  const commandFiles = fs
    .readdirSync(commandsDirPath)
    .filter((file) => file.endsWith(".js"));

  for (const file of commandFiles) {
    const filePath = path.join(commandsDirPath, file);
    try {
      const commandModule = await import(`file://${filePath}`);
      const command = commandModule.default || commandModule;

      if ("data" in command && "execute" in command) {
        commands.push(command);
        // console.log(`[CommandLoader] Loaded command from: ${file}`); // For debugging
      } else {
        console.warn(
          `[CommandLoader] The command at ${filePath} is missing a required "data" or "execute" property.`
        );
      }
    } catch (error) {
      console.error(
        `[CommandLoader] Error loading command from ${filePath}:`,
        error
      );
    }
  }
  return commands;
};
