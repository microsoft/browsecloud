# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

import hashlib
import json
import datetime
import pandas as pd
import os
import numpy as np
import requests
import re
import traceback
from itertools import islice
from browseCloudServiceAuthorizer import BrowseCloudServiceAuthorizer
from countingGridsHeartBeater import CountingGridsHeartBeater
from jobStatus import JobStatus
from batchJob import BatchJob
import azure.storage.blob as azureblob
from browseCloudAzureUtilities import upload_file_to_container, download_file_from_container
import matplotlib.pyplot as plt
from CountingGridsPy.EngineToBrowseCloudPipeline import BrowseCloudArtifactGenerator, PipelineTimer
import sys
sys.path.append("../../..")

if __name__ == "__main__":
    HEART_BEATER = None
    try:
        errStr = "Please give valid command-line arguments."
        if len(sys.argv) != 5:
            raise ValueError(errStr)

        containerNameIn = sys.argv[1]  # targetId
        metadataColumnName = sys.argv[2]  # targetId
        containerNameOut = sys.argv[3]  # id of current job
        windowSize = int(sys.argv[4])  # window size

        AUTH_URL = ""
        SERVICE_URL = ""

        _STORAGE_ACCOUNT_NAME = 'browsecloudmodelfiles'
        _STORAGE_ACCOUNT_KEY = ''

        jobId = containerNameOut
        targetId = containerNameIn

        with open("keys.json", "r") as f:
            data = json.load(f)
            _SENTIMENT_ANALYSIS_KEY = data['_SENTIMENT_ANALYSIS_KEY']

        with open('metadata.json', 'r') as fMeta:
            dataMeta = json.load(fMeta)
            AUTH_URL = dataMeta["AUTH_URL"]
            if dataMeta['ENV'] == 'DEV':
                # TODO: Use key vault and certificate to retreive that information
                # instead of temp file for keys.
                # Note that keys.json is not checked in.
                with open("keys.json", "r") as f:
                    data = json.load(f)
                    _STORAGE_ACCOUNT_KEY = data['_STORAGE_ACCOUNT_KEY_OUT_DEV']
                    _STORAGE_ACCOUNT_NAME = data['_STORAGE_ACCOUNT_NAME_OUT_DEV'] if (
                        '_STORAGE_ACCOUNT_NAME_OUT_DEV' in data
                     ) else _STORAGE_ACCOUNT_NAME
                    SERVICE_URL = dataMeta["SERVICE_URL_DEV"] + "/api/v1/jobs/" + \
                        jobId if "SERVICE_URL_DEV" in dataMeta else SERVICE_URL
            elif dataMeta['ENV'] == 'PROD':
                with open("keys.json", "r") as f:
                    data = json.load(f)
                    _STORAGE_ACCOUNT_KEY = data['_STORAGE_ACCOUNT_KEY_OUT_PROD']
                    _STORAGE_ACCOUNT_NAME = data['_STORAGE_ACCOUNT_NAME_OUT_PROD'] if (
                        '_STORAGE_ACCOUNT_NAME_OUT_PROD' in data
                     ) else _STORAGE_ACCOUNT_NAME
                    SERVICE_URL = dataMeta["SERVICE_URL_PROD"] + "/api/v1/jobs/" + \
                        jobId if "SERVICE_URL_PROD" in dataMeta else SERVICE_URL
            else:
                raise ValueError(
                    "Environment type in metadata.json is invalid.")

        BATCH_JOB = BatchJob(jobId, JobStatus.NotStarted, 0)
        SERVICE_AUTHORIZER = BrowseCloudServiceAuthorizer(AUTH_URL)
        HEART_BEATER = CountingGridsHeartBeater(
            SERVICE_URL, BATCH_JOB, SERVICE_AUTHORIZER)

        # Setup Working Directory.
        DIRECTORY_SUFFIX = hashlib.sha3_256(
            (targetId+str(datetime.datetime.now())).encode()).hexdigest()
        DIRECTORY_DATA = targetId + "_" + DIRECTORY_SUFFIX

        if not os.path.isdir(DIRECTORY_DATA):
            os.mkdir(DIRECTORY_DATA)

        '''
        Algorithm:
            1.  Copy everything over from target container to job container.
            2.  Separate and properly encode the feature column.
            3.  Weight documents on grid.
            3.  Output colors file.
            5.  Write legend file.
        '''
        pTimer = PipelineTimer()

        pTimer("Downloading Target Job Files.")

        # Heart beater to training state.
        HEART_BEATER.next()
        HEART_BEATER.next()

        blob_client = azureblob.BlockBlobService(
            account_name=_STORAGE_ACCOUNT_NAME,
            account_key=_STORAGE_ACCOUNT_KEY)

        all_blobs = blob_client.list_blobs(containerNameIn)

        for blob in all_blobs:
            download_file_from_container(
                blob_client, containerNameIn, DIRECTORY_DATA+"/"+blob.name, blob.name)

        HEART_BEATER.makeProgress(20)
        pTimer("Getting sentiment from Azure.")

        # Feature Mapping data
        raw_feature = []

        def dictionary_from_line(row):
            prop_dict = {}
            row_components = row.split('\t')
            for row_component in row_components:
                row_key_value = row_component.split(':')
                prop_dict[row_key_value[0]] = row_key_value[1]
            return prop_dict

        with open(DIRECTORY_DATA+"/database.txt", 'r') as f:
            for row in f:
                prop_dict = dictionary_from_line(row)
                raw_feature.append(prop_dict[metadataColumnName])

        # first, try to convert all values to numbers
        feature_map = []
        labelTuples = []
        cm = None
        try:
            feature_map = np.array([float(x) for x in raw_feature])
            labelTuples = [('{0:.3g}'.format(np.min(feature_map)) + " " + metadataColumnName,
                            '{0:.3g}'.format(np.max(feature_map)) + " " + metadataColumnName)]
            feature_map = (feature_map - np.min(feature_map)) / \
                (np.max(feature_map) - np.min(feature_map))
            cm = plt.get_cmap('cool')
        except:
            # Not all numbers. Try to do a 2-categorical
            set_of_values = set(raw_feature)

            if len(set_of_values) is not 2:
                raise ValueError(
                    "Selected metadata row is neither numerical nor 2-categorical")

            mask = [int(x == raw_feature[0]) for x in raw_feature]
            feature_map = np.array(mask)

            cm = plt.get_cmap('PiYG')
            labelTuples = [
                (list(set_of_values - set([raw_feature[0]]))[0], raw_feature[0])]

        HEART_BEATER.makeProgress(60)

        colorTuples = [(tuple(list(cm(0))[:-1]),
                        tuple(list(cm(127))[:-1]), tuple(list(cm(255))[:-1]))]

        pTimer("Generating counting grid artifacts.")
        LEARNED_GRID_FILE_NAME = "/CountingGridDataMatrices.mat"
        DOCMAP_FILE_NAME = "/docmap.txt"
        bcag = BrowseCloudArtifactGenerator(DIRECTORY_DATA)
        bcag.W = [windowSize, windowSize]
        bcag.read(LEARNED_GRID_FILE_NAME)
        bcag.read_docmap(DOCMAP_FILE_NAME, engine="numpy")
        bcag.write_colors(cm=cm, feature_map=feature_map,
                          stretch_the_truth=True)
        bcag.write_legends(labelTuples=labelTuples, colorTuples=colorTuples)
        bcag.add_feature_map_to_database(feature_map)

        HEART_BEATER.makeProgress(80)
        pTimer("Done.")

        blob_client.create_container(containerNameOut)

        # upload each file, aside from the input file into
        FILES = [f.path for f in os.scandir(DIRECTORY_DATA) if not f.is_dir()]
        for modelfile in FILES:
            upload_file_to_container(blob_client, containerNameOut, modelfile)

        HEART_BEATER.makeProgress(100)
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
