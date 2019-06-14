// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MatButtonModule } from '@angular/material';

import { DocumentEntryCardComponent } from './document-entry-card.component';

@NgModule({
    imports: [
        CommonModule,

        FlexLayoutModule,
        MatButtonModule,
    ],
    exports: [DocumentEntryCardComponent],
    declarations: [DocumentEntryCardComponent],
    entryComponents: [DocumentEntryCardComponent],
})
export class DocumentEntryCardModule {}
