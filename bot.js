// bot.js
import 'dotenv/config';
import { Client, GatewayIntentBits, PermissionsBitField } from 'discord.js';
import OpenAI from 'openai';
import fetch from 'node-fetch';

// ======================
// DISCORD CLIENT
// ======================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],
  partials: ['CHANNEL']
});

// ======================
// OPENAI CLIENT
// ======================
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// ======================
// MOD CHECK
// ======================
function isMod(member) {
  return (
    member.permissions.has(PermissionsBitField.Flags.Administrator) ||
    member.permissions.has(PermissionsBitField.Flags.KickMembers)
  );
}

// ======================
// READY
// ======================
client.on('clientReady', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

// ======================
// MESSAGE HANDLER
// ======================
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // 🔍 DEBUG LOG (VERY IMPORTANT)
  console.log(
    `MSG | DM:${message.channel.type === 1} | ${message.author.tag}: ${message.content}`
  );

  const isDM = message.channel.type === 1;
  const content = message.content;

  // ======================
  // DM TEST RESPONSE
  // ======================
  if (isDM) {
    await message.reply('✅ I received your DM.');
  }

  // ======================
  // AI CHAT (DM OR !jarvis)
  // ======================
  if (!isDM && !content.startsWith('!jarvis')) return;

  const prompt = isDM
    ? content
    : content.replace('!jarvis', '').trim();

  if (!prompt) return;

  try {
    await message.channel.sendTyping();

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are Jarvis, a helpful AI assistant.' },
        { role: 'user', content: prompt }
      ]
    });

    await message.reply(response.choices[0].message.content);
  } catch (err) {
    console.error('OpenAI error:', err);
    await message.reply('⚠️ Error talking to AI.');
  }

  // ======================
  // NSFW COMMAND
  // ======================
  if (content.startsWith('!nsfw')) {
    if (!isDM && !message.channel.nsfw) {
      return message.reply('NSFW only works in NSFW channels or DMs.');
    }

    try {
      const res = await fetch('https://api.waifu.pics/nsfw/waifu');
      const data = await res.json();
      await message.reply(data.url);
    } catch {
      await message.reply('Failed to fetch image.');
    }
  }

  // ======================
  // MOD COMMANDS
  // ======================
  if (!message.guild) return;

  const args = content.split(/ +/);
  const cmd = args.shift().toLowerCase();

  if (cmd === '!kick' && isMod(message.member)) {
    const member = message.mentions.members.first();
    if (!member) return message.reply('Mention someone to kick.');
    await member.kick();
    await message.reply(`👢 Kicked ${member.user.tag}`);
  }

  if (cmd === '!ban' && isMod(message.member)) {
    const member = message.mentions.members.first();
    if (!member) return message.reply('Mention someone to ban.');
    await member.ban();
    await message.reply(`🔨 Banned ${member.user.tag}`);
  }

  if (cmd === '!purge' && isMod(message.member)) {
    const amount = parseInt(args[0]);
    if (!amount || amount < 1 || amount > 100) {
      return message.reply('Use 1–100.');
    }
    await message.channel.bulkDelete(amount + 1, true);
    await message.reply(`🧹 Deleted ${amount} messages.`);
  }
});

// ======================
// LOGIN
// ======================
client.login(process.env.DISCORD_TOKEN);
