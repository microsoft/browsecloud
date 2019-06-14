// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material';
import { BrowserModule } from '@angular/platform-browser';

import { BapiLoaderComponent } from './bapi-loader.component';

@NgModule({
    imports: [
        BrowserModule,
        CommonModule,

        MatProgressSpinnerModule,
    ],
    declarations: [
        BapiLoaderComponent,
    ],
    exports: [
        BapiLoaderComponent,
    ],
})
export class BapiLoaderModule { }
