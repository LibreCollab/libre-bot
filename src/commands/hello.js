import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('hello')
    .setDescription('Hello there!'),
  async execute(interaction) {
    await interaction.reply("Hello chat!");
  },
};
