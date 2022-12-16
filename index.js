import { ChatGPTAPIBrowser } from "chatgpt";
import { Client, Events, GatewayIntentBits } from "discord.js";
import * as dotenv from "dotenv";

dotenv.config();

const listenChannelIds = process.env.DISCORD_LISTEN_CHANNEL_IDS.split(",");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

(async () => {
  // use puppeteer to bypass cloudflare (headful because of captchas)
  const api = new ChatGPTAPIBrowser({
    email: process.env.OPENAI_EMAIL,
    password: process.env.OPENAI_PASSWORD,
  });

  await api.init();

  async function askChatGPT(query) {
    return await api.sendMessage(query);
  }

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.DirectMessages,
    ],
  });

  client.once(Events.ClientReady, (c) => {
    console.log(`Ready! Logged in as ${c.user.tag}`);
  });

  client.on(Events.MessageCreate, async (message) => {
    if (
      !listenChannelIds.includes(message.channelId) ||
      !message.mentions.has(client.user)
    ) {
      return;
    }
    const query = message.content
      .replace(client.user, "")
      .replace(/^\s+/gm, "");
    if (query === "reset") {
      api.resetThread();
      await message.react("🔄");
      return;
    }
    console.log(`${message.author.username}: ${query}`);
    await message.react("💭");
    try {
      const response = await askChatGPT(query);
      console.log(`${client.user.username}: ${response}`);
      await message.reply(response);
    } catch (e) {
      await message.react("💩");
      console.error(e);
    }
    await message.reactions.cache.get("💭").remove();
  });

  client.login(process.env.DISCORD_TOKEN);
})();
