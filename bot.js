// bot.js
require('dotenv').config();
const { Client, GatewayIntentBits, Partials, PermissionsBitField } = require('discord.js');
const OpenAI = require('openai');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ],
    partials: [Partials.Channel]
});

const openai = new OpenAI.OpenAI({ apiKey: process.env.OPENAI_API_KEY });

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
});

function isMod(member) {
    return member.permissions.has(PermissionsBitField.Flags.KickMembers) ||
           member.permissions.has(PermissionsBitField.Flags.BanMembers) ||
           member.permissions.has(PermissionsBitField.Flags.Administrator);
}

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const content = message.content;

    // Server management commands
    if (content.startsWith('!kick') || content.startsWith('!ban') || content.startsWith('!purge')) {
        if (!message.guild) return;
        if (!isMod(message.member)) {
            message.reply("You don't have permission to use this command.");
            return;
        }

        if (content.startsWith('!kick')) {
            const member = message.mentions.members.first();
            if (member) {
                const reason = content.split(' ').slice(2).join(' ') || 'No reason provided';
                member.kick(reason)
                    .then(() => message.reply(`Kicked ${member.user.tag}.`))
                    .catch(err => message.reply(`Failed: ${err}`));
            }
        }

        if (content.startsWith('!ban')) {
            const member = message.mentions.members.first();
            if (member) {
                const reason = content.split(' ').slice(2).join(' ') || 'No reason provided';
                member.ban({ reason })
                    .then(() => message.reply(`Banned ${member.user.tag}.`))
                    .catch(err => message.reply(`Failed: ${err}`));
            }
        }

        if (content.startsWith('!purge')) {
            const amount = parseInt(content.split(' ')[1]) || 10;
            message.channel.bulkDelete(amount, true)
                .then(() => message.reply(`Deleted ${amount} messages.`))
                .catch(err => message.reply(`Failed: ${err}`));
        }
    }

    // NSFW image fetch
    if (content.startsWith('!nsfw')) {
        if (message.channel.type !== 1 && !message.channel.nsfw) {
            message.reply("NSFW commands only work in NSFW channels or DMs.");
            return;
        }

        const search = content.split(' ').slice(1).join(' ') || 'anime';
        const url = `https://api.waifu.pics/nsfw/${encodeURIComponent(search)}`;
        try {
            const res = await fetch(url);
            const data = await res.json();
            message.reply({ content: data.url });
        } catch (err) {
            message.reply("Failed to fetch NSFW content.");
        }
    }

    // AI chat
    if (content.startsWith('!jarvis')) {
        const prompt = content.replace('!jarvis', '').trim();
        if (!prompt) return message.reply("Please provide a prompt.");

        try {
            const response = await openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [{ role: "user", content: prompt }]
            });
            message.reply(response.choices[0].message.content);
        } catch (err) {
            message.reply("AI failed to respond.");
            console.error(err);
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
