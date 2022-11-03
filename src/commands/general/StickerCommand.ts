/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import { decryptMedia, Message, MessageTypes } from "@open-wa/wa-automate";
import { BaseCommand } from "../../structures/BaseCommand";
import { ICommandComponent } from "../../types";
import { FileTypes } from "../../types/enum";
import { ApplyMetadata } from "../../utils/decorators/ApplyMetadata";

@ApplyMetadata<ICommandComponent>({
    name: "sticker",
    description: "Generates a sticker from image.",
    usage: "sticker"
})
export default class StickerCommand extends BaseCommand {
    public async execute(message: Message): Promise<void> {
        const checkType = this.checkType(message);

        if (checkType === FileTypes.Invalid) {
            await this.whatsappbot.client.reply(
                message.chatId,
                "Dimohon kirim video, atau foto dengan .sticker mbak, dan video atau fotonya bisa di tag",
                message.id
            );
            return;
        }

        if (
            checkType === FileTypes.MessageImage ||
            checkType === FileTypes.QuoteImage
        ) {
            const wait = (await this.whatsappbot.client.reply(
                message.chatId,
                "_Generating sticker..._",
                message.id
            )) as Message["id"];
            await this.create(
                message,
                wait,
                checkType === FileTypes.MessageImage
                    ? false
                    : checkType === FileTypes.QuoteImage,
                false
            );

            return undefined;
        }

        if (
            checkType === FileTypes.MessageDocument ||
            checkType === FileTypes.QuoteDocument
        ) {
            const wait = (await this.whatsappbot.client.reply(
                message.chatId,
                "_Generating sticker..._",
                message.id
            )) as Message["id"];
            await this.create(
                message,
                wait,
                checkType === FileTypes.MessageDocument
                    ? false
                    : checkType === FileTypes.QuoteDocument,
                false
            );

            return undefined;
        }

        if (
            checkType === FileTypes.MessageVideo ||
            checkType === FileTypes.QuoteVideo
        ) {
            if (Number(message.quotedMsg?.duration ?? message.duration) >= 11) {
                await this.whatsappbot.client.reply(
                    message.chatId,
                    "Gunakan video atau gif dengan durasi kurang dari 10 detik mbak, mas",
                    message.id
                );
            } else {
                const wait = (await this.whatsappbot.client.reply(
                    message.chatId,
                    "_Membuat Sticker_ dimohon bersabar.",
                    message.id
                )) as Message["id"];
                await this.create(
                    message,
                    wait,
                    checkType === FileTypes.MessageVideo
                        ? false
                        : checkType === FileTypes.QuoteVideo,
                    true
                );
            }

            return undefined;
        }
    }

    private checkType(message: Message): keyof typeof FileTypes {
        switch (message.type) {
            case MessageTypes.IMAGE:
                return FileTypes.MessageImage;
            case MessageTypes.VIDEO:
                return FileTypes.MessageVideo;
            case MessageTypes.DOCUMENT:
                if (
                    ["image", "video"].includes(message.mimetype!.split("/")[0])
                ) {
                    return FileTypes.MessageDocument;
                }
                break;
            default:
                switch (message.quotedMsg?.type) {
                    case MessageTypes.IMAGE:
                        return FileTypes.QuoteImage;
                    case MessageTypes.VIDEO:
                        return FileTypes.QuoteVideo;
                    case MessageTypes.DOCUMENT:
                        if (
                            ["image", "video"].includes(
                                message.quotedMsg.mimetype!.split("/")[0]
                            )
                        ) {
                            return FileTypes.QuoteDocument;
                        }
                        break;
                    default:
                        return FileTypes.Invalid;
                }
                return FileTypes.Invalid;
        }
        return FileTypes.Invalid;
    }

    private async create(
        message: Message,
        waitMsg: Message["id"],
        isQuoted: boolean,
        isGif = false
    ): Promise<void> {
        try {
            const msg = isQuoted ? message.quotedMsg! : message;
            const media = await decryptMedia(msg);
            const imageBase64 = `data:${msg.mimetype!};base64,${media.toString(
                "base64"
            )}`;

            if (isGif) {
                await this.whatsappbot.client.sendMp4AsSticker(
                    message.chatId,
                    media.toString("base64"),
                    {
                        crop: false
                    },
                    {
                        keepScale: true,
                        author: this.whatsappbot.config.botName,
                        pack: "D2.0"
                    }
                );
            } else {
                await this.whatsappbot.client.sendImageAsSticker(
                    message.chatId,
                    imageBase64,
                    {
                        keepScale: true,
                        author: this.whatsappbot.config.botName,
                        pack: "SMPN 1"
                    }
                );
            }

            await this.whatsappbot.client.deleteMessage(
                message.chatId,
                waitMsg
            );
        } catch (e) {
            await this.whatsappbot.client.deleteMessage(
                message.chatId,
                waitMsg
            );
            await this.whatsappbot.client.reply(
                message.chatId,
                `Gagal membuat sticker, ${
                    (e as Error).message
                }.`,
                message.id
            );
            this.whatsappbot.logger.error(
                "sticker command",
                (e as Error).stack ?? (e as Error).message
            );
        }
    }
}
