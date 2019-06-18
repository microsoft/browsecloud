// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { CGColor, IRGBColor } from './cg-color';
import { CGCounts } from './cg-counts';
import { CGDatabase, IDocEntry } from './cg-database';
import { CGLegend } from './cg-legend';
import { CGMappings } from './cg-mappings';
import { CGTopGrid, IWordTag } from './cg-top-grid';
import { CGTopGridLayers } from './cg-top-grid-layers';
import { CGVocabulary } from './cg-vocabulary';

export interface IWordLabel {
    word: string;
    wordId: number;
    scaledWeight: number;
    point: IPoint;
    color: IRGBColor;
}

export interface IPoint {
    x: number;
    y: number;
}

export interface IScaledGridData {
    wordLabels: IWordLabel[];
    rowDistance: number;
    colDistance: number;
}

export interface IWordTagsWithMetadata {
    wordTags: IWordTag[];
    minWeight: number;
    maxWeight: number;
}

/** Contains all entities that make up a counting grid and helper methods for displaying the grid. */
export class CountingGridModel {
    public static readonly piThreshhold = 0.0001;

    public vocabulary: CGVocabulary;
    public topGrid: CGTopGrid;
    public color: CGColor;
    public mappings: CGMappings;
    public counts: CGCounts;
    public database: CGDatabase;
    public legend: CGLegend;
    public topGridLayers: CGTopGridLayers;

    public maxDocuments = 100;

    private randomOffsets: number[];
    private searchWordTagsCache: { [name: string]: IWordTagsWithMetadata } = {};

    public constructor(
        topPiText: string,
        colorBrowserText: string,
        wordsText: string,
        docMapText: string,
        databaseText: string,
        legendText: string,
        correspondencesText: string,
        topPiLayersText: string
    ) {
        this.color = new CGColor(colorBrowserText);
        this.vocabulary = new CGVocabulary(correspondencesText);
        this.topGrid = new CGTopGrid(topPiText, this.vocabulary);
        this.mappings = new CGMappings(docMapText);
        this.counts = new CGCounts(wordsText);
        this.database = new CGDatabase(databaseText);
        this.legend = new CGLegend(legendText);
        this.topGridLayers = new CGTopGridLayers(topPiLayersText);

        this.randomOffsets = Array.from({ length: this.vocabulary.lexicon.length }, () => Math.floor(Math.random() * 15));
    }

    public getScaledGridData(
        searchWordIds: number[],
        width: number,
        height: number,
        translationX = 0,
        translationY = 0,
        zoomRatio = 1
    ): IScaledGridData {
        const rowDistance = height / Math.max(this.topGrid.rowLength, 1);
        const colDistance = width / Math.max(this.topGrid.columnLength, 1);

        const visibilityArray = this.constructVisibilityArray(translationX, translationY, rowDistance, colDistance, zoomRatio);

        const scaledGridData = {
            rowDistance,
            colDistance,
            wordLabels: [],
        } as IScaledGridData;

        const wordTagsAndMetadata = this.getWordTags(searchWordIds);
        const measureMaxMinusMin = wordTagsAndMetadata.maxWeight - wordTagsAndMetadata.minWeight;

        wordTagsAndMetadata.wordTags.forEach((wordTag) => {
            if (visibilityArray[wordTag.row][wordTag.col] !== true) {
                return;
            }

            const scaledWeight = ((wordTag.weight - wordTagsAndMetadata.minWeight) / measureMaxMinusMin);

            if (scaledWeight === 0) {
                return;
            }

            const preY =
                Math.floor(((wordTag.row * rowDistance) + (this.randomOffsets[wordTag.wordId] * zoomRatio) + translationY) % height);
            const preX =
                Math.floor(((wordTag.col * colDistance) + (this.randomOffsets[wordTag.wordId] * zoomRatio) + translationX) % width);

            const currentColor = this.color.getColor(wordTag.row, wordTag.col);
            scaledGridData.wordLabels.push({
                word: wordTag.word,
                wordId: wordTag.wordId,
                point: {
                    y: preY > 0 ? preY : preY + height,
                    x: preX > 0 ? preX : preX + width,
                },
                scaledWeight,
                color: currentColor,
            });
        });

        scaledGridData.wordLabels = scaledGridData.wordLabels.sort((a, b) => a.scaledWeight - b.scaledWeight);

        return scaledGridData;
    }

