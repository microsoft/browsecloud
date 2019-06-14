// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { autoserialize } from 'cerialize';

export class BrowseCloudFileValidationResponse {
    @autoserialize public isValid: boolean;
    @autoserialize public message: string;
}
