import 'dotenv/config';
import { Client, GatewayIntentBits, PermissionsBitField, ChannelType } from 'discord.js';
import OpenAI from 'openai';
import fetch from 'node-fetch';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ],
    partials: ['CHANNEL']
});

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

function isMod(member) {
    return member.permissions.has(PermissionsBitField.Flags.Administrator) ||
           member.permissions.has(PermissionsBitField.Flags.KickMembers);
}

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    const content = message.content;

    // AI chat in DMs or !jarvis command
    if (message.channel.type === ChannelType.DM || content.startsWith('!jarvis')) {
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

    // NSFW images
    if (content.startsWith('!nsfw')) {
        const channel = message.channel;
        if (channel.type === ChannelType.GuildText && !channel.nsfw) {
            return message.reply('NSFW content is only allowed in NSFW-marked channels.');
        }
        try {
            const res = await fetch('https://api.waifu.pics/nsfw/waifu');
            const data = await res.json();
            await message.reply(data.url);
        } catch (err) {
            console.error(err);
            message.reply('Could not fetch NSFW image.');
        }
    }

    // Server management
    if (!message.guild) return;

    const args = content.trim().split(/ +/);
    const cmd = args.shift().toLowerCase();

    if (cmd === '!kick' && isMod(message.member)) {
        const member = message.mentions.members.first();
        if (!member) return message.reply('Please mention a user to kick.');
        const reason = args.join(' ') || 'No reason provided';
        member.kick(reason)
            .then(() => message.reply(`Kicked ${member.user.tag}`))
            .catch(() => message.reply('Failed to kick user.'));
    }

    if (cmd === '!ban' && isMod(message.member)) {
        const member = message.mentions.members.first();
        if (!member) return message.reply('Please mention a user to ban.');
        const reason = args.join(' ') || 'No reason provided';
        member.ban({ reason })
            .then(() => message.reply(`Banned ${member.user.tag}`))
            .catch(() => message.reply('Failed to ban user.'));
    }

    if (cmd === '!purge' && isMod(message.member)) {
        const amount = parseInt(args[0]);
        if (!amount || amount < 1 || amount > 100) return message.reply('Provide a number between 1 and 100.');
        message.channel.bulkDelete(amount + 1, true)
            .then(() => message.reply(`Deleted ${amount} messages.`))
            .catch(() => message.reply('Failed to purge messages.'));
    }
});

client.login(process.env.DISCORD_TOKEN);