    public getDocumentEntryList(row: number, col: number, searchWordIds?: number[], maxWordsInSearch = 100): IDocEntry[] {
        if (row == null || col == null) {
            return [];
        }

        const docList = this.mappings.getMappings(row, col);

        const docFinalWeights: { [name: number]: number } = {};

        if (searchWordIds != null && searchWordIds.length > 0) {
            // With search terms.
            const docWeights: { [name: number]: number } = {};
            const docWeightsSearch: { [name: number]: number } = {};

            const wordTagsForPoint = this.getWordTags(searchWordIds).wordTags
                .filter((wordTag) => wordTag.col === col && wordTag.row === row)
                .sort((a, b) => a.weight - b.weight);

            let maxDocWeight = 0;

            wordTagsForPoint.forEach((wordTag, wordIndex) => {
                // For perf, limit the amount of words involved in the search.
                if (wordIndex < maxWordsInSearch) {
                    docList.forEach((docEntry) => {
                        const wordCounts = this.counts.getWordCounts(docEntry.entryId, wordTag.wordId);
                        if (wordCounts > 0) {
                            for (let lay = 1; lay < this.topGridLayers.layerLength + 1; lay++) {
                                if (docWeights[docEntry.entryId] == null) {
                                    docWeights[docEntry.entryId] = 0;
                                }

                                docWeights[docEntry.entryId] += this.topGridLayers.getWordProbability(lay, row, col, wordTag.wordId);

                                if (docWeights[docEntry.entryId] > maxDocWeight) {
                                    maxDocWeight = docWeights[docEntry.entryId];
                                }
                            }
                        }
                    });
                }
            });

            searchWordIds.forEach((searchWordId) => {
                docList.forEach((docEntry) => {
                    const wordCounts = this.counts.getWordCounts(docEntry.entryId, searchWordId);

                    if (docWeightsSearch[docEntry.entryId] == null) {
                        docWeightsSearch[docEntry.entryId] = 0;
                    }

                    if (wordCounts > 0) {
                        docWeightsSearch[docEntry.entryId]++;
                    }
                });
            });

            docList.forEach((docEntry) => {
                docFinalWeights[docEntry.entryId] =
                    (docWeightsSearch[docEntry.entryId] == null ? 0 : docWeightsSearch[docEntry.entryId])
                    * docEntry.weight
                    * ((docWeights[docEntry.entryId] == null ? 0 : docWeights[docEntry.entryId]) / maxDocWeight);
            });
        } else {
            // Without search terms.
            const docWeights: { [name: number]: number } = {};

            this.topGrid.getWordEntryList(row, col).forEach((wordEntry, wordIndex) => {
                // For perf, limit the amount of words involved in the search.
                if (wordIndex < maxWordsInSearch) {
                    docList.forEach((docEntry) => {
                        const wordCounts = this.counts.getWordCounts(docEntry.entryId, wordEntry.wordId);
                        if (wordCounts > 0) {
                            if (docWeights[docEntry.entryId] == null) {
                                docWeights[docEntry.entryId] = 0;
                            }

                            docWeights[docEntry.entryId] += this.topGrid.getWordProbability(row, col, wordEntry.wordId);
                        }
                    });
                }
            });

            docList.forEach((docEntry) => {
                docFinalWeights[docEntry.entryId] =
                    docEntry.weight * (docWeights[docEntry.entryId] == null ? 0 : docWeights[docEntry.entryId]);
            });
        }

        return docList
            .sort((a, b) => {
                return docFinalWeights[b.entryId] - docFinalWeights[a.entryId];
            })
            .map((docEntryWeight) => {
                return this.database.getDocEntry(docEntryWeight.entryId);
            })
            // Limit to 100 docs. Perf gains.
            .slice(0, this.maxDocuments);
    }

    private constructVisibilityArray(
        translationX: number,
        translationY: number,
        rowDistance: number,
        colDistance: number,
        zoomRatio: number
    ): boolean[][] {
        if (zoomRatio > 1.5) {
            // Subtract one so they do not dissapear as soon as they touch the end of the page.
            let minY = (Math.floor(-translationY / rowDistance) - 1) % this.topGrid.rowLength;
            let minX = (Math.floor(-translationX / colDistance) - 1) % this.topGrid.columnLength;
            minY = minY > 0 ? minY : minY + this.topGrid.rowLength;
            minX = minX > 0 ? minX : minX + this.topGrid.columnLength;

            // Add one so they do not dissapear as soon as they touch the end of the page.
            let maxY = (Math.floor(-translationY / rowDistance + this.topGrid.rowLength / zoomRatio) + 1) % this.topGrid.rowLength;
            let maxX = (Math.floor(-translationX / colDistance + this.topGrid.columnLength / zoomRatio) + 1) % this.topGrid.columnLength;
            maxY = maxY > 0 ? maxY : maxY + this.topGrid.rowLength;
            maxX = maxX > 0 ? maxX : maxX + this.topGrid.columnLength;

            // row = 0 and col = 0 is not used, since they are 1 indexed.
            const visibility: boolean[][] = Array.from({ length: this.topGrid.rowLength + 1 }, () => {
                return Array.from({ length: this.topGrid.columnLength + 1 }, () => false);
            });

            let currX = minX;
            do {
                currX = ((currX + 1) % (this.topGrid.columnLength + 1));
                let currY = minY;

                visibility[currY][currX] = true;
                do {
                    currY = ((currY + 1) % (this.topGrid.rowLength + 1));
                    visibility[currY][currX] = true;
                } while (currY !== maxY);

            } while (currX !== maxX);

            return visibility;
        }

        return Array.from({ length: this.topGrid.rowLength + 1 }, () => {
            return Array.from({ length: this.topGrid.columnLength + 1 }, () => true);
        });
    }

