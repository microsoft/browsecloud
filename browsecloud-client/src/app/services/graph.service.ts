// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { Observable, of, zip } from 'rxjs';
import { catchError, map, mergeMap } from 'rxjs/operators';

import { environment } from '@browsecloud/environments/environment';
import { BrowseCloudUserIdentity, UserIdentityType } from '@browsecloud/models';
import { AuthService } from '@browsecloud/services/auth.service';
import { ErrorService } from '@browsecloud/services/error.service';

@Injectable()
export class GraphService {

    constructor(
        private authService: AuthService,
        private http: HttpClient,
        private errorService: ErrorService
    ) { }

    public getMe(): Observable<any> {
        return this.authService.acquireToken(environment.auth.graphScopes)
            .pipe(
                mergeMap((token) => {
                    return this.http.get(
                        'https://graph.microsoft.com/v1.0/me',
                        {
                            headers: { Authorization: 'Bearer ' + token },
                        }
                    ).pipe(
                        catchError((error) => {
                            this.errorService.newError('Error getting user data.', error);
                            throw error;
                        })
                    );
                })
            );
    }

    public getTypeaheadContacts(startsWith: string): Observable<BrowseCloudUserIdentity[]> {
        if (startsWith == null || startsWith.length === 0) {
            return of([]);
        }

        startsWith = startsWith.trim();

        return zip(this.getTypeaheadUsers(startsWith), this.getTypeaheadGroups(startsWith))
            .pipe(
                map(([users, groups]) => {
                    const userIdentities = users.map((value) => {
                        return {
                            displayName: value.displayName,
                            principalName: value.userPrincipalName,
                            id: value.id,
                            type: UserIdentityType.User,
                        } as BrowseCloudUserIdentity;
                    });

                    const groupIdentities = groups.map((value) => {
                        return {
                            displayName: value.displayName,
                            principalName: value.mail,
                            id: value.id,
                            type: UserIdentityType.Group,
                        } as BrowseCloudUserIdentity;
                    });

                    return [...userIdentities, ...groupIdentities].slice(0, 5);
                })
            );
    }

    private getTypeaheadUsers(startsWith: string): Observable<any[]> {
        return this.authService.acquireToken(environment.auth.graphScopes)
            .pipe(
                mergeMap((token) => {
                    return this.http.get(
                        `https://graph.microsoft.com/v1.0/users?$filter=(surname ge '!') and (startswith(displayName,'${startsWith}')
or startswith(userPrincipalName,'${startsWith}'))&$top=5&$select=userPrincipalName,displayName,id`,
                        {
                            headers: { Authorization: 'Bearer ' + token },
                        }
                    ).pipe(
                        map((full: any) => full && full.value as any[]),
                        catchError((error) => {
                            this.errorService.newError('Error searching for users.', error);
                            throw error;
                        })
                    );
                })
            );
    }

    private getTypeaheadGroups(startsWith: string): Observable<any[]> {
        return this.authService.acquireToken(environment.auth.graphScopes)
            .pipe(
                mergeMap((token) => {
                    return this.http.get(
                        `https://graph.microsoft.com/v1.0/groups?
$filter=(startswith(displayName,'${startsWith}') or startswith(mail,'${startsWith}'))
&$top=5&$select=mail,displayName,id`,
                        {
                            headers: { Authorization: 'Bearer ' + token },
                        }
                    ).pipe(
                        map((full: any) => full && full.value as any[]),
                        catchError((error) => {
                            this.errorService.newError('Error searching for groups.', error);
                            throw error;
                        })
                    );
                })
            );
    }
}
