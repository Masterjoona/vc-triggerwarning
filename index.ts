/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";
import { Embed } from "discord-types/general";

const settings = definePluginSettings({
    spoilerWords: {
        description: "Strings in messages that should be spoilered. Comma separated.",
        type: OptionType.STRING,
        default: "",
    },
    spoilerFilenames: {
        description: "Strings in filenames that should be spoilered. Comma separated.",
        type: OptionType.STRING,
        default: "",
    },
    spoilerLinks: {
        description: "Strings in link attachments that should be spoilered. Comma separated.",
        type: OptionType.STRING,
        default: ""
    },
    gifSpoilersOnly: {
        description: "Should the links only be gifs?",
        type: OptionType.BOOLEAN,
        default: true
    },
});

interface Attachment {
	id: string;
	filename: string;
	size: number;
	url: string;
	proxy_url: string;
	width: number;
	height: number;
	content_type: string;
	placeholder: string;
	placeholder_version: number;
	spoiler: boolean;
    TWReason?: string;
}

type EmbedLink = Embed & { link: string, TWReason?: string };


export default definePlugin({
    name: "TriggerWarning",
    authors: [{
        name: "Joona",
        id: 297410829589020673n
    }],
    description: "Spoiler attachments/embeds based on filenames and links.",
    patches: [
        {
            find: ".renderSuppressConfirmModal()",
            replacement: [
                {
                    match: /function \i\((\i),\i\){return(?<=VOICE_MESSAGE.{20,27})/,
                    replace: "$& $self.shouldSpoilerFile($1.originalItem) || "
                },
                {
                    match: /(\i)=\(0,\i.{10,20};(?=if\((\i).type)/,
                    replace: "$&$1=$self.shouldSpoilerLink($1,$2);"
                }
            ]
        },
        {
            find: ".Messages.MESSAGE_UNSUPPORTED,",
            replacement: {
                match: /function \i\((\i),\i\){/,
                replace: "$&$1.content=$self.shouldSpoilerWords($1.content);"
            }
        },
        {
            find: ".nonMediaMosaicItem]",
            replacement: {
                match: /.Types.ATTACHMENT,/,
                replace: "$&TWReason:arguments[0].message.attachments[0].TWReason,"
            }
        },
        {
            find: '.ATTACHMENT="attachment",',
            replacement: [
                {
                    match: /\i,{className:\i(?<=!1}=(\i);switch.{1,150})/,
                    replace: "$&,TWReason:$1.TWReason,"
                },
                {
                    match: /\i\.\i\.Messages\.SPOILER(?<==(\i).{1,100})/,
                    replace: "($1.TWReason && 'Trigger: ' + $1.TWReason) || $&"
                },
                {
                    match:/,{reason:\i/g,
                    replace: "$&,TWReason:this.props.TWReason"
                }
            ]
        },
        {
            find: "this.renderInlineMediaEmbed",
            replacement: {
                match: /.Types.EMBED,/,
                replace: "$&TWReason:this.props.embed.TWReason,"
            }
        }
    ],
    settings,
    shouldSpoilerFile(attachment: Attachment): string | null {
        const { spoilerFilenames } = settings.store;
        const filename = attachment.filename;
        if (!filename || !spoilerFilenames) return null;
        const strings = spoilerFilenames.split(",").map(s => s.trim());
        const badWord = strings.find(s => filename.includes(s));
        attachment.TWReason = badWord;
        return badWord ? "spoiler" : null;
    },
    shouldSpoilerLink(alreadySpoilered: string, embed: EmbedLink): string | null {
        const { url, type } = embed;
        if (alreadySpoilered) return alreadySpoilered;
        const { spoilerLinks, gifSpoilersOnly } = settings.store;
        if (!url || !spoilerLinks) return null;

        const strings = spoilerLinks.split(",").map(s => s.trim());
        const badWord = strings.find(s => url.includes(s));

        if (gifSpoilersOnly) {
            embed.TWReason = badWord;
            return type === "gifv" && badWord ? "spoiler" : null;
        } else {
            embed.TWReason = badWord;
            return badWord ? "spoiler" : null;
        }
    },
    shouldSpoilerWords(content: string): string {
        const { spoilerWords } = settings.store;
        if (!content || !spoilerWords) return content;

        const strings = spoilerWords.split(",").map(s => s.trim());

        return strings.reduce((acc, s) => {
            const spoilerRegex = new RegExp(`\\|\\|${s}\\|\\|`, "gi");
            if (spoilerRegex.test(acc)) {
                return acc;
            }
            const wordRegex = new RegExp(`\\b${s}\\b`, "gi");
            return acc.replace(wordRegex, `||${s}||`);
        }, content);
    }

});
