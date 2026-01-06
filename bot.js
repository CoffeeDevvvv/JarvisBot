// bot.js

require('dotenv').config(); // loads .env variables
const { Client, GatewayIntentBits, PermissionsBitField } = require('discord.js');
const { OpenAI } = require('openai');
const fetch = require('node-fetch'); // for getting NSFW images

// Create Discord client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ],
    partials: ['CHANNEL'] // needed to read DMs
});

// Connect to OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// When bot is ready
client.once('clientReady', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

// Listen to messages
client.on('messageCreate', async (message) => {
    if (message.author.bot) return; // ignore bots

    // ---- AI chat ----
    if (message.content.startsWith('!jarvis')) {
        const prompt = message.content.replace('!jarvis', '').trim();
        if (!prompt) return message.reply("You need to ask me something!");

        try {
            const response = await openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [{ role: "user", content: prompt }]
            });

            message.reply(response.choices[0].message.content);
        } catch (err) {
            console.error(err);
            message.reply("Oops! Something went wrong with the AI.");
        }
    }

    // ---- NSFW Images (from web) ----
    if (message.content.startsWith('!nsfw')) {
        // Only allow in DMs or NSFW channels
        if (message.channel.type === 1 || message.channel.nsfw) {
            // Example: pull from public API (replace with any safe NSFW API)
            const url = "https://nekobot.xyz/api/image?type=lewd"; // sample NSFW API
            try {
                const res = await fetch(url);
                const data = await res.json();
                message.reply({ content: data.message });
            } catch (err) {
                console.error(err);
                message.reply("Couldn't fetch NSFW image.");
            }
        } else {
            message.reply("NSFW content only works in DMs or NSFW channels.");
        }
    }

    // ---- Server moderation ----
    if (message.guild) {
        const member = message.member;

        // Kick command
        if (message.content.startsWith('!kick')) {
            if (!member.permissions.has(PermissionsBitField.Flags.KickMembers))
                return message.reply("You don't have permission to kick!");

            const user = message.mentions.members.first();
            if (!user) return message.reply("Mention someone to kick!");
            const reason = message.content.split(' ').slice(2).join(' ') || "No reason provided";
            user.kick(reason)
                .then(() => message.reply(`${user.user.tag} was kicked!`))
                .catch(err => message.reply("Couldn't kick user."));
        }

        // Ban command
        if (message.content.startsWith('!ban')) {
            if (!member.permissions.has(PermissionsBitField.Flags.BanMembers))
                return message.reply("You don't have permission to ban!");

            const user = message.mentions.members.first();
            if (!user) return message.reply("Mention someone to ban!");
            const reason = message.content.split(' ').slice(2).join(' ') || "No reason provided";
            user.ban({ reason })
                .then(() => message.reply(`${user.user.tag} was banned!`))
                .catch(err => message.reply("Couldn't ban user."));
        }

        // Purge command
        if (message.content.startsWith('!purge')) {
            if (!member.permissions.has(PermissionsBitField.Flags.ManageMessages))
                return message.reply("You don't have permission to purge messages!");

            const count = parseInt(message.content.split(' ')[1]);
            if (!count || count < 1 || count > 100) return message.reply("Enter a number between 1 and 100.");

            message.channel.bulkDelete(count, true)
                .then(() => message.reply(`Deleted ${count} messages.`))
                .catch(err => message.reply("Couldn't delete messages."));
        }
    }
});

// Login
client.login(process.env.DISCORD_TOKEN);
