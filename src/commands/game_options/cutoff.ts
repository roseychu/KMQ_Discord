import BaseCommand, { CommandArgs } from "../base_command";
import { sendOptionsMessage, getDebugContext, sendErrorMessage } from "../../helpers/discord_utils";
import { getGuildPreference } from "../../helpers/game_utils";
import _logger from "../../logger";
import { GameOption } from "../../types";

const logger = _logger("cutoff");
export const BEGINNING_SEARCH_YEAR = 2008;

export default class CutoffCommand implements BaseCommand {
    async call({ message, parsedMessage }: CommandArgs) {
        const guildPreference = await getGuildPreference(message.guildID);
        const yearRange = parsedMessage.components;
        const startYear = yearRange[0];
        if (yearRange.length === 1) {
            guildPreference.setBeginningCutoffYear(parseInt(startYear, 10));
            guildPreference.setEndCutoffYear((new Date()).getFullYear());
        } else if (yearRange.length === 2) {
            const endYear = yearRange[1];
            if (endYear < startYear) {
                await sendErrorMessage(message, "Invalid end year", "End year must be after or equal to start year");
                return;
            }
            guildPreference.setBeginningCutoffYear(parseInt(startYear, 10));
            guildPreference.setEndCutoffYear(parseInt(endYear, 10));
        }
        await sendOptionsMessage(message, guildPreference, GameOption.CUTOFF);
        logger.info(`${getDebugContext(message)} | Cutoff set to ${guildPreference.getBeginningCutoffYear()} - ${guildPreference.getEndCutoffYear()}`);
    }
    validations = {
        minArgCount: 1,
        maxArgCount: 2,
        arguments: [
            {
                name: "cutoff_start",
                type: "number" as const,
                minValue: BEGINNING_SEARCH_YEAR,
                maxValue: (new Date()).getFullYear(),
            },
            {
                name: "cutoff_end",
                type: "number" as const,
                minValue: BEGINNING_SEARCH_YEAR,
                maxValue: (new Date()).getFullYear(),
            },
        ],
    };

    help = {
        name: "cutoff",
        description: "Set a cutoff year range for songs. If one value is specified, only songs AFTER that year will be played. If two values are specified, only songs BETWEEN those two years will be played",
        usage: "!cutoff [year_start] {year_end}",
        examples: [
            {
                example: "`!cutoff 2015`",
                explanation: "Play songs released after the year 2015.",
            },
            {
                example: "`!cutoff 2015 2018`",
                explanation: "Play songs released between the years 2015-2018.",
            },
        ],
    };
}
