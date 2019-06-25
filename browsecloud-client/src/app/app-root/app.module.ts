// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import {
    MAT_LABEL_GLOBAL_OPTIONS,
    MAT_RIPPLE_GLOBAL_OPTIONS,
    MatButtonModule,
    MatDialogModule,
    MatMenuModule,
    MatSnackBarModule,
    MatToolbarModule,
    RippleGlobalOptions
} from '@angular/material';
import { BrowserModule } from '@angular/platform-browser';

import {
    ApplicationInsightsConfiguration, ApplicationInsightsService, NgxDiagnosticsApplicationInsightsModule
} from '@ngx-engoy/diagnostics-application-insights';
import { NgxDiagnosticsCoreModule } from '@ngx-engoy/diagnostics-core';

import { AuthService, ErrorService } from '@browsecloud/services';
import { ErrorDialogModule } from '@browsecloud/shared';
import { environment } from 'src/environments/environment';
import { LoggedInGuard, NeedLoginGuard } from '../guards';
import { PagesModule } from '../pages/pages.module';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

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
    declarations: [
        AppComponent,
    ],
    imports: [
        BrowserModule,

        MatToolbarModule,
        MatButtonModule,
        MatMenuModule,
        MatSnackBarModule,
        MatDialogModule,
        FlexLayoutModule,

        NgxDiagnosticsCoreModule.forRoot(ApplicationInsightsService),
        NgxDiagnosticsApplicationInsightsModule.forRoot(appInsightsConfiguration),

        ErrorDialogModule,
        PagesModule,
        AppRoutingModule,
    ],
    providers: [
        AuthService,
        ErrorService,
        LoggedInGuard,
        NeedLoginGuard,
        { provide: MAT_RIPPLE_GLOBAL_OPTIONS, useValue: globalRippleConfig },
        { provide: MAT_LABEL_GLOBAL_OPTIONS, useValue: {float: 'always'} },
    ],
    bootstrap: [AppComponent],
})
export class AppModule { }
