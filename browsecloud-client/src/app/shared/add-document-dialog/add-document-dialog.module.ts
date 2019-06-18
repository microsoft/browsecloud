// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule, MatCheckboxModule, MatDialogModule, MatFormFieldModule, MatInputModule } from '@angular/material';

import { BrowseCloudService } from '@browsecloud/services';
import { BapiLoaderModule } from '@browsecloud/shared/bapi-loader/bapi-loader.module';
import { AddDocumentDialogComponent } from './add-document-dialog.component';

@NgModule({
    imports: [
        CommonModule,
        ReactiveFormsModule,

        MatButtonModule,
        MatDialogModule,
        MatFormFieldModule,
        MatInputModule,
        MatCheckboxModule,
        FlexLayoutModule,

        BapiLoaderModule,
    ],
    exports: [AddDocumentDialogComponent],
    declarations: [AddDocumentDialogComponent],
    entryComponents: [AddDocumentDialogComponent],
    providers: [
        BrowseCloudService,
    ],
})
export class AddDocumentDialogModule {}
