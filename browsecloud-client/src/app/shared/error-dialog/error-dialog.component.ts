// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Component } from '@angular/core';

import { IBrowseCloudError } from '@browsecloud/services';

@Component({
    selector: 'app-error-dialog',
    templateUrl: './error-dialog.component.html',
})
export class ErrorDialogComponent {
    public browseCloudError: IBrowseCloudError;

    public setError(browseCloudError: IBrowseCloudError): void {
        this.browseCloudError = browseCloudError;
    }
}
