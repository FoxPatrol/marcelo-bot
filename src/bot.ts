import { ActivityType, Client, Message } from "discord.js"
import { DisTube, Song } from "distube"
import config from "./config";

const prefix = "*";
let timer: NodeJS.Timeout

// =============================================================================
// =========================== INIT CLIENT AND DISTUBE =========================
// =============================================================================
export const client = new Client({
    intents: [
        "Guilds",
        "GuildMessages",
        "GuildMembers",
        "MessageContent",
        "GuildVoiceStates"
    ]
});

const distube = new DisTube(client, {
    emitNewSongOnly: true,
    leaveOnEmpty: true,
    emptyCooldown: 10,
    emitAddSongWhenCreatingQueue: false,
    leaveOnStop: false,
});
// =================================== END =====================================



// =============================================================================
// ================================ LISTENERS ==================================
// =============================================================================
distube.on("playSong", (queue, song) => {
    if(!queue.textChannel)
    {
        return
    }

    if(queue.autoplayPersonalized && !song.user)
    {
        queue.textChannel.send(`Playing \`${song.name}\` - \`${song.formattedDuration}\`\nRequested by: ${client.user?.username}`)
        return
    }

    queue.textChannel.send(`Playing \`${song.name}\` - \`${song.formattedDuration}\`\nRequested by: ${song.user?.username}`)
});

distube.on("finishSong", (queue, song) => {
    if(!queue.textChannel)
    {
        return
    }

    if(!queue.autoplayPersonalized || queue.songs.length > 1)
    {
        return
    }

    const relatedSongs = song.related
    for(let relatedSong of relatedSongs)
    {
        const songRepeated = !queue.previousSongs.every((song) => {
            return song.name != relatedSong.name
        })

        if(songRepeated)
        {
            continue
        }

        if(relatedSong.duration > 8*60 || relatedSong.views < 100000 || relatedSong.dislikes*4 > relatedSong.likes)
        {
            continue
        }

        let song: Song = new Song(relatedSong)
        queue.addToQueue(song);
        break;
    }
});

distube.on("addSong", (queue, song) => {
    if(!queue.textChannel)
    {
        return
    }

    queue.textChannel.send(`Added \`${song.name}\` - \`${song.formattedDuration}\` to the queue by ${song.user?.username}.`)
});

distube.on("searchNoResult", (message, query) => message.channel.send(`No result found for \`${query}\`!`));

distube.on('error', (channel, e) => {
    if (channel) channel.send(`${e}`)
    console.error(e)
})

distube.on("empty", queue => {
    if(!queue.textChannel)
    {
        return
    }

    queue.textChannel.send("Channel is empty. Leaving the channel.")
})

distube.on("finish", queue => {
    const leaveTime = 180; // in seconds

    timer = setTimeout(() => {
        if(queue.voiceChannel)
        {
            distube.voices.leave(queue.voiceChannel.guildId)
        }
    }, leaveTime*1000)
});
// =================================== END =====================================



// =============================================================================
// =============================== CLIENT SIDE =================================
// =============================================================================
client.once("ready", () => {
    console.log("Marcelo bot is ready!");

    if(client.user)
    {
        client.user.setActivity("*help", {
            type: ActivityType.Listening,
        });
    }
});

