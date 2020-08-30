import { db } from "../databases";
import config from "../config/app_config.json";
import fs from "fs";
import _logger from "../logger";
import path from "path";
import { Logger } from "log4js";
const logger: Logger = _logger("remove-redunant-aliases");

export async function removeRedunantAliases() {
    const songAliasPath = path.resolve(process.cwd(), "../data/song_aliases.json")
    logger.info("Checking for redunant aliases...");
    const songAliases: { [songId: string]: Array<string> } = JSON.parse(fs.readFileSync(songAliasPath).toString());
    let changeCount = 0;
    for (let videoId in songAliases) {
        const result = await db.kpopVideos("app_kpop")
            .select("nome as name")
            .where("vlink", "=", videoId)
        if (result.length === 0) {
            logger.warn(`Song ID ${videoId} doesn't exist anymore?`);
            continue;
        }
        const songName = result[0].name;
        let aliases = songAliases[videoId];
        if (aliases.includes(songName)) {
            if (aliases.length === 1) {
                logger.info(`vid ${videoId}, song_name '${songName}' no longer has any aliases`);
                changeCount++;
                delete songAliases[videoId];
                continue;
            } else {
                const index = aliases.indexOf(songName);
                songAliases[videoId].splice(index, 1);
                changeCount++;
                logger.info(`vid ${videoId}, song_name '${songName}', alias identical to title removed`);
            }
        }
    }
    if (changeCount) {
        fs.writeFileSync(songAliasPath, JSON.stringify(songAliases, function (k, v) {
            if (v instanceof Array)
                return JSON.stringify(v);
            return v;
        }, 4)
            .replace(/"\[/g, '[')
            .replace(/\]"/g, ']')
            .replace(/\\"/g, '"')
            .replace(/""/g, '"'));
        logger.info(`${changeCount} redunant aliases removed.`);
    }
    else {
        logger.info("No redunant aliases found.");
    }
}
