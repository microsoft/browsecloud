# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

from __future__ import print_function
import datetime
import io
import os
import sys
import time
from datetime import timedelta
import json
from browseCloudAzureUtilities import *

import azure.storage.blob as azureblob
import azure.batch.batch_service_client as batch
import azure.batch.batch_auth as batchauth
import azure.batch.models as batchmodels


from azure.batch import BatchServiceClient
from azure.common.credentials import ServicePrincipalCredentials

sys.path.append('.')
sys.path.append('..')


# Update the Batch and Storage account credential strings below with the values
# unique to your accounts. These are used when constructing connection strings
# for the Batch and Storage client objects.

_BATCH_ACCOUNT_NAME = ""
_BATCH_ACCOUNT_KEY = ""
_BATCH_ACCOUNT_URL = ""
_SERVICE_PRINCIPAL_KEY = ""

with open("keys.json", "r") as f:
    data = json.load(f)
    _BATCH_ACCOUNT_KEY = data['_BATCH_ACCOUNT_KEY']
    _SERVICE_PRINCIPAL_KEY = data['_SERVICE_PRINCIPAL_KEY_DEV']


if __name__ == '__main__':

    start_time = datetime.datetime.now().replace(microsecond=0)
    print('Sample start: {}'.format(start_time))
    print()

    # Create a Batch service client. We'll now be interacting with the Batch
    # service in addition to Storage
    '''
    credentials = batchauth.SharedKeyCredentials(_BATCH_ACCOUNT_NAME,
                                                 _BATCH_ACCOUNT_KEY)
    '''
    # Have separate applications, deployment locations, scaling formulae, etc., for dev and prod
    # This is read from a file

    JOB_ID = ""
    POOL_VM_SIZE = ""
    POOL_ID = ""
    IMAGE_NAME = ""
    SCALING_FORMULA = ""
    VERSIONS = []
    TENANT_ID = ""
    CLIENT_ID = ""

    with open('metadata.json', 'r') as fMeta:
        dataMeta = json.load(fMeta)
        TENANT_ID = dataMeta["TENANT_ID_DEPLOYMENT_AND_TESTING"]
        CLIENT_ID = dataMeta["CLIENT_ID_DEPLOYMENT_AND_TESTING"]
        _BATCH_ACCOUNT_NAME = dataMeta["_BATCH_ACCOUNT_NAME"]
        _BATCH_ACCOUNT_URL = dataMeta["_BATCH_ACCOUNT_URL"]

        if dataMeta['ENV'] == 'DEV':
            JOB_ID = dataMeta['JOB_ID_DEV']
            POOL_VM_SIZE = dataMeta['POOL_VM_SIZE_DEV']
            POOL_ID = dataMeta['POOL_ID_DEV']
            IMAGE_NAME = dataMeta['IMAGE_NAME_DEV']
            SCALING_FORMULA = dataMeta['SCALING_FORMULA_DEV']
            VERSIONS = dataMeta['VERSIONS_DEV']
        elif dataMeta['ENV'] == 'PROD':
            JOB_ID = dataMeta['JOB_ID_PROD']
            POOL_VM_SIZE = dataMeta['POOL_VM_SIZE_PROD']
            POOL_ID = dataMeta['POOL_ID_PROD']
            IMAGE_NAME = dataMeta['IMAGE_NAME_PROD']
            SCALING_FORMULA = dataMeta['SCALING_FORMULA_PROD']
            VERSIONS = dataMeta['VERSIONS_PROD']
        else:
            raise ValueError("Environment type in metadata.json is invalid.")

    SECRET = _SERVICE_PRINCIPAL_KEY

    credentials = ServicePrincipalCredentials(
        client_id=CLIENT_ID,
        secret=SECRET,
        tenant=TENANT_ID,
        resource="https://batch.core.windows.net/"
    )

    batch_client = batch.BatchServiceClient(
        credentials,
        base_url=_BATCH_ACCOUNT_URL)

    try:
        # Create the pool that will contain the compute nodes that will execute the
        # tasks.

        create_pool(batch_client, POOL_ID, POOL_VM_SIZE,
                    IMAGE_NAME, VERSIONS, SCALING_FORMULA)

        # Create the job that will run the tasks.
        create_job(batch_client, JOB_ID, POOL_ID)

        print("  Success! All tasks reached the 'Completed' state within the "
              "specified timeout period.")

    except batchmodels.BatchErrorException as err:
        print_batch_exception(err)
        raise

    # Print out some timing info
    end_time = datetime.datetime.now().replace(microsecond=0)
    print()
    print('Sample end: {}'.format(end_time))
    print('Elapsed time: {}'.format(end_time - start_time))
    print()
    print()
    input('Press ENTER to exit...')
