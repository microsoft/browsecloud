// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { LoggerService } from '@ngx-diagnostics/core';
import { Subject } from 'rxjs';

export interface IBrowseCloudError {
    message: string;
    error: HttpErrorResponse;
    snackBarDuration?: number;
}

@Injectable()
export class ErrorService {
    public newErrorSubject: Subject<IBrowseCloudError> = new Subject();

    constructor(private loggerService: LoggerService) { }

    public newError(message: string, error: HttpErrorResponse, snackBarDuration = 5000) {
        this.loggerService.error(error, {
            message,
        });
        this.newErrorSubject.next({message, error, snackBarDuration});
    }
}
