// bot.js
import 'dotenv/config'; // Loads environment variables from Railway
import { Client, GatewayIntentBits, PermissionsBitField } from 'discord.js';
import OpenAI from 'openai';
import fetch from 'node-fetch'; // For NSFW image links

// Initialize Discord bot
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],
  partials: ['CHANNEL'] // Needed for DMs
});

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Helper to check mod/admin
function isMod(member) {
  return member.permissions.has(PermissionsBitField.Flags.Administrator) || 
         member.permissions.has(PermissionsBitField.Flags.KickMembers);
}

// On bot ready
client.on('clientReady', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

// Message handler
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const content = message.content;

  // ========================
  // AI Chat in DMs or !jarvis
  // ========================
  if (message.channel.type === 1 || content.startsWith('!jarvis')) { // DM or command
    const prompt = content.replace('!jarvis', '').trim();
    if (!prompt) return;

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }]
      });
      await message.reply(response.choices[0].message.content);
    } catch (err) {
      console.error('OpenAI error:', err);
      message.reply('Error: Could not get response from AI.');
    }
  }

  // ========================
  // NSFW Image Command
  // ========================
  if (content.startsWith('!nsfw')) {
    const channel = message.channel;

    // Check if in server and NSFW channel, or DM
    if (channel.type === 0 && !channel.nsfw) {
      return message.reply('NSFW content is only allowed in NSFW-marked channels.');
    }

    // Fetch random NSFW image from web API
    try {
      const res = await fetch('https://api.waifu.pics/nsfw/waifu');
      const data = await res.json();
      await message.reply(data.url);
    } catch (err) {
      console.error(err);
      message.reply('Could not fetch NSFW image.');
    }
  }

  // ========================
  // Server management commands
  // ========================
  if (!message.guild) return; // Skip if DM

  const args = content.trim().split(/ +/);
  const cmd = args.shift().toLowerCase();

  if (cmd === '!kick' && isMod(message.member)) {
    const member = message.mentions.members.first();
    if (!member) return message.reply('Please mention a user to kick.');
    const reason = args.join(' ') || 'No reason provided';
    member.kick(reason)
      .then(() => message.reply(`Kicked ${member.user.tag}`))
      .catch(err => message.reply('Failed to kick user.'));
  }

  if (cmd === '!ban' && isMod(message.member)) {
    const member = message.mentions.members.first();
    if (!member) return message.reply('Please mention a user to ban.');
    const reason = args.join(' ') || 'No reason provided';
    member.ban({ reason })
      .then(() => message.reply(`Banned ${member.user.tag}`))
      .catch(err => message.reply('Failed to ban user.'));
  }

  if (cmd === '!purge' && isMod(message.member)) {
    const amount = parseInt(args[0]);
    if (!amount || amount < 1 || amount > 100)
      return message.reply('Provide a number between 1 and 100.');
    message.channel.bulkDelete(amount + 1, true)
      .then(() => message.reply(`Deleted ${amount} messages.`))
      .catch(err => message.reply('Failed to purge messages.'));
  }
});

// Login to Discord
client.login(process.env.DISCORD_TOKEN);
