// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { NgModule } from '@angular/core';
import {
    MAT_LABEL_GLOBAL_OPTIONS,
    MAT_RIPPLE_GLOBAL_OPTIONS,
    RippleGlobalOptions
} from '@angular/material';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterModule } from '@angular/router';

import { environment } from '@browsecloud/environments/environment';
import { BrowseCloudService, ErrorService, JobUpdateService } from '@browsecloud/services';
import {
    ApplicationInsightsConfiguration,
    ApplicationInsightsService,
    NgxDiagnosticsApplicationInsightsModule
} from '@ngx-diagnostics/application-insights';
import { NgxDiagnosticsCoreModule } from '@ngx-diagnostics/core';
import { DocumentComponent } from '../pages/document/document.component';
import { PagesModule } from '../pages/pages.module';

export const appInsightsConfiguration: ApplicationInsightsConfiguration = {
    isEnabled: environment.appInsights.isEnabled,
    instrumentationKey: environment.appInsights.instrumentationKey,
    applicationName: environment.appInsights.applicationName,
};

export const globalRippleConfig: RippleGlobalOptions = {
    disabled: true,
    animation: {
        enterDuration: 0,
        exitDuration: 0,
    },
};

@NgModule({
    imports: [
        BrowserModule,
        BrowserAnimationsModule,
        RouterModule.forRoot([]),

        NgxDiagnosticsCoreModule.forRoot(ApplicationInsightsService),
        NgxDiagnosticsApplicationInsightsModule.forRoot(appInsightsConfiguration),

        PagesModule,
    ],
    providers: [
        BrowseCloudService,
        JobUpdateService,
        ErrorService,
        { provide: MAT_RIPPLE_GLOBAL_OPTIONS, useValue: globalRippleConfig },
        { provide: MAT_LABEL_GLOBAL_OPTIONS, useValue: {float: 'always'} },
    ],
    bootstrap: [
        DocumentComponent,
    ],
})
export class AppModule { }
