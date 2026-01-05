require('dotenv').config();
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const { OpenAI } = require('openai');
const fetch = require('node-fetch');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ],
    partials: [Partials.Channel]
});

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Helper: check if channel is NSFW
function isNSFWChannel(channel) {
    return channel.nsfw || channel.type === 1; // 1 = DM
}

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
});

// Listen to messages
client.on('messageCreate', async message => {
    if (message.author.bot) return;

    const content = message.content;

    // ----- AI Chat -----
    if (content.startsWith('!jarvis') || message.channel.type === 1) { // DM
        const prompt = content.startsWith('!jarvis') ? content.replace('!jarvis', '') : content;
        try {
            const response = await openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [{ role: "user", content: prompt }]
            });
            await message.reply(response.choices[0].message.content);
        } catch (err) {
            console.error(err);
            message.reply("Oops, something went wrong with the AI.");
        }
    }

    // ----- Moderation -----
    const args = content.split(' ');
    if (args[0] === '!kick') {
        if (!message.member.permissions.has('KickMembers')) return message.reply("You can't do that!");
        const member = message.mentions.members.first();
        if (member) member.kick(args.slice(2).join(' ') || 'No reason provided').catch(console.error);
    }

    if (args[0] === '!ban') {
        if (!message.member.permissions.has('BanMembers')) return message.reply("You can't do that!");
        const member = message.mentions.members.first();
        if (member) member.ban({ reason: args.slice(2).join(' ') || 'No reason provided' }).catch(console.error);
    }

    if (args[0] === '!purge') {
        if (!message.member.permissions.has('ManageMessages')) return message.reply("You can't do that!");
        const amount = parseInt(args[1]);
        if (!amount || amount < 1 || amount > 100) return message.reply("Enter a number between 1-100");
        message.channel.bulkDelete(amount, true).catch(console.error);
    }

    // ----- NSFW Image -----
    if (args[0] === '!nsfw') {
        if (!isNSFWChannel(message.channel)) return message.reply("NSFW content only allowed in NSFW channels or DMs.");
        try {
            // Pull random NSFW image from a free API (example: nekos.life)
            const res = await fetch('https://nekos.life/api/v2/img/anal'); // Example NSFW endpoint
            const data = await res.json();
            message.reply(data.url);
        } catch (err) {
            console.error(err);
            message.reply("Couldn't fetch NSFW image.");
        }
    }
});

// Login using your Discord bot token
client.login(process.env.DISCORD_TOKEN);
