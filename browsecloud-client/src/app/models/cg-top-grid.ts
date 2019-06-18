// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { CGVocabulary } from './cg-vocabulary';
import { CountingGridModel } from './counting-grid-model';

export interface IWordEntry {
    wordId: number;
    weight: number;
}

export interface IWordTag {
    word: string;
    wordId: number;
    weight: number;
    row: number;
    col: number;
}

/** From top_pi.txt. Represents the displayed 0th grid of the Counting Grid. */
export class CGTopGrid {
    private static readonly rowRegex = new RegExp(/^row:(\d+)/);
    private static readonly colRegex = new RegExp(/^col:(\d+)/);
    private static readonly wordRegex = new RegExp(/(\d+):([eE\+\-\.\d]+)/);

    public maxWeight: number;
    public minWeight: number;
    public topGrid: IWordEntry[][][];
    public wordTags: IWordTag[];

    public constructor(topPiText: string, vocabulary: CGVocabulary) {
        this.parseTopPi(topPiText, vocabulary);
    }

    public get rowLength(): number {
        return this.topGrid.length;
    }

    public get columnLength(): number {
        if (this.topGrid.length === 0) {
            return 0;
        }
        return this.topGrid[0].length;
    }

    public getWordProbability(row: number, col: number, wordId: number): number {
        return this.topGrid[row - 1][col - 1].find((w) => w.wordId === wordId).weight;
    }

    public getWordEntryList(row: number, col: number): IWordEntry[] {
        return this.topGrid[row - 1][col - 1];
    }

    public isInBounds(row: number, col: number): boolean {
        return row >= 1 && col >= 1 && row <= this.rowLength && col <= this.columnLength;
    }

    private parseTopPi(topPi: string, vocabulary: CGVocabulary): void {
        this.topGrid = [];
        this.wordTags = [];
        const lines = topPi.split(/\r?\n/);

        this.maxWeight = 0;
        this.minWeight = 1;

        lines.forEach((line) => {
            if (line == null || line.trim() === '') {
                return;
            }

            const lineParts = line.split('\t');

            if (lineParts.length < 2 || !lineParts[0].startsWith('row:') || !lineParts[1].startsWith('col:')) {
                throw new Error('Top_pi.txt improperly formatted.');
            }

            const rowNumber = parseInt(CGTopGrid.rowRegex.exec(lineParts[0])[1], 10);
            const colNumber = parseInt(CGTopGrid.colRegex.exec(lineParts[1])[1], 10);

            const weightTexts = lineParts.slice(2);

            weightTexts.forEach((weightText) => {
                const regexResult = CGTopGrid.wordRegex.exec(weightText);

                if (regexResult != null) {
                    const wordId = regexResult[1];
                    const weight = regexResult[2];
                    if (wordId != null && wordId !== '' && weight != null && weight !== '') {
                        const wordEntry: IWordEntry = {
                            wordId: parseInt(wordId, 10),
                            weight: parseFloat(weight),
                        };

                        if (wordEntry.weight > CountingGridModel.piThreshhold) {
                            if (this.topGrid[rowNumber - 1] == null) {
                                this.topGrid[rowNumber - 1] = [];
                            }

                            if (this.topGrid[rowNumber - 1][colNumber - 1] == null) {
                                this.topGrid[rowNumber - 1][colNumber - 1] = [];
                            }

                            this.topGrid[rowNumber - 1][colNumber - 1].push(wordEntry);

                            this.wordTags.push({
                                col: colNumber,
                                row: rowNumber,
                                weight: wordEntry.weight,
                                wordId: wordEntry.wordId,
                                word: vocabulary.getLexiconWordById(wordEntry.wordId).word,
                            });

                            if (wordEntry.weight > this.maxWeight) {
                                this.maxWeight = wordEntry.weight;
                            }

                            if (wordEntry.weight < this.minWeight) {
                                this.minWeight = wordEntry.weight;
                            }
                        }
                    }
                }
            });
        });
    }
}
