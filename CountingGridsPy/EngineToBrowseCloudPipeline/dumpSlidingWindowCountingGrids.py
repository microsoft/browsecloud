# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

from CountingGridsPy.EngineToBrowseCloudPipeline import BrowseCloudArtifactGenerator, CGEngineWrapper, NLPCleaner, PipelineTimer
import sys
import numpy as np
import os
import pandas as pd
import datetime
import matplotlib.pyplot as plt
from CountingGridsPy.models import CountingGridModel

pTimer = PipelineTimer()
# Example CLI: python dumpSlidingWindowCountingGrids.py CalculatorDataExperiment6 24 5 numpyEngine simpleTimeInput CalculatorUIFData.txt
errStr = '''
Please give a valid command-line arguments.
Instructions found here: https://github.com/microsoft/browsecloud/wiki/Data-Pipeline-Documentation.
'''

# ---------------------------------------------------------------------------------------
# Input
# ---------------------------------------------------------------------------------------

if len(sys.argv) != 7:
    print(((sys.argv)))
    raise ValueError(errStr)
DIRECTORY_DATA = sys.argv[1]
EXTENT_SIZE = int(sys.argv[2])
WINDOW_SIZE = int(sys.argv[3])
engine_type = sys.argv[4]
inputfile_type = sys.argv[5]
inputfile_name = sys.argv[6]
if engine_type != "numpyEngine":
    raise ValueError("The {0} engine does not exist.".format(engine_type))
engine_type = engine_type[:-6]  # 6 characters in the word "Engine"
if inputfile_type != "simpleTimeInput":
    raise ValueError(
        "The {0} input type does not exist.".format(inputfile_type))
inputfile_type = inputfile_type[:-5]  # remove "Input"

if not os.path.isdir(DIRECTORY_DATA):
    raise ValueError(
        "Undefined local directory where digital channel is dumped!\n" + errStr)

FILE_NAME = DIRECTORY_DATA + "\\" + inputfile_name

CLEAN_DATA_FILE_NAME, MIN_FREQUENCY, MIN_WORDS = ["\cg-processed.tsv", 2, 5]

# ---------------------------------------------------------------------------------------
# Data Cleaning
# ---------------------------------------------------------------------------------------
cleaner = NLPCleaner()
correspondences = None
CACHED_CORRESPONDENCES_FILE_NAME = "\cached_correspondences.tsv"
pTimer("Reading data file.")
df, keep = cleaner.read(FILE_NAME, inputfile_type, MIN_FREQUENCY, MIN_WORDS)
if not (os.path.exists(DIRECTORY_DATA + CACHED_CORRESPONDENCES_FILE_NAME) and os.path.exists(DIRECTORY_DATA + CLEAN_DATA_FILE_NAME)):
    pTimer("Starting data cleaning.")
    cleaner.handle_negation_tokens()
    cleaner.removePunctuation()
    correspondences = cleaner.lemmatize()
    cleaner.write_cached_correspondences(
        DIRECTORY_DATA, CACHED_CORRESPONDENCES_FILE_NAME)
    cleaner.write(DIRECTORY_DATA, CLEAN_DATA_FILE_NAME)
else:
    pTimer("Skipping data cleaning.")
    correspondences = cleaner.read_cached_correspondences(
        DIRECTORY_DATA, CACHED_CORRESPONDENCES_FILE_NAME)

pTimer("Learning counting grid.")
LEARNED_GRID_FILE_NAME = "/CountingGridDataMatrices.mat"
engine = CGEngineWrapper(extent_size=EXTENT_SIZE, window_size=WINDOW_SIZE)
vocabulary = None
try:
    # ---------------------------------------------------------------------------------------
    # Learning
    # ---------------------------------------------------------------------------------------
    if not os.path.exists(DIRECTORY_DATA + LEARNED_GRID_FILE_NAME):
        vocabulary, keep = engine.incremental_fit(DIRECTORY_DATA, CLEAN_DATA_FILE_NAME, cleaner.labelsS,
                                                  MIN_FREQUENCY, keep, engine=engine_type, initial_max_iter=100, w=2000, s=1, runInitialTrain=True)
    else:
        vocabulary, keep = engine.get_vocab(
            DIRECTORY_DATA, CLEAN_DATA_FILE_NAME, cleaner.labelsS, MIN_FREQUENCY, keep)
    pTimer("Generating counting grid artifacts.")

    dataFolders = [DIRECTORY_DATA] + \
        [f.path for f in os.scandir(DIRECTORY_DATA) if f.is_dir()]
    # we know a priori it should be [".\\","\\iter0","./iter1",...]
    dataFolders.sort()
except Exception as e:
    print(e)
finally:
    # ---------------------------------------------------------------------------------------
    # Output
    # ---------------------------------------------------------------------------------------
    for i, folder in enumerate(dataFolders):
        LINK_FILE_NAME = ""
        bcag = BrowseCloudArtifactGenerator(folder)
        if os.path.exists(folder + LEARNED_GRID_FILE_NAME):
            bcag.read(LEARNED_GRID_FILE_NAME)
            bcag.write_docmap(engine.wd_size, engine=engine_type)
            bcag.write_counts()
            bcag.write_vocabulary(vocabulary)
            bcag.write_top_pi()
            bcag.write_top_pi_layers()
            bcag.write_colors()  # write default blue colors
            bcag.write_correspondences(correspondences, vocabulary)
            if i == 0:
                bcag.write_database(df, keep)
                bcag.write_keep(keep)
    pTimer("Done.")
