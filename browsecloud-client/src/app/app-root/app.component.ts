// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatDialog, MatSnackBar } from '@angular/material';
import { NavigationEnd, Router } from '@angular/router';

import { ApplicationInsightsService } from '@ngx-engoy/diagnostics-application-insights';
import { LoggerService } from '@ngx-engoy/diagnostics-core';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

import { AuthService, ErrorService } from '@browsecloud/services';
import { ErrorDialogComponent } from '@browsecloud/shared';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit, OnDestroy {
    public name: string;
    public currentUrl = '/';

    private errorSubscription: Subscription;
    private routeSubscription: Subscription;

    constructor(
        private authService: AuthService,
        private errorService: ErrorService,
        private snackBar: MatSnackBar,
        private dialog: MatDialog,
        private loggerService: LoggerService,
        private router: Router
    ) { }

    public ngOnInit(): void {
        const user = this.authService.getUser();

        const applicationInsightsService = this.loggerService.getTrackerService<ApplicationInsightsService>();

        if (user != null) {
            this.name = user.name;

            applicationInsightsService.setAuthenticatedUserContext(user.name);
            // Note: For consistency, use camel case for property names.
            applicationInsightsService.setCommonProperties({
                'user.id': user.idToken['oid'],
                'user.principalName': user.displayableId,
            });
        }

        this.routeSubscription = this.router.events
            .pipe(
                filter((event) => event instanceof NavigationEnd)
            )
            .subscribe(
                (nav: NavigationEnd) => {
                    const queryIndex = nav.url.indexOf('?');
                    this.currentUrl = nav.url.substring(0, queryIndex === -1 ? nav.url.length : queryIndex);
                }
            );

        this.errorSubscription = this.errorService.newErrorSubject
            .subscribe(
                (error) => {
                    const isHttpError = error.error != null && error.error.error != null && error.error.error.message != null;
                    const snackBarRef = this.snackBar.open(error.message, isHttpError === true ? 'More Info' : 'Refresh Page', {
                        duration: error.snackBarDuration,
                    });
                    snackBarRef.onAction()
                        .subscribe(
                            // No unsubscribe needed. Observable completes.
                            () => {
                                if (isHttpError === true) {
                                    const dialogRef = this.dialog.open(ErrorDialogComponent);
                                    dialogRef.componentInstance.setError(error);
                                } else {
                                    location.reload();
                                }
                            }
                        );
                }
            );
    }

    public ngOnDestroy(): void {
        if (this.errorSubscription != null) {
            this.errorSubscription.unsubscribe();
        }

        if (this.routeSubscription != null) {
            this.routeSubscription.unsubscribe();
        }
    }

    public onLogout(): void {
        this.authService.logout();
    }
}
