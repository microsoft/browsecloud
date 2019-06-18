// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export interface IDocEntryWordCount {
    entryId: number;
    wordCount: number;
}

export class CGCounts {
    private static readonly idRegex = new RegExp(/^id:(\d+)/);
    private static readonly countRegex = new RegExp(/(\d+):(\d+)/);

    public wordCounts: IDocEntryWordCount[][];

    public constructor(countsText: string) {
        this.parseCounts(countsText);
    }

    public getWordCounts(docEntryId: number, wordId: number): number {
        const wordCountList = this.wordCounts[wordId];

        if (wordCountList == null) {
            return null;
        }

        const docEntry = wordCountList.find((de) => de.entryId === docEntryId);

        return docEntry == null ? 0 : docEntry.wordCount;
    }

    private parseCounts(countsText: string): void {
        this.wordCounts = [];
        const lines = countsText.split(/\r?\n/);

        lines.forEach((line) => {
            if (line == null || line.trim() === '') {
                return;
            }

            const lineParts = line.split('\t');

            if ( lineParts.length < 1 || !lineParts[0].startsWith('id:')) {
                throw new Error('words.txt improperly formatted.');
            }

            const wordId = parseInt(CGCounts.idRegex.exec(lineParts[0])[1], 10) - 1;

            const countTexts = lineParts.slice(1);

            const tempEntryCounts: IDocEntryWordCount[] = [];
            countTexts.forEach((countText) => {
                const regexResult = CGCounts.countRegex.exec(countText);

                if (regexResult != null) {
                    const entryId = regexResult[1];
                    const wordCount = regexResult[2];
                    if (entryId != null && entryId !== '' && wordCount != null && wordCount !== '') {
                        const wordEntry: IDocEntryWordCount = {
                            entryId: parseInt(entryId, 10) - 1,
                            wordCount: parseInt(wordCount, 10),
                        };

                        tempEntryCounts.push(wordEntry);
                    }
                }
            });

            this.wordCounts[wordId] = tempEntryCounts;
        });
    }
}
