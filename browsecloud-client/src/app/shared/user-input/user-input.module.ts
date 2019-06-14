// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule, MatChipsModule, MatFormFieldModule, MatInputModule } from '@angular/material';
import { BrowserModule } from '@angular/platform-browser';

import { GraphService } from '@browsecloud/services';
import { BapiLoaderModule } from '../bapi-loader/bapi-loader.module';
import { UserInputComponent } from './user-input.component';

@NgModule({
    imports: [
        BrowserModule,
        CommonModule,
        ReactiveFormsModule,

        FlexLayoutModule,
        MatFormFieldModule,
        MatInputModule,
        MatChipsModule,
        MatAutocompleteModule,

        BapiLoaderModule,
    ],
    providers: [
        GraphService,
    ],
    declarations: [
        UserInputComponent,
    ],
    exports: [
        UserInputComponent,
    ],
})
export class UserInputModule { }
