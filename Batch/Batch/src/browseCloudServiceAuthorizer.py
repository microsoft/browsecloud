# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

import json
import adal
from msrestazure.azure_active_directory import AADTokenCredentials
import requests


class BrowseCloudServiceAuthorizer():
    '''
    Retrieves credentials for backend to send incremental results to the trainer.

    Example:

    url = 'https://contoso-browsecloud-service.azurewebsites.net/api/v1/documents'
    bcsa = BrowseCloudServiceAuthorizer(resource_uri='https://contoso.oncontoso.com/BrowseCloud.Service')
    headers = {'Content-Type': "application/json", 'Accept': "application/json", 'Authorization': bcsa.authOutput()}
    res = requests.get(url, headers=headers)
    print(res.text)
    '''

    def __init__(self, resource_uri: str):
        self.token = ""
        self.resource_uri = resource_uri

    def retrieveToken(self):
        """
        Authenticate using service principal w/ key.
        """
        if self.resource_uri != "":

            client_id = ""
            client_secret = ""
            authority_host_uri = ""
            tenant = ""
            # TODO: get this from key vault
            with open("metadata.json", "r") as f:
                data = json.load(f)
                client_id = data['CLIENT_ID']
                client_secret = data['CLIENT_SECRET']
                authority_host_uri = data["AUTHORITY_HOST_URI"]
                tenant = data["TENANT"]

            authority_uri = authority_host_uri + '/' + tenant
            resource_uri = self.resource_uri

            context = adal.AuthenticationContext(
                authority_uri, api_version=None)
            self.token = context.acquire_token_with_client_credentials(
                resource_uri, client_id, client_secret)
            credentials = AADTokenCredentials(self.token, client_id)

    # Returns:'Bearer <MY_TOKEN>'

    def authOutput(self):
        self.retrieveToken()
        return 'Bearer ' + self.token['accessToken']
