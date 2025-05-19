import {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
} from "discord.js";
import appConfig from "../config.js";

const userCooldowns = new Map();
const COOLDOWN_SECONDS = 5;

export default {
  data: new SlashCommandBuilder()
    .setName("hetzner")
    .setDescription(
      "Set requirements for Hetzner server auction notifications."
    )
    .setDMPermission(false) // Guild only
    .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages)
    .addIntegerOption((option) =>
      option
        .setName("price")
        .setDescription("Maximum price (e.g., 50). Default: 0 (any price)")
        .setMinValue(0)
        .setMaxValue(1000)
        .setRequired(false)
    )
    .addIntegerOption((option) =>
      option
        .setName("vat_percentage")
        .setDescription("VAT percentage (0-100). Default: 0")
        .setMinValue(0)
        .setMaxValue(100)
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("currency")
        .setDescription("Currency for the price. Default: EUR")
        .addChoices(
          { name: "EUR", value: "EUR" },
          { name: "USD", value: "USD" }
        )
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("location")
        .setDescription("Server location. Default: All Datacenters")
        .addChoices(
          { name: "All Datacenters", value: "All" },
          { name: "Nuremberg (NBG)", value: "NBG" },
          { name: "Falkenstein (FSN)", value: "FSN" },
          { name: "Helsinki (HEL)", value: "HEL" }
        )
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("cpu_type")
        .setDescription("CPU type. Default: Any")
        .addChoices(
          { name: "Any", value: "Any" },
          { name: "AMD", value: "AMD" },
          { name: "Intel", value: "Intel" }
        )
        .setRequired(false)
    )
    .addIntegerOption((option) =>
      option
        .setName("ram_size")
        .setDescription("Minimum RAM in GB (e.g., 32). Default: 0 (any)")
        .setMinValue(0)
        .setMaxValue(1024)
        .setRequired(false)
    )
    .addBooleanOption((option) =>
      option
        .setName("ram_ecc")
        .setDescription("Does RAM need to be ECC? Default: false (any)")
        .setRequired(false)
    )
    .addIntegerOption((option) =>
      option
        .setName("drive_size")
        .setDescription(
          "Minimum size of the largest drive in GB (e.g., 256). Default: 0 (any)"
        )
        .setMinValue(0)
        .setMaxValue(30000)
        .setRequired(false)
    )
    .addIntegerOption((option) =>
      option
        .setName("drive_count")
        .setDescription("Minimum number of drives (e.g., 1). Default: 0 (any)")
        .setMinValue(0)
        .setMaxValue(16)
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("drive_type")
        .setDescription("Specific drive type required. Default: Any")
        .addChoices(
          { name: "Any", value: "Any" },
          { name: "NVMe", value: "NVMe" },
          { name: "SATA SSD", value: "SATA" },
          { name: "HDD", value: "HDD" }
        )
        .setRequired(false)
    ),

  async execute(interaction) {
    if (!interaction.client.db) {
      return interaction.reply({
        content:
          "Database connection is not available. Please try again later.",
        ephemeral: true,
      });
    }

    const now = Date.now();
    const userId = interaction.user.id;
    if (userCooldowns.has(userId)) {
      const expirationTime =
        userCooldowns.get(userId) + COOLDOWN_SECONDS * 1000;
      if (now < expirationTime) {
        const timeLeft = Math.ceil((expirationTime - now) / 1000);
        return interaction.reply({
          content: `Please wait ${timeLeft} more second(s) before using this command again.`,
          ephemeral: true,
        });
      }
    }
    userCooldowns.set(userId, now);
    setTimeout(() => userCooldowns.delete(userId), COOLDOWN_SECONDS * 1000);

    await interaction.deferReply({ ephemeral: true });

    const hetznerCollection = interaction.client.db.collection(
      appConfig.hetznerCollectionName
    );

    const userConfigCount = await hetznerCollection.countDocuments({
      user_id: interaction.user.id,
    });
    if (userConfigCount >= 10) {
      return interaction.editReply({
        content: ":x: You already have 10 active Hetzner alert configurations.",
        ephemeral: true,
      });
    }

    const configData = {
      user_id: interaction.user.id,
      guild_id: interaction.guildId,
      timestamp: Math.floor(Date.now() / 1000),
      currency: interaction.options.getString("currency") ?? "EUR",
      price: interaction.options.getInteger("price") ?? 0,
      vat_percentage: interaction.options.getInteger("vat_percentage") ?? 0,
      location: interaction.options.getString("location") ?? "All",
      cpu: interaction.options.getString("cpu_type") ?? "Any",
      ram_size: interaction.options.getInteger("ram_size") ?? 0,
      ram_ecc: interaction.options.getBoolean("ram_ecc") ?? false,
      hdd_size: interaction.options.getInteger("drive_size") ?? 0,
      hdd_count: interaction.options.getInteger("drive_count") ?? 0,
      hdd_type: interaction.options.getString("drive_type") ?? "Any",
    };

    Object.keys(configData).forEach((key) => {
      if (
        (configData[key] === "Any" || configData[key] === "All") &&
        key !== "currency"
      ) {
        delete configData[key]; // Don't store "Any" or "All" unless it's the only option
      }
      if (
        (key === "ram_ecc" && configData[key] === false) ||
        (typeof configData[key] === "number" &&
          configData[key] === 0 &&
          !["price", "vat_percentage"].includes(key)) // Don't store 0 for min values unless it's price/vat
      ) {
        // Check if the option was actually provided by the user or if it's a default
        const optionProvided = interaction.options.get(
          key === "cpu_type" ? "cpu_type" : key.replace("_size", "") // hacky for option name
        );
        if (!optionProvided && key !== "price" && key !== "vat_percentage") {
          delete configData[key];
        }
      }
    });
    if (
      configData.currency === "EUR" &&
      !interaction.options.getString("currency")
    )
      delete configData.currency;

    try {
      await hetznerCollection.insertOne(configData);

      const requirementsEmbed = new EmbedBuilder()
        .setTitle("✅ Hetzner Alert Configured!")
        .setColor(0x00ff00)
        .setDescription(
          "I will notify you when a server matching your criteria is found in the Hetzner Server Auction."
        )
        .setFooter({
          text: "Configs are valid for 90 days. Max 10 configs per user.",
        });

      let reqSummary = "";
      if (configData.price > 0) {
        reqSummary += `> Max Price: ${configData.price} ${
          configData.currency ?? "EUR"
        }`;
        if (configData.vat_percentage > 0) {
          reqSummary += ` (incl. ${configData.vat_percentage}% VAT)`;
        }
        reqSummary += "\n";
      }
      if (configData.location && configData.location !== "All")
        reqSummary += `> Location: ${configData.location}\n`;
      if (configData.cpu && configData.cpu !== "Any")
        reqSummary += `> CPU: ${configData.cpu}\n`;
      if (configData.ram_size > 0)
        reqSummary += `> Min RAM: ${configData.ram_size}GB\n`;
      if (configData.ram_ecc) reqSummary += `> RAM must be ECC\n`;
      if (configData.hdd_size > 0)
        reqSummary += `> Min Drive Size: ${configData.hdd_size}GB\n`;
      if (configData.hdd_count > 0)
        reqSummary += `> Min Drive Count: ${configData.hdd_count}\n`;
      if (configData.hdd_type && configData.hdd_type !== "Any")
        reqSummary += `> Drive Type: ${configData.hdd_type}\n`;

      if (reqSummary) {
        requirementsEmbed.addFields({
          name: "Your Criteria",
          value: reqSummary,
        });
      } else {
        requirementsEmbed.addFields({
          name: "Your Criteria",
          value: "Any server (no specific criteria set).",
        });
      }

      await interaction.editReply({ embeds: [requirementsEmbed] });
    } catch (error) {
      console.error("Error saving Hetzner config to DB:", error);
      await interaction.editReply({
        content:
          ":x: There was an error saving your configuration. Please try again.",
        ephemeral: true,
      });
    }
  },
};
