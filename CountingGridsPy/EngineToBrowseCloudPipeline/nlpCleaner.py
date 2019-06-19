# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

import re
import functools
import string
from collections import defaultdict
import nltk
from nltk.stem import WordNetLemmatizer
from nltk.corpus import wordnet
from nltk.tag.stanford import StanfordPOSTagger
import pandas as pd
import os
import numpy as np
from CountingGridsPy.EngineToBrowseCloudPipeline.surveyData import SurveyData
from sklearn.preprocessing import LabelEncoder
from sklearn.feature_extraction import stop_words


def tokenizer(x, wordnet_lemmatizer, corrispondences, tagger):
    try:
        def get_wordnet_pos(treebank_tag):
            if treebank_tag.startswith('J'):
                return wordnet.ADJ
            elif treebank_tag.startswith('V'):
                return wordnet.VERB
            elif treebank_tag.startswith('N') or treebank_tag.startswith('FW'):
                return wordnet.NOUN
            elif treebank_tag.startswith('R'):
                return wordnet.ADV
            else:
                return wordnet.NOUN

        # tagged = tagger.tag(x.split()) #e.g. [('what', 'WP')]
        tagged = [(d, 'VB') if d not in stop_words.ENGLISH_STOP_WORDS else (
            d, '') for d in x.split()]  # stopword removal here
        tagged = [(wordnet_lemmatizer.lemmatize(re.sub("[^\w\d]", "", t[0]), get_wordnet_pos(t[1])), t[1], t[0])
                  for t in tagged]  # the regular expression removes characters that aren't digits or alphanumeric characters
        # tagged - (lemmatized word, part of speech, original word) e.g. [('what', 'WP', 'what')

        for t in tagged:
            corrispondences[t[0]] = corrispondences.get(t[0], "") + "," + t[2]

        return [t[0] for t in tagged], [t[1] for t in tagged]
    except Exception as e:
        print(e)
        return [], []


