require("dotenv").config();
const { Client, GatewayIntentBits, PermissionsBitField } = require("discord.js");
const { OpenAI } = require("openai");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ]
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

client.once("ready", () => {
  console.log(`🟢 Jarvis online as ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const isDM = message.channel.type === 1;
  const isNSFW = message.channel.nsfw;

  // 🧠 AI CHAT
  if (message.content.startsWith("!jarvis")) {
    const prompt = message.content.replace("!jarvis", "").trim();
    if (!prompt) return message.reply("Say something.");

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }]
      });

      message.reply(response.choices[0].message.content);
    } catch {
      message.reply("AI error.");
    }
  }

  // 🔞 NSFW LINKS
  if (message.content === "!nsfw") {
    if (!isDM && !isNSFW) {
      return message.reply("❌ NSFW only allowed in NSFW channels or DMs.");
    }

    const links = [
      "https://example-nsfw-site.com/image1",
      "https://example-nsfw-site.com/image2"
    ];

    const random = links[Math.floor(Math.random() * links.length)];
    message.reply(random);
  }

  // 🛡️ KICK
  if (message.content.startsWith("!kick")) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers))
      return message.reply("No permission.");

    const user = message.mentions.members.first();
    if (!user) return message.reply("Mention a user.");

    await user.kick();
    message.reply("User kicked.");
  }

  // 🚫 BAN
  if (message.content.startsWith("!ban")) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers))
      return message.reply("No permission.");

    const user = message.mentions.members.first();
    if (!user) return message.reply("Mention a user.");

    await user.ban();
    message.reply("User banned.");
  }

  // 🧹 PURGE
  if (message.content.startsWith("!purge")) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages))
      return message.reply("No permission.");

    const amount = parseInt(message.content.split(" ")[1]);
    if (!amount) return message.reply("Number required.");

    await message.channel.bulkDelete(amount, true);
    message.reply(`Deleted ${amount} messages.`);
  }
});

client.login(process.env.DISCORD_TOKEN);
