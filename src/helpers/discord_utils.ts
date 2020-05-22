import { songCacheDir as SONG_CACHE_DIR } from "../../config/app_config.json";
import * as fs from "fs";
import { Pool } from "promise-mysql"
import * as path from "path";
import * as Discord from "discord.js";
import GuildPreference from "models/guild_preference";
import GameSession from "../models/game_session";
import BaseCommand from "commands/base_command";
import _logger from "../logger";
import { getSongCount, GameOptions } from "./game_utils";
const logger = _logger("utils");
const EMBED_INFO_COLOR = 0x000000; // BLACK
const EMBED_ERROR_COLOR = 0xE74C3C; // RED

const sendSongMessage = async (message: Discord.Message, gameSession: GameSession, isForfeit: boolean) => {
    await message.channel.send({
        embed: {
            color: EMBED_INFO_COLOR,
            author: {
                name: isForfeit ? null : message.author.username,
                icon_url: isForfeit ? null : message.author.avatarURL()
            },
            title: `"${gameSession.getSong()}" - ${gameSession.getArtist()}`,
            description: `https://youtube.com/watch?v=${gameSession.getVideoID()}\n\n**Scoreboard**`,
            image: {
                url: `https://img.youtube.com/vi/${gameSession.getVideoID()}/hqdefault.jpg`
            },
            fields: gameSession.scoreboard.getScoreboard()
        }
    })
}
const sendInfoMessage = async (message: Discord.Message, title: string, description?: string, footerText?: string, footerImageWithPath?: string) => {
    let embed = new Discord.MessageEmbed({
        color: EMBED_INFO_COLOR,
        author: {
            name: message.author.username,
            icon_url: message.author.avatarURL()
        },
        title: bold(title),
        description: description
    })

    if (footerImageWithPath) {
        embed.attachFiles([footerImageWithPath]);
        let footerImage = path.basename(footerImageWithPath);
        embed.setFooter(footerText, `attachment://${footerImage}`)
    }

    await message.channel.send(embed);
}
const sendErrorMessage = async (message: Discord.Message, title: string, description: string) => {
    await message.channel.send({
        embed: {
            color: EMBED_ERROR_COLOR,
            author: {
                name: message.author.username,
                icon_url: message.author.avatarURL()
            },
            title: bold(title),
            description: description
        }
    });
}

const sendOptionsMessage = async (message: Discord.Message, guildPreference: GuildPreference, db: Pool, updatedOption: string) => {
    let cutoffString = `${guildPreference.getBeginningCutoffYear()}`;
    let genderString = `${guildPreference.getSQLGender()}`;
    let limitString = `${guildPreference.getLimit()}`;
    let volumeString = `${guildPreference.getVolume()}`;

    cutoffString = updatedOption == GameOptions.CUTOFF ? bold(cutoffString) : codeLine(cutoffString);
    genderString = updatedOption == GameOptions.GENDER ? bold(genderString) : codeLine(genderString);
    limitString = updatedOption == GameOptions.LIMIT ? bold(limitString) : codeLine(limitString);
    volumeString = updatedOption == GameOptions.VOLUME ? bold(volumeString) : codeLine(volumeString);

    let totalSongs = await getSongCount(guildPreference, db);
    await sendInfoMessage(message,
        updatedOption == null ? "Options" : `${updatedOption} updated`,
        `Now playing the ${limitString} out of the __${totalSongs}__ most popular songs  by ${genderString} artists starting from the year ${cutoffString} at ${volumeString}% volume.`,
        updatedOption == null ? `Psst. Your bot prefix is \`${guildPreference.getBotPrefix()}\`.` : null,
        updatedOption == null ? "assets/tsukasa.jpg" : null
    );
}
const getDebugContext = (message: Discord.Message): string => {
    return `gid: ${message.guild.id}, uid: ${message.author.id}`
}

const getCommandFiles = (): Promise<{ [commandName: string]: BaseCommand }> => {
    return new Promise((resolve, reject) => {
        let commandMap = {};
        fs.readdir("./commands", async (err, files) => {
            if (err) {
                reject();
                return logger.error(`Unable to read commands error = ${err}`);
            }
            for (const file of files) {
                let command = await import(`../commands/${file}`);
                let commandName = file.split(".")[0];
                commandMap[commandName] = new command.default()
            }
            resolve(commandMap);
        });
    })
}

const bold = (text: string): string => {
    return `**${text}**`;
}

const italicize = (text: string): string => {
    return `*${text}*`;
}

const codeLine = (text: string): string => {
    return `\`${text}\``
}

const touch = (filePath: string) => {
    try {
        let currentTime = new Date();
        fs.utimesSync(filePath, currentTime, currentTime);
    } catch (err) {
        fs.closeSync(fs.openSync(filePath, "w"));
    }
}

const arraysEqual = (arr1: Array<any>, arr2: Array<any>): boolean => {
    if (arr1.length !== arr2.length) {
        return false;
    }

    arr1 = arr1.concat().sort();
    arr2 = arr2.concat().sort();

    for (var i = 0; i < arr1.length; i++) {
        if (arr1[i] !== arr2[i]) {
            return false;
        }
    }
    return true;
}

export function disconnectVoiceConnection(client: Discord.Client, message: Discord.Message) {
    let voiceConnection = client.voice.connections.get(message.guild.id);
    if (voiceConnection) {
        logger.info(`${getDebugContext(message)} | Disconnected from voice channel`);
        voiceConnection.disconnect();
        return;
    }
}

export function getUserIdentifier(user: Discord.User): string {
    return `${user.username}#${user.discriminator}`
}


export function areUserAndBotInSameVoiceChannel(message: Discord.Message): boolean {
    if (!message.member.voice || !message.guild.voice) {
        return false;
    }
    return message.member.voice.channel === message.guild.voice.channel;
}

export function getNumParticipants(message: Discord.Message): number {
    // Don't include the bot as a participant
    return message.member.voice.channel.members.size - 1;
}

export function clearPartiallyCachedSongs() {
    logger.debug("Clearing partially cached songs");
    if (!fs.existsSync(SONG_CACHE_DIR)) {
        return logger.error("Song cache directory doesn't exist.");
    }
    fs.readdir(SONG_CACHE_DIR, (error, files) => {
        if (error) {
            return logger.error(error);
        }

        const endingWithPartRegex = new RegExp("\\.part$");
        const partFiles = files.filter((file) => file.match(endingWithPartRegex));
        partFiles.forEach((partFile) => {
            fs.unlink(`${SONG_CACHE_DIR}/${partFile}`, (err) => {
                if (err) {
                    logger.error(err);
                }
            })
        })
        if (partFiles.length) {
            logger.debug(`${partFiles.length} stale cached songs deleted.`);
        }
    });
}
export {
    EMBED_INFO_COLOR,
    EMBED_ERROR_COLOR,
    touch,
    getCommandFiles,
    sendSongMessage,
    getDebugContext,
    sendInfoMessage,
    sendErrorMessage,
    sendOptionsMessage,
    arraysEqual
}