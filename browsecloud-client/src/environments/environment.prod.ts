// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export const environment = {
    production: true,
    serviceURL: 'http://localhost',
    auth: {
        clientId: 'a19cbb16-278c-49eb-8a8b-66551afee502',
        serviceScopes: [
            'https://microsoft.onmicrosoft.com/BrowseCloud.Service/BrowseCloud.Access',
        ],
        graphScopes: [
            'https://graph.microsoft.com/User.ReadBasic.All',
            'https://graph.microsoft.com/User.Read',
        ],
        authority: 'https://login.microsoftonline.com/microsoft.onmicrosoft.com',
    },
    appInsights: {
        isEnabled: false,
        instrumentationKey: '',
        applicationName: 'BrowseCloud.Client.Prod',
    },
};
