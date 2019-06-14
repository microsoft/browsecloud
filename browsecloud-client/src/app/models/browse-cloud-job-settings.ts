// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { autoserializeAs } from 'cerialize';

import { BrowseCloudFontSettings } from './browse-cloud-font-settings';

export class BrowseCloudJobSettings {
    @autoserializeAs(BrowseCloudFontSettings) public fontSettings?: BrowseCloudFontSettings;
}
