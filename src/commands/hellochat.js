import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('hellochat')
    .setDescription('Replies with Hello Chat!'),
  async execute(interaction) {
    await interaction.reply(`Hello Chat, ${interaction.user.username}!`);
  },
};
