import fs from "fs";
import path from "path";
import BaseCommand, { CommandArgs } from "../base_command";
import _logger from "../../logger";
import dbContext from "../../database_context";
import { EMBED_INFO_COLOR, getDebugContext, sendMessage } from "../../helpers/discord_utils";
import { bold } from "../../helpers/utils";

const logger = _logger("news");

export default class NewsCommand implements BaseCommand {
    async call({ message }: CommandArgs) {
        let latestSongDate: Date;
        try {
            const data = await dbContext.kpopVideos("app_kpop")
                .select("publishedon")
                .orderBy("publishedon", "DESC")
                .limit(1);
            latestSongDate = new Date(data[0].publishedon);
        } catch (e) {
            logger.error(`${getDebugContext(message)} | Error retrieving latest song date`);
            latestSongDate = null;
        }
        const newsFilePath = path.resolve(__dirname, "../../data/news.md");
        if (!fs.existsSync(newsFilePath)) {
            logger.error("News file does not exist");
            return;
        }
        const news = fs.readFileSync(newsFilePath).toString();
        const embed = {
            color: EMBED_INFO_COLOR,
            author: {
                name: message.author.username,
                icon_url: message.author.avatarURL,
            },
            title: bold("Updates"),
            description: news,
            footer: {
                text: `Latest Song Update: ${latestSongDate.toISOString().split("T")[0]}`,
            },
        };
        logger.info(`${getDebugContext(message)} | News retrieved.`);
        await sendMessage({ channel: message.channel, authorId: message.author.id }, { embed });
    }
    help = {
        name: "news",
        description: "Displays the latest updates to KMQ.",
        usage: "!news",
        examples: [],
    };

    aliases = ["updates"];
}
