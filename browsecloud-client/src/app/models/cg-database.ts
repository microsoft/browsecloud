// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export interface IDocEntry {
    id: number;
    title: string;
    abstract: string;
    link: string;
    layer: number;
    feature: number;
    otherFields?: { [name: string]: string };
}

export class CGDatabase {
    public database: IDocEntry[];
    private extraColumnsSet: Set<string>;

    public constructor(databaseText: string) {
        this.parseDatabase(databaseText);
    }

    public getDocEntry(entryId: number): IDocEntry {
        return this.database[entryId];
    }

    public get extraColumns(): string[] {
        return Array.from(this.extraColumnsSet);
    }

    private parseDatabase(databaseText: string): void {
        this.database = [];
        this.extraColumnsSet = new Set();

        const lines = databaseText.split(/\r?\n/);
        lines.forEach((line) => {
            if (line == null || line.trim() === '') {
                return;
            }

            const lineComponents: { [name: string]: string } = {};
            line.split('\t').forEach((value) => {
                const indexOfColon = value.indexOf(':');
                lineComponents[value.substring(0, indexOfColon)] = value.substring(indexOfColon + 1);
            });

            // Ensure the identifying parts of the entry (id and layer) are present.
            if (
                lineComponents['id'] != null
                && lineComponents['id'] !== ''
                && lineComponents['layer'] != null
                && lineComponents['layer'] !== ''
            ) {
                const docEntry: IDocEntry = {
                    id: parseInt(lineComponents['id'], 10) - 1,
                    title: lineComponents['title'] == null ? '' : lineComponents['title'].trim(),
                    abstract: lineComponents['abstract'] == null ? '' : lineComponents['abstract'].trim(),
                    link: lineComponents['link'] == null ? '' : lineComponents['link'].trim(),
                    layer: parseInt(lineComponents['layer'], 10) - 1,
                    feature: parseFloat(lineComponents['feature']),
                };

                // Remove above elements from object.
                ['id', 'title', 'abstract', 'link', 'layer', 'feature', 'image'].forEach((key) => {
                    delete lineComponents[key];
                });

                // Add remaining elements to other fields.
                const extraKeys = Object.keys(lineComponents);
                if (extraKeys.length > 0) {
                    extraKeys.forEach((key) => {
                        this.extraColumnsSet.add(key);
                    });

                    docEntry.otherFields = lineComponents;
                }

                this.database[docEntry.id] = docEntry;
            }
        });
    }
}
