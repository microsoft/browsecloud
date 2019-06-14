// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { FormsModule } from '@angular/forms';
import {
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule
} from '@angular/material';

import { BrowseCloudService } from '@browsecloud/services';
import { BapiLoaderModule } from '@browsecloud/shared/bapi-loader/bapi-loader.module';
import { AddJobDialogComponent } from './add-job-dialog.component';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,

        MatButtonModule,
        MatDialogModule,
        MatSelectModule,
        MatFormFieldModule,
        MatInputModule,
        FlexLayoutModule,

        BapiLoaderModule,
    ],
    exports: [AddJobDialogComponent],
    declarations: [AddJobDialogComponent],
    entryComponents: [AddJobDialogComponent],
    providers: [
        BrowseCloudService,
    ],
})
export class AddJobDialogModule {}
