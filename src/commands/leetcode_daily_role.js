import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import appConfig from '../config.js';

export default {
  data: new SlashCommandBuilder()
    .setName('lock_in')
    .setDescription('Manage your LeetCode daily problem notification role.')
    .setDMPermission(false)
    .addStringOption((option) =>
      option
        .setName('action')
        .setDescription('Choose to join or leave the notification role.')
        .setRequired(true)
        .addChoices(
          { name: 'Join Notifications', value: 'join' },
          { name: 'Leave Notifications', value: 'leave' },
        ),
    ),

  async execute(interaction) {
    const action = interaction.options.getString('action');
    const roleId = appConfig.leetcodeDailyRoleId;
    const member = interaction.member;

    if (!roleId) {
      return interaction.reply({
        content:
          ':x: The LeetCode daily role is not configured by the bot admin.',
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: true });

    let role;
    try {
      role = await interaction.guild.roles.fetch(roleId);
    } catch (error) {
      console.error(`Error fetching LeetCode role ID ${roleId}:`, error);
      return interaction.editReply({
        content:
          ':x: Could not find the configured LeetCode notification role. Please contact an admin.',
        ephemeral: true,
      });
    }

    if (!role) {
      return interaction.editReply({
        content:
          ':x: The configured LeetCode notification role does not exist. Please contact an admin.',
        ephemeral: true,
      });
    }

    const embed = new EmbedBuilder().setColor(0x0099ff); // Blue color

    try {
      if (action === 'join') {
        if (member.roles.cache.has(role.id)) {
          embed
            .setTitle('ℹ️ Already Subscribed')
            .setDescription(
              `You already have the ${role.name} role for LeetCode daily notifications.`,
            );
        } else {
          await member.roles.add(role);
          embed
            .setTitle('✅ Subscribed!')
            .setDescription(
              `You've been given the ${role.name} role and will now receive LeetCode daily problem notifications.`,
            );
        }
      } else if (action === 'leave') {
        if (!member.roles.cache.has(role.id)) {
          embed
            .setTitle('ℹ️ Not Subscribed')
            .setDescription(
              `You don't have the ${role.name} role for LeetCode daily notifications.`,
            );
        } else {
          await member.roles.remove(role);
          embed
            .setTitle('✅ Unsubscribed!')
            .setDescription(
              `The ${role.name} role has been removed. You will no longer receive LeetCode daily problem notifications.`,
            );
        }
      }
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error(`Error managing role ${role.name} for user ${member.id}:`, error);
      await interaction.editReply({
        content: `:x: There was an error trying to ${action} the role. Please ensure I have 'Manage Roles' permissions.`,
        ephemeral: true,
      });
    }
  },
};
