// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { BrowserModule } from '@angular/platform-browser';

import { BapiLoaderModule } from '@browsecloud/shared/bapi-loader/bapi-loader.module';
import { LoadingGreyoutComponent } from './loading-greyout.component';

@NgModule({
    imports: [
        BrowserModule,
        CommonModule,

        FlexLayoutModule,

        BapiLoaderModule,
    ],
    providers: [
    ],
    declarations: [
        LoadingGreyoutComponent,
    ],
    exports: [
        LoadingGreyoutComponent,
    ],
})
export class LoadingGreyoutModule { }
