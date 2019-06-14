// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule, MatCheckboxModule, MatDialogModule, MatFormFieldModule, MatInputModule } from '@angular/material';

import { BrowseCloudService } from '@browsecloud/services';
import { BapiLoaderModule } from '@browsecloud/shared/bapi-loader/bapi-loader.module';
import { UserInputModule } from '@browsecloud/shared/user-input/user-input.module';
import { EditDocumentDialogComponent } from './edit-document-dialog.component';

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
        UserInputModule,
    ],
    exports: [EditDocumentDialogComponent],
    declarations: [EditDocumentDialogComponent],
    entryComponents: [EditDocumentDialogComponent],
    providers: [
        BrowseCloudService,
    ],
})
export class EditDocumentDialogModule {}
