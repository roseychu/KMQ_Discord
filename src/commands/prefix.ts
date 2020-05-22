import BaseCommand, { CommandArgs } from "./base_command";
import { sendInfoMessage, getDebugContext } from "../helpers/discord_utils";
import _logger from "../logger";
const logger = _logger("prefix");
const DEFAULT_BOT_PREFIX = ",";

class PrefixCommand implements BaseCommand {
    async call({ message, parsedMessage, guildPreference, db }: CommandArgs) {
        guildPreference.setBotPrefix(parsedMessage.components[0], db);
        await sendInfoMessage(message,
            "Bot prefix",
            `The prefix is \`${guildPreference.getBotPrefix()}\`.`
        );
        logger.info(`${getDebugContext(message)} | Prefix set to ${guildPreference.getBotPrefix()}`);
    }
    validations = {
        minArgCount: 1,
        maxArgCount: 1,
        arguments: [
            {
                name: "prefix",
                type: "char" as const
            }
        ]
    }
    help = {
        name: "prefix",
        description: "Set the character used to summon the bot.",
        usage: "!prefix [character]",
        arguments: [
            {
                name: "character",
                description: `You can only use a single character as the bot prefix. The default prefix is \`${DEFAULT_BOT_PREFIX}\`.`
            }
        ]
    }
}
export default PrefixCommand;
export {
    DEFAULT_BOT_PREFIX
}