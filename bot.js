require('dotenv').config(); // Load environment variables
const { Client, GatewayIntentBits } = require('discord.js');
const OpenAI = require('openai');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ],
    partials: ['CHANNEL'] // Needed to receive DMs
});

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('messageCreate', async (message) => {
    // Ignore bot messages
    if (message.author.bot) return;

    // Check if DM
    const isDM = message.channel.type === 1; // 1 = DM
    const isServer = message.channel.type === 0; // 0 = Guild text channel

    // Only respond in NSFW channels for servers
    if (isServer && !message.channel.nsfw) return;

    // Command for server: !jarvis <message>
    if (isDM || (isServer && message.content.startsWith('!jarvis'))) {
        const prompt = isDM ? message.content : message.content.replace('!jarvis', '');

        try {
            const response = await openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: prompt }]
            });

            await message.channel.send(response.choices[0].message.content);
        } catch (err) {
            console.error('Error from OpenAI:', err);
            message.channel.send("Sorry, I couldn't process that.");
        }
    }

    // Example: Pull image from web (NSFW or SFW)
    // You can trigger this with a command like !image <search>
    if (message.content.startsWith('!image')) {
        const query = message.content.replace('!image', '').trim();
        if (!query) return message.channel.send('Please give me something to search for!');

        try {
            const url = `https://source.unsplash.com/600x400/?${encodeURIComponent(query)}`;
            await message.channel.send({ content: url });
        } catch (err) {
            console.error('Image error:', err);
            message.channel.send("Couldn't fetch an image.");
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
