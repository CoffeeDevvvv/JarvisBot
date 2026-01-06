import 'dotenv/config';
import { Client, GatewayIntentBits, PermissionsBitField, ChannelType } from 'discord.js';
import OpenAI from 'openai';

// --------------------
// Discord Client
// --------------------
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],
  partials: ['CHANNEL']
});

// --------------------
// OpenAI
// --------------------
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// --------------------
// Helpers
// --------------------
function isMod(member) {
  return (
    member.permissions.has(PermissionsBitField.Flags.Administrator) ||
    member.permissions.has(PermissionsBitField.Flags.KickMembers)
  );
}

// --------------------
// Bot Ready
// --------------------
client.once('clientReady', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

// --------------------
// Message Handler
// --------------------
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const content = message.content.trim();

  // =========================
  // AI CHAT (DMs + !jarvis)
  // =========================
  const isDM = message.channel.type === ChannelType.DM;

  if (isDM || content.startsWith('!jarvis')) {
    const prompt = isDM
      ? content
      : content.replace('!jarvis', '').trim();

    if (!prompt) return;

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }]
      });

      await message.reply(response.choices[0].message.content);
    } catch (err) {
      console.error('OpenAI error:', err);
      await message.reply('⚠️ AI is unavailable right now.');
    }
  }

  // =========================
  // NSFW IMAGE COMMAND
  // =========================
  if (content === '!nsfw') {
    if (!isDM && !message.channel.nsfw) {
      return message.reply('🔞 This command only works in NSFW channels.');
    }

    try {
      const res = await fetch('https://api.waifu.pics/nsfw/waifu');
      const data = await res.json();
      await message.reply(data.url);
    } catch {
      await message.reply('⚠️ Could not fetch image.');
    }
  }

  // =========================
  // SERVER MOD COMMANDS
  // =========================
  if (!message.guild) return;

  const args = content.split(/\s+/);
  const cmd = args.shift()?.toLowerCase();

  if (cmd === '!kick' && isMod(message.member)) {
    const member = message.mentions.members.first();
    if (!member) return message.reply('Mention a user.');
    await member.kick(args.join(' ') || 'No reason');
    message.reply(`👢 Kicked ${member.user.tag}`);
  }

  if (cmd === '!ban' && isMod(message.member)) {
    const member = message.mentions.members.first();
    if (!member) return message.reply('Mention a user.');
    await member.ban({ reason: args.join(' ') || 'No reason' });
    message.reply(`🔨 Banned ${member.user.tag}`);
  }

  if (cmd === '!purge' && isMod(message.member)) {
    const amount = Number(args[0]);
    if (!amount || amount < 1 || amount > 100) {
      return message.reply('Use a number 1–100.');
    }
    await message.channel.bulkDelete(amount + 1, true);
    message.reply(`🧹 Deleted ${amount} messages.`);
  }
});

// --------------------
// Keep Railway Alive
// --------------------
setInterval(() => {
  console.log('Jarvis is alive');
}, 300000);

// --------------------
// Login
// --------------------
client.login(process.env.DISCORD_TOKEN);
