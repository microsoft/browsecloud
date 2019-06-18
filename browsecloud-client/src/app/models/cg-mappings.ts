// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export interface IDocEntryWeight {
    entryId: number;
    weight: number;
    layer: number;
}

export interface IDocEntryWeightPosition {
    weight: number;
    row: number;
    col: number;
}

export class CGMappings {
    private static readonly rowRegex = new RegExp(/^row:(\d+)/);
    private static readonly colRegex = new RegExp(/^col:(\d+)/);
    private static readonly docEntryRegex = new RegExp(/(\d+):([eE\+\-\.\d]+):(\d+)/);

    public mappings: IDocEntryWeight[][][];
    public entryToGridMapping: { [ name: number]: IDocEntryWeightPosition };

    public constructor(mappingsText: string) {
        this.parseMappings(mappingsText);
    }

    public getMappings(row: number, col: number): IDocEntryWeight[] {
        return this.mappings[row - 1][col - 1];
    }

    public getMappingsCount(row: number, col: number): number {
        return (row < 0 || col < 0) ? 0 : this.mappings[row - 1][col - 1].length;
    }

    public getPositionOfEntry(entryId: number): IDocEntryWeightPosition {
        return this.entryToGridMapping[entryId];
    }

    private parseMappings(mappingsText: string): void {
        this.mappings = [];
        this.entryToGridMapping = {};
        const lines = mappingsText.split(/\r?\n/);

        lines.forEach((line) => {
            if (line == null || line.trim() === '') {
                return;
            }

            const lineParts = line.split('\t');

            if ( lineParts.length < 2 || !lineParts[0].startsWith('row:') || !lineParts[1].startsWith('col:') ) {
                throw new Error('docmap.txt improperly formatted.');
            }

            const rowNumber = parseInt(CGMappings.rowRegex.exec(lineParts[0])[1], 10);
            const colNumber = parseInt(CGMappings.colRegex.exec(lineParts[1])[1], 10);

            const weightTexts = lineParts.slice(2);

            weightTexts.forEach((weightText) => {
                const regexResult = CGMappings.docEntryRegex.exec(weightText);

                if (regexResult != null) {
                    const entryId = regexResult[1];
                    const weight = regexResult[2];
                    const layer = regexResult[3];
                    if (entryId != null && entryId !== '' && weight != null && weight !== '' && layer != null && layer !== '') {
                        const docEntry: IDocEntryWeight = {
                            entryId: parseInt(entryId, 10) - 1,
                            weight: parseFloat(weight),
                            layer: parseInt(layer, 10) - 1,
                        };

                        if (this.mappings[rowNumber - 1] == null) {
                            this.mappings[rowNumber - 1] = [];
                        }

                        if (this.mappings[rowNumber - 1][colNumber - 1] == null) {
                            this.mappings[rowNumber - 1][colNumber - 1] = [];
                        }

                        this.mappings[rowNumber - 1][colNumber - 1].push(docEntry);

                        this.entryToGridMapping[docEntry.entryId] = {
                            row: rowNumber,
                            col: colNumber,
                            weight: docEntry.weight,
                        };
                    }
                }
            });
        });
    }
}
