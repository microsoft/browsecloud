// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MatSliderModule } from '@angular/material';

import { CloudViewComponent } from './cloud-view.component';

@NgModule({
    imports: [
        CommonModule,

        FlexLayoutModule,
        MatSliderModule,
    ],
    exports: [CloudViewComponent],
    declarations: [CloudViewComponent],
    entryComponents: [CloudViewComponent],
})
export class CloudViewModule {}
