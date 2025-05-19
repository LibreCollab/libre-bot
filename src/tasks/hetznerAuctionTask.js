import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import appConfig from "../config.js";

const HETZNER_USD_URL =
  "https://www.hetzner.com/_resources/app/data/app/live_data_sb_USD.json";
const HETZNER_EUR_URL =
  "https://www.hetzner.com/_resources/app/data/app/live_data_sb_EUR.json";
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.3 Safari/605.1.15";

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatDescription(descriptionArray) {
  if (!Array.isArray(descriptionArray)) return "N/A";
  const longItems = descriptionArray.filter((item) => item.length > 10);
  const shortItems = descriptionArray.filter((item) => item.length <= 10);
  let formatted = "";
  if (longItems.length > 0) {
    formatted += longItems.join("\n") + (shortItems.length > 0 ? "\n" : "");
  }
  if (shortItems.length > 0) {
    formatted += shortItems.join(" - ");
  }
  return formatted || "N/A";
}

export async function checkHetznerAuction(client) {
  if (!client.db || !client.httpClient) {
    console.error("[HetznerTask] DB or HTTP client not initialized.");
    return;
  }
  console.log("[HetznerTask] Checking Hetzner auction...");

  const hetznerCollection = client.db.collection(
    appConfig.hetznerCollectionName
  );
  const notificationChannelId = appConfig.hetznerNotificationsChannelId;

  let notificationChannel;
  try {
    notificationChannel = await client.channels.fetch(notificationChannelId);
    if (!notificationChannel || !notificationChannel.isTextBased()) {
      console.error(
        `[HetznerTask] Notification channel ${notificationChannelId} not found or not text-based.`
      );
      return;
    }
  } catch (error) {
    console.error(
      `[HetznerTask] Error fetching notification channel ${notificationChannelId}:`,
      error
    );
    return;
  }

  const userConfigs = await hetznerCollection.find({}).toArray();
  if (!userConfigs.length) {
    return;
  }

  let usdData, eurData;
  try {
    const usdResponse = await client.httpClient.get(HETZNER_USD_URL, {
      headers: { "User-Agent": USER_AGENT },
    });
    usdData = usdResponse.data;
    await sleep(5000); // Be nice to Hetzner
    const eurResponse = await client.httpClient.get(HETZNER_EUR_URL, {
      headers: { "User-Agent": USER_AGENT },
    });
    eurData = eurResponse.data;
  } catch (error) {
    console.error(
      "[HetznerTask] Error fetching data from Hetzner:",
      error.message
    );
    return;
  }

  const notifiedConfigIds = [];

  for (const config of userConfigs) {
    const currency = config.currency || "EUR";
    const targetData = currency === "USD" ? usdData : eurData;

    if (!targetData || !Array.isArray(targetData.server)) continue;

    const priceLimit = config.price || 0;
    const vatPercentage = config.vat_percentage || 0;
    // Price limit from user is VAT inclusive. Hetzner API price is VAT exclusive.
    // So, calculate the max exclusive price the user is willing to pay.
    const maxExclusivePrice =
      priceLimit > 0 ? priceLimit / (1 + vatPercentage / 100) : 0;

    for (const server of targetData.server) {
      let matches = true;

      // Price check (API price is exclusive of VAT)
      if (
        maxExclusivePrice > 0 &&
        parseFloat(server.price) > maxExclusivePrice
      ) {
        matches = false;
      }
      // Location check
      if (
        matches &&
        config.location &&
        config.location !== "All" &&
        !server.datacenter.includes(config.location)
      ) {
        matches = false;
      }
      // CPU check
      if (
        matches &&
        config.cpu &&
        config.cpu !== "Any" &&
        !server.cpu.toUpperCase().includes(config.cpu.toUpperCase())
      ) {
        matches = false;
      }
      // RAM size check
      if (matches && config.ram_size && server.ram_size < config.ram_size) {
        matches = false;
      }
      // RAM ECC check
      if (matches && config.ram_ecc && !server.is_ecc) {
        // If user wants ECC, server must be ECC
        matches = false;
      }
      // HDD size check
      if (matches && config.hdd_size && server.hdd_size < config.hdd_size) {
        matches = false;
      }
      // HDD count check
      if (matches && config.hdd_count && server.hdd_count < config.hdd_count) {
        matches = false;
      }
      // HDD type check
      if (matches && config.hdd_type && config.hdd_type !== "Any") {
        const diskData = server.serverDiskData || {};
        const typeKey = config.hdd_type.toUpperCase();
        let foundType = false;
        for (const dKey in diskData) {
          if (dKey.toUpperCase().includes(typeKey)) {
            foundType = true;
            break;
          }
        }
        if (!foundType) matches = false;
      }

      if (matches) {
        try {
          const user = await client.users.fetch(config.user_id);
          if (user) {
            const serverPriceWithVat =
              parseFloat(server.price) * (1 + vatPercentage / 100);

            const embed = new EmbedBuilder()
              .setTitle("🎉 Hetzner Server Found!")
              .setColor(0x00ff00)
              .setDescription(
                `A server matching your criteria has been found!\n**${server.name}**`
              )
              .addFields(
                {
                  name: "Price",
                  value: `**${serverPriceWithVat.toFixed(
                    2
                  )} ${currency}** (incl. ${vatPercentage}% VAT)`,
                },
                {
                  name: "Location",
                  value: Array.isArray(server.datacenter)
                    ? server.datacenter.join(", ") || "N/A"
                    : typeof server.datacenter === "string"
                    ? server.datacenter
                    : "N/A",
                  inline: true,
                },
                { name: "CPU", value: server.cpu || "N/A", inline: true },
                {
                  name: "RAM",
                  value: `${server.ram_size} GB (${
                    server.is_ecc ? "ECC" : "Non-ECC"
                  })`,
                  inline: true,
                },
                {
                  name: "Storage",
                  value: (() => {
                    let hddDisplay = server.hdd_hr;
                    if (!hddDisplay && server.hdd_size) {
                      hddDisplay = `${server.hdd_size} GB Total`;
                    }
                    if (!hddDisplay) {
                      hddDisplay = "Details N/A";
                    }
                    return `${hddDisplay} (${
                      server.hdd_count || "Unknown"
                    } drive(s))`;
                  })(),
                  inline: true,
                },
                {
                  name: "Description",
                  value: formatDescription(server.description) || "N/A",
                }
              )
              .setTimestamp();

            const viewButton = new ButtonBuilder()
              .setLabel("View Server")
              .setStyle(ButtonStyle.Link)
              .setURL(
                `https://www.hetzner.com/sb#search=${server.key || server.id}`
              );

            const row = new ActionRowBuilder().addComponents(viewButton);

            await notificationChannel.send({
              content: `${user.toString()}, a server matching your criteria is available!`,
              embeds: [embed],
              components: [row],
            });
            notifiedConfigIds.push(config._id);
          }
        } catch (err) {
          console.error(
            `[HetznerTask] Error notifying user ${config.user_id}:`,
            err
          );
        }
        break;
      }
    }
  }

  // Delete notified configs
  if (notifiedConfigIds.length > 0) {
    try {
      const result = await hetznerCollection.deleteMany({
        _id: { $in: notifiedConfigIds },
      });
      console.log(
        `[HetznerTask] Deleted ${result.deletedCount} notified configs.`
      );
    } catch (error) {
      console.error("[HetznerTask] Error deleting notified configs:", error);
    }
  }

  // Delete configs older than 90 days
  try {
    const ninetyDaysAgo = Math.floor(Date.now() / 1000) - 90 * 24 * 60 * 60;
    const oldConfigsResult = await hetznerCollection.deleteMany({
      timestamp: { $lt: ninetyDaysAgo },
    });
    if (oldConfigsResult.deletedCount > 0) {
      console.log(
        `[HetznerTask] Deleted ${oldConfigsResult.deletedCount} configs older than 90 days.`
      );
    }
  } catch (error) {
    console.error("[HetznerTask] Error deleting old configs:", error);
  }
}
