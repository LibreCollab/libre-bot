import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with Pong! and shows latency.'),
  async execute(interaction) {
    await interaction.deferReply();

    const websocketHeartbeat = interaction.client.ws.ping;
    const roundtripLatency = Date.now() - interaction.createdTimestamp;

    await interaction.editReply(
      `Pong! 🏓\nRoundtrip latency: ${roundtripLatency}ms\nWebSocket heartbeat: ${websocketHeartbeat}ms`,
    );
  },
};
