require('dotenv').config();
const { Client, GatewayIntentBits, PermissionsBitField } = require('discord.js');
const { OpenAI } = require('openai');

// Dynamic import for node-fetch
let fetch;
(async () => { fetch = (await import('node-fetch')).default; })();

// Discord client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ],
    partials: ['CHANNEL'] // Allows DMs to work
});

// OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Bot ready
client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

// Message handling
client.on('messageCreate', async message => {
    if (message.author.bot) return;

    // AI chat
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
            message.reply("AI error!");
        }
    }

    // Server management
    if (message.content.startsWith('!kick') || message.content.startsWith('!ban') || message.content.startsWith('!purge')) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers) &&
            !message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
            return message.reply("No permission!");
        }

        if (message.content.startsWith('!kick')) {
            const member = message.mentions.members.first();
            if (member) member.kick();
            message.reply("User kicked!");
        }

        if (message.content.startsWith('!ban')) {
            const member = message.mentions.members.first();
            if (member) member.ban();
            message.reply("User banned!");
        }

        if (message.content.startsWith('!purge')) {
            const count = parseInt(message.content.split(' ')[1]) || 1;
            message.channel.bulkDelete(count + 1);
            message.reply(`Deleted ${count} messages!`);
        }
    }

    // NSFW images (example pulling from web)
    if ((message.channel.nsfw || message.channel.type === 1) && message.content.startsWith('!nsfw')) {
        const searchTerm = message.content.replace('!nsfw', '').trim() || "anime";
        const url = `https://api.waifu.pics/nsfw/${searchTerm}`;
        try {
            const res = await fetch(url);
            const data = await res.json();
            message.reply({ content: data.url });
        } catch (err) {
            console.error(err);
            message.reply("Could not fetch NSFW image!");
        }
    }
});

// Login
client.login(process.env.DISCORD_TOKEN);
