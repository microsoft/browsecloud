// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Injectable } from '@angular/core';

import { LoggerService } from '@ngx-diagnostics/core';
import { User, UserAgentApplication } from 'msal';
import { from, Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { environment } from '@browsecloud/environments/environment';
import { ErrorService } from './error.service';

@Injectable()
export class AuthService {
    // TODO: Investigate msal-angular.
    public userAgentApp: UserAgentApplication;

    constructor(
        private loggerService: LoggerService,
        private errorService: ErrorService
    ) {

        const localStorageWorks = this.localStorageWorks();
        this.userAgentApp = new UserAgentApplication(environment.auth.clientId, environment.auth.authority,
            (errorDesc, token, error, tokenType) => {
                if (token != null) {
                    this.loggerService.error(error);
                }
            },
            {
                cacheLocation: localStorageWorks === true ? 'localStorage' : 'sessionStorage',
                storeAuthStateInCookie: true,
                redirectUri: () => `${location.origin}/login`,
            }
        );
    }

    public login(): void {
        this.userAgentApp.loginRedirect([...environment.auth.serviceScopes, ...environment.auth.graphScopes]);
    }

    public logout(): void {
        this.userAgentApp.logout();
    }

    public getUser(): User {
        return this.userAgentApp.getUser();
    }

    public get loggedIn(): boolean {
        return this.userAgentApp.getUser() != null;
    }

    public acquireToken(scopes: string[]): Observable<string> {
        return from(this.userAgentApp.acquireTokenSilent(scopes))
            .pipe(
                catchError((error) => {
                    // Interactive token acquisition required if silent doesn't work.
                    this.userAgentApp.acquireTokenRedirect(scopes);
                    throw error;
                })
            );
    }

    private localStorageWorks(): boolean {
        try {
            this.testLocalStorage();
        } catch {
            try {
                localStorage.clear();
                this.testLocalStorage();
            } catch (ex) {
                this.errorService.newError(`Can't store your identity. You'll have to login next time you use the site.`, ex);
                return false;
            }
        }

        return true;
    }

    private testLocalStorage(): void {
        localStorage.setItem(
            'testing',
            'Hey there! just testing some local storage to see if we can store msal related things here. Why are you seeing this?'
        );
        localStorage.removeItem('testing');
    }
}
