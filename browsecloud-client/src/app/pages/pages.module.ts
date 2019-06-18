// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { FormsModule } from '@angular/forms';
import {
    MatButtonModule,
    MatCheckboxModule,
    MatChipsModule,
    MatDialogModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatInputModule,
    MatMenuModule,
    MatProgressBarModule,
    MatSortModule,
    MatTableModule,
    MatTabsModule,
    MatTooltipModule
} from '@angular/material';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterModule } from '@angular/router';

import { FileSaverModule } from 'ngx-filesaver';

import { AuthService, BrowseCloudService, JobUpdateService } from '@browsecloud/services';
import {
    AddDocumentDialogModule,
    AddJobDialogModule,
    BapiLoaderModule,
    CloudViewModule,
    DocumentEntryCardModule,
    EditDocumentDialogModule,
    LegendModule,
    LoadingGreyoutModule
} from '@browsecloud/shared';
import { DashboardComponent } from './dashboard/dashboard.component';
import { DocumentComponent } from './document/document.component';
import { GalleryComponent } from './gallery/gallery.component';
import { HomeComponent } from './home/home.component';
import { LoginComponent } from './login/login.component';
import { NotFoundComponent } from './not-found/not-found.component';

@NgModule({
    declarations: [
        HomeComponent,
        DashboardComponent,
        DocumentComponent,
        NotFoundComponent,
        LoginComponent,
        GalleryComponent,
    ],
    imports: [
        BrowserModule,
        RouterModule,
        BrowserAnimationsModule,
        HttpClientModule,
        FormsModule,

        MatDialogModule,
        MatButtonModule,
        FlexLayoutModule,
        MatExpansionModule,
        MatMenuModule,
        MatSortModule,
        MatTableModule,
        MatFormFieldModule,
        MatInputModule,
        MatCheckboxModule,
        MatProgressBarModule,
        MatTabsModule,
        MatChipsModule,
        MatTooltipModule,

        FileSaverModule,

        AddJobDialogModule,
        AddDocumentDialogModule,
        BapiLoaderModule,
        LoadingGreyoutModule,
        EditDocumentDialogModule,
        CloudViewModule,
        DocumentEntryCardModule,
        LegendModule,
    ],
    providers: [
        AuthService,
        BrowseCloudService,
        JobUpdateService,
    ],
})
export class PagesModule { }
