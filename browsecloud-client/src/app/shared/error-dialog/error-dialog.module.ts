// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MatDialogModule } from '@angular/material';

import { ErrorDialogComponent } from './error-dialog.component';

@NgModule({
    imports: [
        CommonModule,

        MatDialogModule,
        FlexLayoutModule,
    ],
    exports: [ErrorDialogComponent],
    declarations: [ErrorDialogComponent],
    entryComponents: [ErrorDialogComponent],
})
export class ErrorDialogModule {}
