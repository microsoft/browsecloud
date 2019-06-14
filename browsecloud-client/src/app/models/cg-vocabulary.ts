// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export interface ILexiconWord {
    word: string;
    wordId: number;
}

/**
 * From correspondences.txt. The lemmatized word and the original word
 * Note that we are not using vocabulary.txt anymore for perf gains,
 * since everything in that file is in this file.
 */
export class CGVocabulary {
    public wordToWordId: { [name: string]: number };
    public wordIdToCorrespondences: { [name: string]: string[] };
    public lexicon: ILexiconWord[];

    public constructor(correspondences: string) {
        this.parseCorrespondences(correspondences);
    }

    public getLexiconWordByWord(word: string): ILexiconWord {
        if (word == null) {
            return null;
        }

        const index = this.wordToWordId[word] || -1;

        if (index === -1) {
            return null;
        }

        return this.lexicon[index];
    }

    public getVocabularyWordsById(wordId: number): string[] {
        return this.wordIdToCorrespondences[wordId];
    }

    public getLexiconWordById(wordId: number): ILexiconWord {
        return this.lexicon[wordId];
    }

    private parseCorrespondences(correspondences: string): void {
        this.lexicon = [];
        this.wordToWordId = {};
        this.wordIdToCorrespondences = {};

        const lines = correspondences.split(/\r?\n/);
        lines.forEach((line) => {
            if (line == null || line.trim() === '') {
                return;
            }

            const [word, lemmatizedWord, wordId] = line.split('\t');

            if (wordId == null || wordId === '' || word == null || word === '' || lemmatizedWord == null || lemmatizedWord === '') {
                throw new Error('Correspondence file improperly formatted. Every line must have 3 values.');

            }

            // The word ID in this file is + 1 the word ID in every other file. Legacy.
            const wordIdInt = parseInt(wordId, 10) - 1;

            const lexiconWord: ILexiconWord = {
                word: lemmatizedWord, wordId: wordIdInt,
            };

            this.lexicon[wordIdInt] = lexiconWord;
            this.wordToWordId[word] = wordIdInt;

            if (this.wordIdToCorrespondences[wordIdInt] == null) {
                this.wordIdToCorrespondences[wordIdInt] = [];
            }

            this.wordIdToCorrespondences[wordIdInt].push(word);
        });
    }
}
