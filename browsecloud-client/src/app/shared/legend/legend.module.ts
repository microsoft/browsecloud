// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';

import { LegendComponent } from './legend.component';

@NgModule({
    imports: [
        CommonModule,

        FlexLayoutModule,
    ],
    exports: [LegendComponent],
    declarations: [LegendComponent],
    entryComponents: [LegendComponent],
})
export class LegendModule {}
