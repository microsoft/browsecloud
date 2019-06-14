// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { autoserialize } from 'cerialize';

export class BrowseCloudFontSettings {
    @autoserialize public minimum: number;
    @autoserialize public quadraticWeight: number;
}