class NLPCleaner(object):
    def __init__(self):
        self.corrispondences = dict()
        self.textS = None
        self.labelsS = None

    def initial_clean_after_read(self, df, MIN_WORDS):
        self.text = [(
                str(aTuple[0]) + " " + str(aTuple[1]) + " " + str(aTuple[1]) + " " + str(aTuple[1])
            ) if not pd.isnull(aTuple[0]) and not pd.isnull(aTuple[1]) else (
                str(aTuple[1]) if not pd.isnull(aTuple[1]) else (
                    str(aTuple[0]) if not pd.isnull(aTuple[0]) else ""
                )
            ) for aTuple in zip(df.title.tolist(), df.abstract.tolist())]
        text_extremely_cleaned = [a for a in map(lambda x: re.sub("\\b[A-Za-z]{1,3}\\b", " ", re.sub(
            " +", " ", re.sub("[^A-Za-z\\s]", " ", re.sub("\[[^\]]*\]", " ", x)))), self.text)]
        keep = np.array([True if len(doc.split()) >=
                         MIN_WORDS else False for doc in text_extremely_cleaned])
        self.textS = [re.sub(" +", " ", re.sub("\|", " ", re.sub("\[[^\]]*\]",
                                                                 " ", t.lower()))) if k else "" for k, t in zip(keep, self.text)]
        return keep

    def read(self, FILE_NAME, inputfile_type, MIN_FREQUENCY=2, MIN_WORDS=5):
        df = None

        if inputfile_type == "metadata":
            df = pd.read_csv(FILE_NAME, keep_default_na=False)
            if 'title' not in df:
                df['title'] = ''
            if 'abstract' not in df:
                df['abstract'] = ''

        elif inputfile_type == "simple":
            df = pd.read_csv(FILE_NAME, sep="\t", header=None,
                             keep_default_na=False)
            df.columns = ["title", "abstract", "link"]

        elif inputfile_type == "simpleTime":
            df = pd.read_csv(FILE_NAME, sep="\t", header=None,
                             keep_default_na=False)
            df.columns = ["title", "abstract", "link", "time"]

        else:
            raise ValueError(
                "Input_type " + str(inputfile_type) + " is not valid.")

        # Validation now happens in BrowseCloud.Service. Assuming correct input, so no validation needed.
        keep = self.initial_clean_after_read(df, MIN_WORDS)
        '''
        le = LabelEncoder()
        labels = le.fit_transform(df.Corpus.tolist())
        self.labelsS = [t for k,t in zip(keep,labels) if k] #not used
        '''

        return (df, np.copy(keep))

    def handle_negation_tokens(self):
        negation_handling_functions = [lambda x: re.sub(" +", " ", x),
                                       lambda x: re.sub(
            "(^|\W|\.)can[\W']*[o]*(t|not)(\W|$|\.)", " can not ", x),
            lambda x: re.sub(
            "(^|\W|\.)could[n]*[\W']*[no]*(t|not)(\W|$|\.)", " could not ", x),
            lambda x: re.sub(
            "(^|\W|\.)should[n]*[\W']*[no]*(t|not)(\W|$|\.)", " should not ", x),
            lambda x: re.sub(
            "(^|\W|\.)would[n]*[\W']*[no]*(t|not)(\W|$|\.)", " would not ", x),
            lambda x: re.sub(
            "(^|\W|\.)won[\W']*(t)(\W|$|\.)", " wont ", x),
            lambda x: re.sub(
            "(^|\W|\.)do[n]*[\W']*[no]*t(\W|$|\.)", " do not ", x),
            lambda x: re.sub(
            "(^|\W|\.)does[n]*[\W']*[no]*t(\W|$|\.)", " does not ", x),
            lambda x: re.sub(
            "(^|\W|\.)did[n]*[\W']*[no]*t(\W|$|\.)", " did not ", x),
            lambda x: re.sub(
            "(^|\W|\.)is[n]*[\W']*[no]*t(\W|$|\.)", " is not ", x),
            lambda x: re.sub(
            "(^|\W|\.)are[n]*[\W']*[no]*t(\W|$|\.)", " are not ", x),
            lambda x: re.sub(
            "(^|\W|\.)was[n]*[\W']*[no]*t(\W|$|\.)", " was not ", x),
            lambda x: re.sub(
            "(^|\W|\.)were[n]*[\W']*[no]*t(\W|$|\.)", " were not ", x),
            lambda x: re.sub(
            "(^|\W|\.)ain[\W']*[no]*t(\W|$|\.)", " aint ", x),
            lambda x: re.sub(
            "(^|\W|\.)had[n]*[\W']*[no]*(t|not)(\W|$|\.)", " had not ", x),
            lambda x: re.sub(
            "(^|\W|\.)has[n]*[\W']*[no]*(t|not)(\W|$|\.)", " has not ", x),
            lambda x: re.sub(
            "(^|\W|\.)have[n]*[\W']*[no]*(t|not)(\W|$|\.)", " have not ", x),
            lambda x: x.lower()]

        def compose(*functions):
            return functools.reduce(lambda f, g: lambda x: f(g(x)), functions, lambda x: x)
        normalize_negations = compose(*negation_handling_functions)
        self.textS = [a for a in map(
            lambda x: normalize_negations(x), self.textS)]

    def removePunctuation(self):
        regexPunkt = re.compile('[%s]' % re.escape(string.punctuation))
        self.textSb = [a for a in map(lambda x: re.sub(
            " +", " ", regexPunkt.sub(' ', x)), self.textS)]

    def lemmatize(self):
        path_to_model = "./stanford-postagger-full-2017-06-09/models/english-bidirectional-distsim.tagger"
        path_to_jar = "./stanford-postagger-full-2017-06-09/stanford-postagger.jar"
        # Keep the constructor call here as a comment, just in case. We removed the HMM in tokenizer for part of speech tagging.
        # StanfordPOSTagger(path_to_model, path_to_jar); tagger.java_options='-mx10G'
        tagger = None
        wordnet_lemmatizer = WordNetLemmatizer()
        self.cleaned_featurized = [a for a in map(lambda x: tokenizer(
            x, wordnet_lemmatizer, self.corrispondences, tagger) if x != "" else ([], []), self.textSb)]
        return self.corrispondences

    def write(self, DIRECTORY_DATA, CLEAN_DATA_FILE_NAME, start=None, finish=None):
        assert(len(self.text) == len(self.cleaned_featurized))
        if start is None or finish is None:
            start = 0
            finish = len(self.text)

        df = pd.DataFrame(
            columns=['original', 'cleaned', 'pos', 'pos_filtered'])
        df['original'] = [w for w in map(
            lambda x: x.replace("\t", " "), self.text[start:finish])]

        try:  # if correspondences runs
            df['cleaned'] = [" ".join(d[0]).replace("\t", " ")
                             for d in self.cleaned_featurized[start:finish]]
            df['pos'] = [" ".join(d[1]).replace("\t", " ")
                         for d in self.cleaned_featurized[start:finish]]
            df['pos_filtered'] = [" ".join([w for (w, t) in zip(d[0], d[1]) if t in (
                ['JJR', 'JJS', 'JJ', 'NN', 'NNS', 'NNP', 'NNPS', 'VB', 'VBD', 'VBG', 'VBN', 'VBP', 'VBZ', 'WRB', 'FW']
            )]) for d in self.cleaned_featurized[start:finish]]
        except Exception as e:
            df['cleaned'] = ["" for w in self.text[start:finish]]
            df['pos'] = ["" for w in self.text[start:finish]]
            df['pos_filtered'] = ["" for w in self.text[start:finish]]
        if not os.path.isdir(DIRECTORY_DATA):
            os.mkdir(DIRECTORY_DATA)

        df.to_csv(DIRECTORY_DATA + CLEAN_DATA_FILE_NAME,
                  sep="\t", encoding="utf-8")

    def write_cached_correspondences(self, DIRECTORY_DATA, CACHED_CORRESPONDENCES_FILE_NAME):
        df = pd.DataFrame(columns=['lemma', 'words'])
        df['lemma'] = [lemma for lemma in self.corrispondences]
        df['words'] = [self.corrispondences[lemma]
                       for lemma in self.corrispondences]
        df.to_csv(DIRECTORY_DATA + CACHED_CORRESPONDENCES_FILE_NAME,
                  sep="\t", encoding="utf-8")

    def read_cached_correspondences(self, DIRECTORY_DATA, CACHED_CORRESPONDENCES_FILE_NAME):
        df = pd.read_csv(
            DIRECTORY_DATA + CACHED_CORRESPONDENCES_FILE_NAME, sep="\t", encoding="utf-8")
        correspondences = dict()
        for key, val in zip(df['lemma'], df['words']):
            correspondences[key] = val
        return correspondences
