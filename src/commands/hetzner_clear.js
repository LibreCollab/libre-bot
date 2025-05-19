import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import appConfig from "../config.js";

export default {
  data: new SlashCommandBuilder()
    .setName("hetzner_clear")
    .setDescription(
      "Clears all of your active Hetzner auction alert configurations."
    )
    .setDMPermission(false),

  async execute(interaction) {
    if (!interaction.client.db) {
      return interaction.reply({
        content:
          "Database connection is not available. Please try again later.",
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: true });

    const hetznerCollection = interaction.client.db.collection(
      appConfig.hetznerCollectionName
    );
    const userId = interaction.user.id;

    try {
      const result = await hetznerCollection.deleteMany({ user_id: userId });

      const embed = new EmbedBuilder().setColor(0x00ff00);

      if (result.deletedCount > 0) {
        embed
          .setTitle("✅ Configurations Cleared!")
          .setDescription(
            `Successfully deleted ${result.deletedCount} of your Hetzner alert configuration(s).`
          );
      } else {
        embed
          .setTitle("ℹ️ No Configurations Found")
          .setDescription(
            "You didn't have any active Hetzner alert configurations to clear."
          );
      }
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error("Error clearing Hetzner configs from DB:", error);
      await interaction.editReply({
        content:
          ":x: There was an error trying to clear your configurations. Please try again.",
        ephemeral: true,
      });
    }
  },
};
