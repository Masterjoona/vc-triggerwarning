/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";

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
                    replace: "$& $self.shouldSpoilerFile($1.originalItem.filename) || "
                },
                {
                    match: /(\i)=\(0,\i.{10,20};(?=if\((\i).type)/,
                    replace: "$&$1=$self.shouldSpoilerLink($1,$2.url,$2.type);"
                }
            ]
        },
        {
            find: ".Messages.MESSAGE_UNSUPPORTED,",
            replacement: {
                match: /function \i\((\i),\i\){/,
                replace: "$&$1.content=$self.shouldSpoilerWords($1.content);"
            }
        }
    ],
    settings,
    shouldSpoilerFile(filename: string): string | null {
        const { spoilerFilenames } = settings.store;
        if (!filename || !spoilerFilenames) return null;
        const strings = spoilerFilenames.split(",").map(s => s.trim());
        return strings.some(s => filename.includes(s)) ? "spoiler" : null;
    },
    shouldSpoilerLink(alreadySpoilered: string, link: string, type: string): string | null {
        if (alreadySpoilered) return alreadySpoilered;
        const { spoilerLinks, gifSpoilersOnly } = settings.store;
        if (!link || !spoilerLinks) return null;

        const strings = spoilerLinks.split(",").map(s => s.trim());
        const isLinkSpoiler = strings.some(s => link.includes(s));

        if (gifSpoilersOnly) {
            return type === "gifv" && isLinkSpoiler ? "spoiler" : null;
        } else {
            return isLinkSpoiler ? "spoiler" : null;
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
