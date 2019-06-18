// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { CountingGridModel } from './counting-grid-model';

export interface IWordEntryLayers {
    wordId: number;
    weight: number;
}

/** From top_pi_layers.txt. Represents the displayed nth (non-zero) grid of the Counting Grid. */
export class CGTopGridLayers {
    private static readonly layerRegex = new RegExp(/^layer:(\d+)/);
    private static readonly rowRegex = new RegExp(/^row:(\d+)/);
    private static readonly colRegex = new RegExp(/^col:(\d+)/);
    private static readonly wordRegex = new RegExp(/(\d+):([eE\+\-\.\d]+)/);

    public topGridLayers: IWordEntryLayers[][][][];

    public constructor(topPiLayersText: string) {
        this.parseTopPiLayers(topPiLayersText);
    }

    public get layerLength(): number {
        return this.topGridLayers.length;
    }

    public getWordProbability(layer: number, row: number, col: number, wordId: number): number {
        return this.topGridLayers[layer - 1][row - 1][col - 1].find((w) => w.wordId === wordId).weight;
    }

    public getWordEntryList(layer: number, row: number, col: number): IWordEntryLayers[] {
        return this.topGridLayers[layer - 1][row - 1][col - 1];
    }

    private parseTopPiLayers(topPi: string): void {
        this.topGridLayers = [];
        const lines = topPi.split(/\r?\n/);

        lines.forEach((line) => {
            if (line == null || line.trim() === '') {
                return;
            }

            const lineParts = line.split('\t');

            if ( lineParts.length < 3
                || !lineParts[0].startsWith('layer:')
                || !lineParts[1].startsWith('row:')
                || !lineParts[2].startsWith('col:')
            ) {
                throw new Error('Top_pi_layers.txt improperly formatted.');
            }

            const layerNumber = parseInt(CGTopGridLayers.layerRegex.exec(lineParts[0])[1], 10);
            const rowNumber = parseInt(CGTopGridLayers.rowRegex.exec(lineParts[1])[1], 10);
            const colNumber = parseInt(CGTopGridLayers.colRegex.exec(lineParts[2])[1], 10);

            const weightTexts = lineParts.slice(3);

            weightTexts.forEach((weightText) => {
                const regexResult = CGTopGridLayers.wordRegex.exec(weightText);

                if (regexResult != null) {
                    const wordId = regexResult[1];
                    const weight = regexResult[2];
                    if (wordId != null && wordId !== '' && weight != null && weight !== '') {
                        const wordEntry: IWordEntryLayers = {
                            wordId: parseInt(wordId, 10),
                            weight: parseFloat(weight),
                        };

                        if (wordEntry.weight > CountingGridModel.piThreshhold) {
                            if (this.topGridLayers[layerNumber - 1] == null) {
                                this.topGridLayers[layerNumber - 1] = [];
                            }

                            if (this.topGridLayers[layerNumber - 1][rowNumber - 1] == null) {
                                this.topGridLayers[layerNumber - 1][rowNumber - 1] = [];
                            }

                            if (this.topGridLayers[layerNumber - 1][rowNumber - 1][colNumber - 1] == null) {
                                this.topGridLayers[layerNumber - 1][rowNumber - 1][colNumber - 1] = [];
                            }

                            this.topGridLayers[layerNumber - 1][rowNumber - 1][colNumber - 1].push(wordEntry);
                        }
                    }
                }
            });
        });
    }
}
