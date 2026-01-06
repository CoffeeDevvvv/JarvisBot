import 'dotenv/config';
import {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  ChannelType
} from 'discord.js';
import OpenAI from 'openai';
import fetch from 'node-fetch';

// Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],
  partials: ['CHANNEL']
});

// OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Mod check
function isMod(member) {
  return member.permissions.has(PermissionsBitField.Flags.Administrator) ||
         member.permissions.has(PermissionsBitField.Flags.KickMembers);
}

// Ready
client.once('clientReady', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

// Messages
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  console.log(
    `MSG | DM:${message.channel.type === ChannelType.DM} | ${message.author.tag}: ${message.content}`
  );

  const content = message.content;

  // ========================
  // DM AI CHAT
  // ========================
  if (message.channel.type === ChannelType.DM) {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content }]
      });

      return message.reply(response.choices[0].message.content);
    } catch (err) {
      console.error(err);
      return message.reply('❌ AI error.');
    }
  }

  // ========================
  // !jarvis command
  // ========================
  if (content.startsWith('!jarvis')) {
    const prompt = content.replace('!jarvis', '').trim();
    if (!prompt) return;

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }]
      });

      return message.reply(response.choices[0].message.content);
    } catch (err) {
      console.error(err);
      return message.reply('❌ AI error.');
    }
  }

  // ========================
  // NSFW
  // ========================
  if (content.startsWith('!nsfw')) {
    if (message.channel.type !== ChannelType.DM && !message.channel.nsfw) {
      return message.reply('❌ NSFW channels only.');
    }

    try {
      const res = await fetch('https://api.waifu.pics/nsfw/waifu');
      const data = await res.json();
      return message.reply(data.url);
    } catch {
      return message.reply('❌ Failed to fetch image.');
    }
  }

  // ========================
  // MOD COMMANDS
  // ========================
  if (!message.guild) return;

  const args = content.split(/ +/);
  const cmd = args.shift()?.toLowerCase();

  if (cmd === '!kick' && isMod(message.member)) {
    const member = message.mentions.members.first();
    if (!member) return message.reply('Mention a user.');
    await member.kick();
    message.reply(`✅ Kicked ${member.user.tag}`);
  }

  if (cmd === '!ban' && isMod(message.member)) {
    const member = message.mentions.members.first();
    if (!member) return message.reply('Mention a user.');
    await member.ban();
    message.reply(`✅ Banned ${member.user.tag}`);
  }

  if (cmd === '!purge' && isMod(message.member)) {
    const amount = parseInt(args[0]);
    if (!amount || amount < 1 || amount > 100) return;
    await message.channel.bulkDelete(amount, true);
    message.reply(`✅ Deleted ${amount} messages.`);
  }
});

// Login
client.login(process.env.DISCORD_TOKEN);
