// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Injectable } from '@angular/core';

import { HubConnection, HubConnectionBuilder, HubConnectionState } from '@aspnet/signalr';
import { Deserialize } from 'cerialize';
import { from, Observable, Subject } from 'rxjs';

import { environment } from '@browsecloud/environments/environment';
import { BrowseCloudBatchJob } from '@browsecloud/models';
import { AuthService } from '@browsecloud/services/auth.service';
import { ErrorService } from '@browsecloud/services/error.service';

@Injectable()
export class JobUpdateService {
    private connection: HubConnection;
    private updateSubject: Subject<BrowseCloudBatchJob>;
    private parseFailedCount = 0;

    public constructor(
        private authService: AuthService,
        private errorService: ErrorService
    ) {
        this.connection = new HubConnectionBuilder()
            .withUrl(`${environment.serviceURL}/jobupdatehub`, {
                accessTokenFactory: () => {
                    return this.authService.acquireToken(environment.auth.serviceScopes).toPromise();
                },
            })
            .build();
    }

    public startConnection(): Observable<BrowseCloudBatchJob> {
        this.updateSubject = new Subject();

        if (this.connection.state === HubConnectionState.Disconnected) {
            from(this.connection.start())
                .subscribe(
                    () => {
                        this.connection.on('updateJob', (stringJob: string) => {
                            try {
                                const rawJob = JSON.parse(stringJob);
                                const job = Deserialize(rawJob, BrowseCloudBatchJob) as BrowseCloudBatchJob;
                                this.updateSubject.next(job);
                            } catch (error) {
                                this.parseFailedCount += 1;
                                if (this.parseFailedCount > 5) {
                                    this.endConnectionWithError('Lost connection with the server. Automatic updates are disabled', error);
                                }
                            }
                        });

                        this.connection.onclose((error) => {
                            if (error != null) {
                                this.endConnectionWithError('Lost connection with the server. Automatic updates are disabled', error);
                            }
                        });
                    },
                    (error) => {
                        this.endConnectionWithError('No connection with the server. Automatic updates are disabled', error);
                    }
                );
        }

        return this.updateSubject;
    }

    public stopConnection(): Observable<void> {
        if (this.updateSubject != null) {
            this.updateSubject.complete();
        }

        return from(this.connection.stop());
    }

    private endConnectionWithError(message: string, error: any) {
        this.errorService.newError(message, error, null);

        if (this.updateSubject != null) {
            this.updateSubject.error(error);
            this.updateSubject.complete();
        }

        this.connection.stop();
    }
}
