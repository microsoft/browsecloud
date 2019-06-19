# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

import hashlib
import json
import datetime
import pandas as pd
import os
import numpy as np
from CountingGridsPy.models import CountingGridModel
import traceback
from browseCloudServiceAuthorizer import BrowseCloudServiceAuthorizer
from countingGridsHeartBeater import CountingGridsHeartBeater
from jobStatus import JobStatus
from batchJob import BatchJob
import azure.storage.blob as azureblob
from browseCloudAzureUtilities import upload_file_to_container, download_file_from_container
import matplotlib.pyplot as plt
from CountingGridsPy.EngineToBrowseCloudPipeline import BrowseCloudArtifactGenerator, CGEngineWrapper, NLPCleaner, PipelineTimer
import sys
sys.path.append("../../..")


# CLI: python generateCountingGridsFromAzure.py <input_containername> <extent_size_of_grid_hyperparameter>
# <window_size_of_grid_hyperparameter> <engine_type> <inputfile_type> <inputfile_name> <output_containername>
#
# Example CLI: python generateCountingGridsFromAzure.py trainingdata 24 5 numpyEngine simpleInput dictionaryVerySmallSample.txt bighash

# Assumes: input_containername and output_containername must be <64 characters long.
if __name__ == "__main__":
    HEART_BEATER = None
    try:
        # ---------------------------------------------------------------------------------------
        # Input
        # ---------------------------------------------------------------------------------------

        errStr = "Please give valid command-line arguments."
        if len(sys.argv) != 8:
            raise ValueError(errStr)

        containerNameIn = sys.argv[1]
        EXTENT_SIZE = int(sys.argv[2])
        WINDOW_SIZE = int(sys.argv[3])
        engine_type = sys.argv[4]
        inputfile_type = sys.argv[5]
        blobName = sys.argv[6]
        containerNameOut = sys.argv[7]
        if engine_type != "numpyEngine" and engine_type != "matlabEngine":
            raise ValueError(
                "The {0} engine does not exist. Please use 'matlabEngine' or 'numpyEngine'.".format(engine_type))
        engine_type = engine_type[:-6]  # 6 characters in the word "Engine"
        if inputfile_type != "metadataInput" and inputfile_type != "simpleInput":
            raise ValueError(
                "The {0} input type does not exist. Please use 'simpleInput' or 'metadataInput'.".format(inputfile_type))
        inputfile_type = inputfile_type[:-5]  # remove "Input"

        # ---------------------------------------------------------------------------------------
        # Authentication
        # ---------------------------------------------------------------------------------------
        AUTH_URL = ""
        SERVICE_URL = ""
        _STORAGE_ACCOUNT_NAME_IN = 'browsecloudtrainingdata'
        _STORAGE_ACCOUNT_KEY_IN = ""
        _STORAGE_ACCOUNT_NAME_OUT = 'browsecloudmodelfiles'
        _STORAGE_ACCOUNT_KEY_OUT = ""

        jobId = containerNameOut
        docId = containerNameIn
        with open('metadata.json', 'r') as fMeta:
            dataMeta = json.load(fMeta)
            AUTH_URL = dataMeta["AUTH_URL"]
            _STORAGE_ACCOUNT_NAME_IN = dataMeta["_STORAGE_ACCOUNT_NAME_TRAININGDATA"]
            _STORAGE_ACCOUNT_KEY_OUT = dataMeta["_STORAGE_ACCOUNT_NAME_MODELS"]
            if dataMeta['ENV'] == 'DEV':
                # TODO: Use key vault and certificate
                # to retreive that information instead of temp file for keys.
                # Note that keys.json is not checked in.
                with open("keys.json", "r") as f:
                    data = json.load(f)
                    _STORAGE_ACCOUNT_KEY_IN = data['_STORAGE_ACCOUNT_KEY_DEV']
                    _STORAGE_ACCOUNT_KEY_OUT = data['_STORAGE_ACCOUNT_KEY_OUT_DEV']
                    _STORAGE_ACCOUNT_NAME_OUT = data['_STORAGE_ACCOUNT_NAME_OUT_DEV'] if (
                        '_STORAGE_ACCOUNT_NAME_OUT_DEV' in data
                    ) else _STORAGE_ACCOUNT_NAME_OUT
                    _STORAGE_ACCOUNT_NAME_IN = data['_STORAGE_ACCOUNT_NAME_IN_DEV'] if (
                        '_STORAGE_ACCOUNT_NAME_IN_DEV' in data
                    ) else _STORAGE_ACCOUNT_NAME_IN
                    SERVICE_URL = dataMeta["SERVICE_URL_DEV"] + "/api/v1/jobs/" + \
                        jobId if "SERVICE_URL_DEV" in dataMeta else SERVICE_URL
            elif dataMeta['ENV'] == 'PROD':
                with open("keys.json", "r") as f:
                    data = json.load(f)
                    _STORAGE_ACCOUNT_KEY_IN = data['_STORAGE_ACCOUNT_KEY_PROD']
                    _STORAGE_ACCOUNT_KEY_OUT = data['_STORAGE_ACCOUNT_KEY_OUT_PROD']
                    _STORAGE_ACCOUNT_NAME_OUT = data['_STORAGE_ACCOUNT_NAME_OUT_PROD'] if (
                        '_STORAGE_ACCOUNT_NAME_OUT_PROD' in data
                    ) else _STORAGE_ACCOUNT_NAME_OUT
                    _STORAGE_ACCOUNT_NAME_IN = data['_STORAGE_ACCOUNT_NAME_IN_PROD'] if (
                        '_STORAGE_ACCOUNT_NAME_IN_PROD' in data
                    ) else _STORAGE_ACCOUNT_NAME_IN
                    SERVICE_URL = dataMeta["SERVICE_URL_PROD"] + "/api/v1/jobs/" + \
                        jobId if "SERVICE_URL_PROD" in dataMeta else SERVICE_URL
            else:
                raise ValueError(
                    "Environment type in metadata.json is invalid.")

        BATCH_JOB = BatchJob(jobId, JobStatus.NotStarted, 0)
        SERVICE_AUTHORIZER = BrowseCloudServiceAuthorizer(AUTH_URL)
        HEART_BEATER = CountingGridsHeartBeater(
            SERVICE_URL, BATCH_JOB, SERVICE_AUTHORIZER)

        DIRECTORY_SUFFIX = hashlib.sha3_256(
            (docId+blobName+str(datetime.datetime.now())).encode()).hexdigest()
        DIRECTORY_DATA = blobName.split(".")[0] + "_" + DIRECTORY_SUFFIX

        if not os.path.isdir(DIRECTORY_DATA):
            os.mkdir(DIRECTORY_DATA)

        '''
        Algorithm:
            1.  Get training data from Azure.
            2.  Run learning code.
            3.  Write model files to Azure.


        Changes between this and dumpCountingGrids.py:
        1. DIRECTORY_DIR must be unique.
        2. Fetching and writing to Azure. Idea is to fetch into directory and then write it to Azure
        '''
        blob_client = azureblob.BlockBlobService(
            account_name=_STORAGE_ACCOUNT_NAME_IN,
            account_key=_STORAGE_ACCOUNT_KEY_IN)

        download_file_from_container(
            blob_client, containerNameIn, DIRECTORY_DATA+"/"+blobName, blobName)

        FILE_NAME = DIRECTORY_DATA + "\\" + blobName

        CLEAN_DATA_FILE_NAME, MIN_FREQUENCY, MIN_WORDS = [
            "\cg-processed.tsv", 2, 5]

        # ---------------------------------------------------------------------------------------
        # Data Cleaning
        # ---------------------------------------------------------------------------------------

        cleaner = NLPCleaner()
        HEART_BEATER.next()
        correspondences = None
        CACHED_CORRESPONDENCES_FILE_NAME = "\cached_correspondences.tsv"
        pTimer = PipelineTimer()
        pTimer("Reading data file.")
        df, keep = cleaner.read(
            FILE_NAME, inputfile_type, MIN_FREQUENCY, MIN_WORDS)
        if not (os.path.exists(DIRECTORY_DATA + CACHED_CORRESPONDENCES_FILE_NAME) and os.path.exists(DIRECTORY_DATA + CLEAN_DATA_FILE_NAME)):
            pTimer("Starting data cleaning.")
            cleaner.handle_negation_tokens()
            cleaner.removePunctuation()
            HEART_BEATER.makeProgress(50)
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

        # ---------------------------------------------------------------------------------------
        # Learning
        # ---------------------------------------------------------------------------------------
        engine = CGEngineWrapper(
            extent_size=EXTENT_SIZE, window_size=WINDOW_SIZE, heartBeaters=[HEART_BEATER])
        HEART_BEATER.next()
        vocabulary = None
        if not os.path.exists(DIRECTORY_DATA + LEARNED_GRID_FILE_NAME):
            vocabulary, keep = engine.fit(
                DIRECTORY_DATA, CLEAN_DATA_FILE_NAME, cleaner.labelsS, MIN_FREQUENCY, keep, engine=engine_type)
        else:
            vocabulary, keep = engine.get_vocab(
                DIRECTORY_DATA, CLEAN_DATA_FILE_NAME, cleaner.labelsS, MIN_FREQUENCY, keep)


        # ---------------------------------------------------------------------------------------
        # Output
        # ---------------------------------------------------------------------------------------
        pTimer("Generating counting grid artifacts.")
        LINK_FILE_NAME = ""
        bcag = BrowseCloudArtifactGenerator(DIRECTORY_DATA)
        bcag.read(LEARNED_GRID_FILE_NAME)
        bcag.write_docmap(engine.wd_size, engine=engine_type)
        bcag.write_counts()
        bcag.write_vocabulary(vocabulary)
        bcag.write_top_pi()
        bcag.write_top_pi_layers()
        bcag.write_colors()  # write default blue colors
        bcag.write_database(df, keep)
        bcag.write_correspondences(correspondences, vocabulary)
        bcag.write_keep(keep)

        pTimer("Done.")

        blob_client = azureblob.BlockBlobService(
            account_name=_STORAGE_ACCOUNT_NAME_OUT,
            account_key=_STORAGE_ACCOUNT_KEY_OUT)

        # apply some recursion to create multiple container once uniqueness is problem
        blob_client.create_container(containerNameOut)

        # upload each file, aside from the input file into
        FILES = [f.path for f in os.scandir(DIRECTORY_DATA) if not f.is_dir()]
        for modelfile in FILES:
            if not modelfile.endswith(blobName):
                upload_file_to_container(
                    blob_client, containerNameOut, modelfile)
    except Exception as e:
        HEART_BEATER.done(success=False) if HEART_BEATER is not None else False
        print("Script failed.")
        print(traceback.format_exc())
    except:
        HEART_BEATER.done(success=False) if HEART_BEATER is not None else False
        print("Script failed.")
        print(traceback.format_exc())

    else:
        HEART_BEATER.done(success=True)
        print("Script succeeded.")