    private getWordTags(searchWordIds: number[]): IWordTagsWithMetadata {
        if (searchWordIds == null || searchWordIds.length === 0) {
            return {
                wordTags: this.topGrid.wordTags,
                maxWeight: this.topGrid.maxWeight,
                minWeight: this.topGrid.minWeight,
            };
        }

        const cachedWordTags = this.searchWordTagsCache[JSON.stringify(searchWordIds)];
        if (cachedWordTags != null) {
            return cachedWordTags;
        }

        // Initialize array to 0.
        const layeredWeights =
            Array.from({ length: this.topGridLayers.layerLength }, () => {
                return Array.from({ length: this.topGrid.rowLength }, () => {
                    return Array.from({ length: this.topGrid.columnLength }, () => 0);
                });
            });

        // Keep track of max layered weight.
        let maxLayeredWeight = 0;

        // Weight the layers based on search words.
        for (let row = 1; row < this.topGrid.rowLength + 1; row++) {
            for (let col = 1; col < this.topGrid.columnLength + 1; col++) {
                const docMappings = this.mappings.getMappings(row, col);

                docMappings.forEach((docMapping) => {
                    let weight = 0;
                    let numberOfNonZeroWordCounts = 0;
                    searchWordIds.forEach((wordId) => {
                        const wordCount = this.counts.getWordCounts(docMapping.entryId, wordId);
                        numberOfNonZeroWordCounts += (wordCount === 0 ? 0 : 1);
                        weight += Math.min(25 /* Max Weight */, 20 /* Base Weight */ + (wordCount - 1));
                    });

                    layeredWeights[docMapping.layer][row - 1][col - 1] +=
                        numberOfNonZeroWordCounts !== 0 ? Math.pow(weight, 1 + Math.log(numberOfNonZeroWordCounts)) : 0;
                });

                for (let lay = 1; lay < this.topGridLayers.layerLength + 1; lay++) {
                    if (layeredWeights[lay - 1][row - 1][col - 1] > maxLayeredWeight) {
                        maxLayeredWeight = layeredWeights[lay - 1][row - 1][col - 1];
                    }
                }
            }
        }

        const wordTagsWithMedadata: IWordTagsWithMetadata = {
            wordTags: [],
            maxWeight: 0,
            minWeight: 1,
        };

        // Create new mapping based on new weights.
        for (let row = 1; row < this.topGrid.rowLength + 1; row++) {
            for (let col = 1; col < this.topGrid.columnLength + 1; col++) {
                for (let lay = 1; lay < this.topGridLayers.layerLength + 1; lay++) {
                    this.topGridLayers.getWordEntryList(lay, row, col).forEach((wordEntry) => {
                        const weight = wordEntry.weight * layeredWeights[lay - 1][row - 1][col - 1] / maxLayeredWeight;

                        if (weight > CountingGridModel.piThreshhold) {
                            const wordTag = {
                                row,
                                col,
                                wordId: wordEntry.wordId,
                                word: this.vocabulary.getLexiconWordById(wordEntry.wordId).word,
                                weight,
                            } as IWordTag;

                            wordTagsWithMedadata.wordTags.push(wordTag);

                            if (wordTag.weight > wordTagsWithMedadata.maxWeight) {
                                wordTagsWithMedadata.maxWeight = wordTag.weight;
                            }

                            if (wordTag.weight < wordTagsWithMedadata.minWeight) {
                                wordTagsWithMedadata.minWeight = wordTag.weight;
                            }
                        }
                    });
                }
            }
        }

        // Cache the result.
        this.searchWordTagsCache[JSON.stringify(searchWordIds)] = wordTagsWithMedadata;

        return wordTagsWithMedadata;
    }
}
