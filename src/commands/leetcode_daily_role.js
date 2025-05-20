import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import appConfig from "../config.js";

export default {
  data: new SlashCommandBuilder()
    .setName("lock")
    .setDescription("Manage your LeetCode daily problem notification status.")
    .setDMPermission(false)
    .addStringOption((option) =>
      option
        .setName("action")
        .setDescription("Choose to opt-in or opt-out of notifications.")
        .setRequired(true)
        .addChoices(
          { name: "Opt-in (Receive Notifications)", value: "in" },
          { name: "Opt-out (Stop Notifications)", value: "out" }
        )
    ),

  async execute(interaction) {
    const action = interaction.options.getString("action");
    const roleId = appConfig.leetcodeDailyRoleId;
    const member = interaction.member;

    if (!roleId) {
      return interaction.reply({
        content:
          ":x: The LeetCode daily role ID is not configured by the bot admin. Please contact an admin.",
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: true });

    let role;
    try {
      role = await interaction.guild.roles.fetch(roleId);
    } catch (error) {
      console.error(
        `[LockCommand] Error fetching LeetCode role ID ${roleId}:`,
        error
      );
      return interaction.editReply({
        content:
          ":x: Could not find the configured LeetCode notification role on this server. Please contact an admin.",
        ephemeral: true,
      });
    }

    if (!role) {
      return interaction.editReply({
        content:
          ":x: The configured LeetCode notification role does not exist on this server. Please contact an admin.",
        ephemeral: true,
      });
    }

    const embed = new EmbedBuilder().setColor(0x0099ff);
    const roleName = role.name;

    try {
      if (action === "in") {
        if (member.roles.cache.has(role.id)) {
          embed
            .setTitle("ℹ️ Already Subscribed")
            .setDescription(
              `You already have the "${roleName}" role for LeetCode daily notifications.`
            );
        } else {
          await member.roles.add(role);
          embed
            .setTitle("✅ Subscribed!")
            .setColor(0x00ff00)
            .setDescription(
              `You've been given the "${roleName}" role and will now receive LeetCode daily problem notifications.`
            );
        }
      } else if (action === "out") {
        if (!member.roles.cache.has(role.id)) {
          embed
            .setTitle("ℹ️ Not Subscribed")
            .setDescription(
              `You don't have the "${roleName}" role for LeetCode daily notifications.`
            );
        } else {
          await member.roles.remove(role);
          embed
            .setTitle("✅ Unsubscribed!")
            .setColor(0xffa500)
            .setDescription(
              `The "${roleName}" role has been removed. You will no longer receive LeetCode daily problem notifications.`
            );
        }
      } else {
        console.warn(`[LockCommand] Unexpected action value: ${action}`);
        return interaction.editReply({
          content: ":x: Invalid action specified.",
          ephemeral: true,
        });
      }
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error(
        `[LockCommand] Error managing role "${roleName}" for user ${member.user.tag} (${member.id}):`,
        error
      );

      let friendlyActionDescription = "manage";
      if (action === "in") {
        friendlyActionDescription = "add you to";
      } else if (action === "out") {
        friendlyActionDescription = "remove you from";
      }

      await interaction.editReply({
        content: `:x: There was an error trying to ${friendlyActionDescription} the "${roleName}" role. Please ensure I have 'Manage Roles' permissions and the bot's role is higher than the "${roleName}" role.`,
        ephemeral: true,
      });
    }
  },
};
