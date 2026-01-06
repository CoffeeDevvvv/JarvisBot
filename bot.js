// bot.js
import 'dotenv/config'; // loads .env variables
import { Client, GatewayIntentBits } from 'discord.js';
import OpenAI from 'openai';
import fetch from 'node-fetch'; // using ES Module import
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Discord client setup
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent
    ] 
});

// OpenAI setup
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Bot ready event
client.once('clientReady', () => {
    console.log(`Logged in as ${client.user.tag}`);
});

// Message event
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    // AI chat in DMs or with !jarvis in server
    if (message.channel.type === 1 || message.content.startsWith('!jarvis')) { 
        const prompt = message.channel.type === 1 ? message.content : message.content.replace('!jarvis', '');
        
        try {
            const response = await openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [{ role: "user", content: prompt }]
            });
            
            message.reply(response.choices[0].message.content);
        } catch (err) {
            console.error(err);
            message.reply("⚠️ Sorry, I couldn't process that request.");
        }
    }

    // Server management commands
    if (message.guild) {
        const args = message.content.trim().split(/ +/);
        const command = args.shift().toLowerCase();

        // Permission check
        const member = message.member;
        if (!member.permissions.has('ModerateMembers') && !member.permissions.has('BanMembers')) return;

        if (command === '!kick') {
            const user = message.mentions.members.first();
            const reason = args.slice(1).join(' ') || "No reason provided";
            if (user) user.kick(reason).then(() => message.reply(`Kicked ${user.user.tag}`));
        }

        if (command === '!ban') {
            const user = message.mentions.members.first();
            const reason = args.slice(1).join(' ') || "No reason provided";
            if (user) user.ban({ reason }).then(() => message.reply(`Banned ${user.user.tag}`));
        }

        if (command === '!purge') {
            const amount = parseInt(args[0]);
            if (!isNaN(amount) && amount > 0 && amount <= 100) {
                message.channel.bulkDelete(amount + 1);
            } else {
                message.reply("Please provide a number between 1 and 100");
            }
        }
    }
});

// Login
client.login(process.env.DISCORD_TOKEN);
