// Load environment variables
import 'dotenv/config';
import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { OpenAI } from 'openai';
import fetch from 'node-fetch';

// Create Discord client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ],
    partials: [Partials.Channel] // Needed for DMs
});

// OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Bot ready
client.once('clientReady', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

// Handle messages
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    // ----- AI chat in DMs -----
    if (message.channel.type === 1 || message.channel.type === 'DM') {
        try {
            const response = await openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [{ role: "user", content: message.content }]
            });
            await message.reply(response.choices[0].message.content);
        } catch (err) {
            console.error('OpenAI error:', err);
        }
        return;
    }

    // ----- AI chat in server -----
    if (message.content.startsWith('!jarvis')) {
        const prompt = message.content.replace('!jarvis', '').trim();
        try {
            const response = await openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [{ role: "user", content: prompt }]
            });
            await message.reply(response.choices[0].message.content);
        } catch (err) {
            console.error('OpenAI error:', err);
        }
    }

    // ----- Simple server management (kick/ban) -----
    if (message.guild && message.member.permissions.has('KickMembers')) {
        if (message.content.startsWith('!kick')) {
            const user = message.mentions.members.first();
            if (user) {
                await user.kick();
                message.channel.send(`${user.user.tag} has been kicked!`);
            }
        }
        if (message.content.startsWith('!ban')) {
            const user = message.mentions.members.first();
            if (user) {
                await user.ban();
                message.channel.send(`${user.user.tag} has been banned!`);
            }
        }
        if (message.content.startsWith('!purge')) {
            const count = parseInt(message.content.split(' ')[1]) || 1;
            const messagesToDelete = await message.channel.messages.fetch({ limit: count + 1 });
            await message.channel.bulkDelete(messagesToDelete);
            message.channel.send(`Deleted ${count} messages`).then(msg => setTimeout(() => msg.delete(), 5000));
        }
    }
});

// Log in
client.login(process.env.DISCORD_TOKEN);