client.on("messageCreate", async (message: Message) => {
    if(message.author.bot) return;

    let timestamp: Date = new Date(message.createdTimestamp);
    // @ts-ignore
    console.log(timestamp.toUTCString() + " || " + message.guild?.name + ":" + message.channel.name + " || " + message.author.username + ": " + message.content);

    if(!message.content.startsWith(prefix)) return;
    const args = message.content.slice(prefix.length).trim().split(/ +/g);
    const command = args.shift()?.toLocaleLowerCase();
    //console.log(command, args)

    if(!command) { message.channel.send(message.author.username + " unknown command!"); return}
    if(!message.member || !message.member.voice.channel || !message.member.voice.channelId) { message.channel.send(message.author.username + " is not in a voice channel!"); return }
    if(!message.guildId) { message.channel.send(message.author.username + " your message does not belong to this server (somehow?)!"); return }
    const botVoiceChannel = distube.voices.get(message.guildId);
    if(botVoiceChannel && botVoiceChannel?.channelId && botVoiceChannel?.channelId?.toString() != message.member.voice.channelId.toString()) { message.channel.send(message.author.username + " is not in the same voice channel as me!"); return }

    if(command == "play" || command == "p")
    {
        const playArgument = args.join(" ");    // join all words into one argument, musics are often referred to with many words
        if(!playArgument) { message.channel.send(message.author.username + " no song selected!"); return }
        distube.play(message.member?.voice.channel, playArgument, {
            member: message.member,
            // @ts-ignore
            textChannel: message.channel,
        })
        .catch(error => {
            console.error(error);
            message.channel.send(error.name);
        })
        if(timer) { clearTimeout(timer) }
    }
    else if(command == "skip" || command == "s")
    {
        const queue = distube.getQueue(message.guildId);
        if(!queue)
        {
            return
        }
        else if( queue.songs.length < 2 && queue.autoplayPersonalized)
        {
            distube.emit("finishSong", queue, queue.songs[0]);
            distube.skip(message.guildId);
        }
        else if( queue.songs.length < 2)
        {
            distube.stop(message.guildId);
            distube.emit("finish", queue);
        }
        else
        {
            distube.skip(message.guildId);
        }
        message.channel.send("Skipping...");
    }
    else if(command == "leave" || command == "disconnect" || command == "dc")
    {
        distube.voices.leave(message.guildId)
    }
    else if(command == "queue" || command == "q")
    {
        const queue = distube.getQueue(message.guildId);
        if(!queue)
        {
            message.channel.send("Queue is empty!")
        }
        else
        {
            message.channel.send('Current queue:\n' + queue.songs.map((song, id) =>
            `**${id+1}**. \`[${song.name}]\`(<${song.url}>) - \`${song.formattedDuration}\``
            ).join("\n"));
        }
    }
    else if(command == "seek")
    {
        distube.seek(message.guildId, Number(args[0]));
        message.channel.send("Seeking time at \`" + args[0] + " seconds\`")
    }
    else if(command == "clear" || command == "c" || command == "stop" || command == "shut")
    {
        const queue = distube.getQueue(message.guildId);
        if(!queue)
        {
            return
        }

        distube.stop(message.guildId);
        distube.emit("finish", queue);
    }
    else if(command == "move" || command == "mv" || command == "swap" || command == "sw" || command == "sp")
    {
        let queue = distube.getQueue(message.guildId);
        if(!queue)
        {
            message.channel.send("Queue is empty!")
            return;
        }

        const pos1_pre = Number(args[0]);
        const pos2_pre = Number(args[1]);
        const pos1 = pos1_pre <= pos2_pre ? pos1_pre : pos2_pre;    // pos1 is always the first position
        const pos2 = pos1_pre > pos2_pre ? pos1_pre : pos2_pre;     // pos2 is always the last position

        if(pos1 == 1 || pos2 == 1)
        {
            message.channel.send("Cannot move a song in position \`1\`!")
            return;
        }

        if(queue.songs.length < pos1 || pos1 < 1)
        {
            message.channel.send("Queue does not have a song in place \`" + pos1 + "\`!")
            return;
        }

        if(queue.songs.length < pos2 || pos2 < 1)
        {
            message.channel.send("Queue does not have a song in place \`" + pos2 + "\`!")
            return;
        }

        message.channel.send('Swapped positions: \`' + queue.songs[pos1-1].name + '\` <---> \`' + queue.songs[pos2-1].name + '\`')
        const song1 = queue.songs[pos1-1];
        const song2 = queue.songs[pos2-1];

        // remove pos1 and put it in pos2
        queue.songs.splice(pos1-1, 1);
        queue.addToQueue(song1, pos2-1);

        // remove pos2 and put it in pos1
        queue.songs.splice(pos2-2, 1);
        queue.addToQueue(song2, pos1-1);
    }
    else if(command == "remove" || command == "rm" || command == "delete" || command == "del")
    {
        const queue = distube.getQueue(message.guildId);
        if(!queue)
        {
            message.channel.send("Queue is empty!")
            return;
        }

        const pos = Number(args[0]);
        if(queue.songs.length < pos)
        {
            message.channel.send("Queue does not have a song in place \`" + pos + "\`!")
            return;
        }
        else if(pos == 1)
        {
            if(queue.songs.length == 1)
            {
                distube.stop(message.guildId);
            }
            else
            {
                distube.skip(message.guildId);
            }
        }
        else
        {
            message.channel.send("Removed song \`#" + pos + "\` \`" + queue.songs[pos-1].name + "\`!")
            queue.songs.splice(pos-1, 1)
        }
    }
    else if(command == "radio" || command == "ra" || command == "auto" || command == "autoplay")
    {
        const queue = distube.getQueue(message.guildId);
        if(queue)
        {
            const autoplay = distube.toggleAutoplayPersonalized(message.guildId);
            message.channel.send("Radio mode is now \`" + (autoplay?"on":"off") + "\`!")
        }
        else
        {
            message.channel.send("Add a music before toggling radio mode!")
        }
    }
    else if(command == "help" || command == "h")
    {
        message.channel.send(
        "Use \`*\` to send me commands.\n" +
        "\`*play [music-link]\` to play the music link\n" +
        "\`*skip\` to skip the current music\n" +
        "\`*queue\` to see the current music queue\n" +
        "\`*seek [seconds]\` to jump to the time-argument in the music\n" +
        "\`*clear\` or \`*stop\` to clear the music queue\n" +
        "\`*remove [number]\` to remove a music from the queue, where the argument is the number of the music in the queue list\n" +
        "\`*move [number] [number]\` to swap the positions of the songs in queue\n" +
        "\`*radio\` to turn on radio mode (keeps playing related songs)\n" +
        "\`*leave\` or \`*disconnect\` to make me leave"
        );
    }
    else
    {
        message.channel.send(message.author.username + " unknown command!");
    }
});
// =================================== END =====================================

client.login(config.TOKEN)