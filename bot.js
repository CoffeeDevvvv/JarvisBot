require('dotenv').config(); // Loads your .env
const { Client, GatewayIntentBits, Partials, PermissionsBitField } = require('discord.js');
const { OpenAI } = require('openai');
const fetch = require('node-fetch'); // v2 version

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ],
    partials: [Partials.Channel] // Allows DMs
});

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Ready Event
client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
});

// Message Event
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const isNSFW = message.channel.nsfw || message.channel.type === 'DM';

    // ---- AI Chat ----
    if (message.content.startsWith('!jarvis')) {
        const prompt = message.content.replace('!jarvis', '').trim();

        if (!prompt) return message.reply("Please give me something to respond to!");

        try {
            const response = await openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [{ role: "user", content: prompt }]
            });
            message.reply(response.choices[0].message.content);
        } catch (err) {
            console.error(err);
            message.reply("Error contacting AI.");
        }
    }

    // ---- NSFW Image ----
    if (message.content.startsWith('!nsfw')) {
        if (!isNSFW) return message.reply("NSFW commands only allowed in NSFW channels or DMs.");

        // Example: pull a random image from the web (safe placeholder)
        const imageUrl = 'https://placekitten.com/400/300'; // Replace with your source
        message.reply({ content: "Here's something for you:", files: [imageUrl] });
    }

    // ---- Server Management ----
    if (message.content.startsWith('!kick')) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers)) return message.reply("You can't kick people!");
        const member = message.mentions.members.first();
        if (!member) return message.reply("Please mention someone to kick.");
        member.kick().then(() => message.reply(`${member.user.tag} was kicked.`));
    }

    if (message.content.startsWith('!ban')) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) return message.reply("You can't ban people!");
        const member = message.mentions.members.first();
        if (!member) return message.reply("Please mention someone to ban.");
        member.ban().then(() => message.reply(`${member.user.tag} was banned.`));
    }

    if (message.content.startsWith('!purge')) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) return message.reply("You can't delete messages!");
        const args = message.content.split(' ').slice(1);
        const count = parseInt(args[0]);
        if (!count || count < 1 || count > 100) return message.reply("Please specify a number between 1-100.");
        message.channel.bulkDelete(count + 1).then(() => message.reply(`Deleted ${count} messages.`));
    }
});

// Login
client.login(process.env.DISCORD_TOKEN);
