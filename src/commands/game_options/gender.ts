import BaseCommand, { CommandArgs } from "../base_command";
import { sendOptionsMessage, getDebugContext, sendErrorMessage } from "../../helpers/discord_utils";
import { getGuildPreference } from "../../helpers/game_utils";
import _logger from "../../logger";
import { GameOption } from "../../types";

const logger = _logger("gender");
export enum GENDER {
    MALE = "male",
    FEMALE = "female",
    COED = "coed",
}
export default class GenderCommand implements BaseCommand {
    async call({ message, parsedMessage }: CommandArgs) {
        const guildPreference = await getGuildPreference(message.guildID);
        if (guildPreference.getGroupIds() !== null) {
            logger.warn(`${getDebugContext(message)} | Game option conflict between gender and groups.`);
            sendErrorMessage(message, "Game Option Conflict", "`groups` game option is currently set. `gender` and `groups` are incompatible. Remove the `groups` option by typing `,groups`to proceed");
            return;
        }
        const selectedGenderArray = guildPreference.setGender(parsedMessage.components as GENDER[]);
        let selectedGenderStr = "";
        for (let i = 0; i < selectedGenderArray.length; i++) {
            selectedGenderStr += `\`${selectedGenderArray[i]}\``;
            if (i === selectedGenderArray.length - 1) {
                break;
            } else if (i === selectedGenderArray.length - 2) {
                selectedGenderStr += " and ";
            } else {
                selectedGenderStr += ", ";
            }
        }
        await sendOptionsMessage(message, guildPreference, GameOption.GENDER);
        logger.info(`${getDebugContext(message)} | Genders set to ${selectedGenderStr}`);
    }
    validations = {
        minArgCount: 1,
        maxArgCount: 3,
        arguments: [
            {
                name: "gender_1",
                type: "enum" as const,
                enums: Object.values(GENDER),
            },
            {
                name: "gender_2",
                type: "enum" as const,
                enums: Object.values(GENDER),
            },
            {
                name: "gender_3",
                type: "enum" as const,
                enums: Object.values(GENDER),
            },
        ],
    };

    help = {
        name: "gender",
        description: "Choose the gender of the artists you'd like to hear from. Options are the following, `male`, `female`, and `coed`",
        usage: "!gender [gender1] {gender2} {gender3}",
        examples: [
            {
                example: "`!gender female`",
                explanation: "Play songs only from female artists",
            },
            {
                example: "`!gender male female`",
                explanation: "Play songs from both male and female artists",
            },
            {
                example: "`!gender coed`",
                explanation: "Play songs only from coed groups (groups with both male and female members)",
            },
        ],
    };
}
