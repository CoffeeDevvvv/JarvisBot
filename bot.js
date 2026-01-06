require('dotenv').config(); // Loads variables from .env
const { Client, GatewayIntentBits } = require('discord.js');
const OpenAI = require('openai');
const fetch = require('node-fetch'); // For pulling images from the web

// Create Discord client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ],
    partials: ['CHANNEL'] // Needed to receive DMs
});

// Create OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// When bot is ready
client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
});

// Command handler
client.on('messageCreate', async message => {
    if (message.author.bot) return;

    // ========== AI Chat ==========
    if (message.content.startsWith('!jarvis')) {
        const prompt = message.content.replace('!jarvis', '').trim();
        if (!prompt) return;

        try {
            const response = await openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [{ role: "user", content: prompt }]
            });

            message.reply(response.choices[0].message.content);
        } catch (err) {
            console.error(err);
            message.reply("Sorry, something went wrong with the AI.");
        }
    }

    // ========== Server Management ==========
    if (message.guild) { // Only run in servers
        const isMod = message.member.permissions.has("BAN_MEMBERS");

        // Kick
        if (message.content.startsWith('!kick') && isMod) {
            const member = message.mentions.members.first();
            if (member) {
                const reason = message.content.split(' ').slice(2).join(' ') || 'No reason provided';
                member.kick(reason).catch(console.error);
                message.reply(`${member.user.tag} was kicked. Reason: ${reason}`);
            }
        }

        // Ban
        if (message.content.startsWith('!ban') && isMod) {
            const member = message.mentions.members.first();
            if (member) {
                const reason = message.content.split(' ').slice(2).join(' ') || 'No reason provided';
                member.ban({ reason }).catch(console.error);
                message.reply(`${member.user.tag} was banned. Reason: ${reason}`);
            }
        }

        // Purge messages
        if (message.content.startsWith('!purge') && isMod) {
            const args = message.content.split(' ');
            const deleteCount = parseInt(args[1], 10);
            if (!deleteCount || deleteCount < 1 || deleteCount > 100) return message.reply("Enter a number between 1 and 100.");
            message.channel.bulkDelete(deleteCount + 1, true).catch(console.error);
        }
    }

    // ========== NSFW Images ==========
    if ((message.channel.nsfw || message.channel.type === 'DM') && message.content.startsWith('!nsfw')) {
        const query = message.content.replace('!nsfw', '').trim();
        if (!query) return;

        try {
            const searchUrl = `https://api.waifu.im/search/?included_tags=${encodeURIComponent(query)}&is_nsfw=true`;
            const res = await fetch(searchUrl);
            const data = await res.json();

            if (data.images && data.images.length > 0) {
                message.reply({ content: data.images[0].url });
            } else {
                message.reply("No NSFW image found for that query.");
            }
        } catch (err) {
            console.error(err);
            message.reply("Error fetching NSFW image.");
        }
    }
});

// Login to Discord
client.login(process.env.DISCORD_TOKEN);
