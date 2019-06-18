// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { Deserialize, Serialize } from 'cerialize';
import { Observable, of, zip } from 'rxjs';
import { catchError, map, mergeMap, tap } from 'rxjs/operators';

import { environment } from '@browsecloud/environments/environment';
import {
    BrowseCloudBatchJob,
    BrowseCloudDocument,
    BrowseCloudDocumentWithJobs,
    BrowseCloudFileValidationResponse
} from '@browsecloud/models';
import { AuthService } from '@browsecloud/services/auth.service';
import { ErrorService } from '@browsecloud/services/error.service';

@Injectable()
export class BrowseCloudService {
    private jobsCache: BrowseCloudBatchJob[];
    private documentsCache: BrowseCloudDocument[];
    private publicJobsCache: BrowseCloudBatchJob[];
    private publicDocumentsCache: BrowseCloudDocument[];

    constructor(
        private authService: AuthService,
        private http: HttpClient,
        private errorService: ErrorService
    ) { }

    public getAllDocuments(isPublic: boolean): Observable<BrowseCloudDocument[]> {
        const workingCache = isPublic === true ? this.publicDocumentsCache : this.documentsCache;
        if (workingCache != null && workingCache.length !== 0) {
            return of(workingCache);
        }

        return this.authService.acquireToken(environment.auth.serviceScopes)
            .pipe(
                mergeMap((token) => {
                    return this.http.get(
                        environment.serviceURL + `/api/v1/documents${isPublic === true ? '/public' : ''}`,
                        {
                            headers: { Authorization: 'Bearer ' + token },
                        }
                    ).pipe(
                        map((ta: any[]) => ta.map((t) => {
                            return Deserialize(t, BrowseCloudDocument) as BrowseCloudDocument;
                        })),
                        tap((documents) => isPublic === true ? this.publicDocumentsCache = documents : this.documentsCache = documents),
                        catchError((error) => {
                            this.errorService.newError('Error getting all documents.', error);
                            throw error;
                        })
                    );
                })
            );
    }

    public getAllJobs(isPublic: boolean): Observable<BrowseCloudBatchJob[]> {
        const workingCache = isPublic === true ? this.publicJobsCache : this.jobsCache;
        if (workingCache != null && workingCache.length !== 0) {
            return of(workingCache);
        }

        return this.authService.acquireToken(environment.auth.serviceScopes)
            .pipe(
                mergeMap((token) => {
                    return this.http.get(
                        environment.serviceURL + `/api/v1/jobs${isPublic === true ? '/public' : ''}`,
                        {
                            headers: { Authorization: 'Bearer ' + token },
                        }
                    ).pipe(
                        map((ta: any[]) => ta.map((t) => {
                            return Deserialize(t, BrowseCloudBatchJob) as BrowseCloudBatchJob;
                        })),
                        tap((jobs) => isPublic === true ? this.publicJobsCache = jobs : this.jobsCache = jobs),
                        catchError((error) => {
                            this.errorService.newError('Error getting all jobs.', error);
                            throw error;
                        })
                    );
                })
            );
    }

    public getJobFile(jobId: string, fileName: string): Observable<string> {
        return this.authService.acquireToken(environment.auth.serviceScopes)
            .pipe(
                mergeMap((token) => {
                    return this.http.get(
                        environment.serviceURL + `/api/v1/jobs/${jobId}/files/${fileName}`,
                        {
                            responseType: 'text',
                            headers: { Authorization: 'Bearer ' + token },
                        }
                    ).pipe(
                        catchError((error) => {
                            // No need to throw when the file is simply not available.
                            // Some files are optional. Let CountingGridModel handle errors.
                            if (error.status === 404) {
                                return of(null);
                            }

                            this.errorService.newError(`Error getting file ${fileName} for job.`, error);
                            throw error;
                        })
                    );
                })
            );
    }

    public getJobsForDocument(documentId: string): Observable<BrowseCloudBatchJob[]> {
        if (this.jobsCache != null) {
            const jobs = this.jobsCache.filter((job) => job.documentId === documentId);
            if (jobs.length > 0) {
                return of(jobs);
            }
        }

        return this.authService.acquireToken(environment.auth.serviceScopes)
            .pipe(
                mergeMap((token) => {
                    return this.http.get(
                        environment.serviceURL + `/api/v1/documents/${documentId}/jobs`,
                        {
                            headers: { Authorization: 'Bearer ' + token },
                        }
                    ).pipe(
                        map((ta: any[]) => ta.map((t) => {
                            return Deserialize(t, BrowseCloudBatchJob) as BrowseCloudBatchJob;
                        })),
                        tap((jobs) => {
                            if (this.jobsCache != null) {
                                this.jobsCache.push(...jobs);
                            }
                        }),
                        catchError((error) => {
                            this.errorService.newError('Error getting all jobs for document.', error);
                            throw error;
                        })
                    );
                })
            );
    }

    public getDocumentWithJobs(documentId: string): Observable<BrowseCloudDocumentWithJobs> {
        if (this.documentsCache != null && this.jobsCache != null) {
            const documentsWithJobs = BrowseCloudDocumentWithJobs.fromDocumentsAndJobs(
                [...(this.documentsCache || []), ...(this.publicDocumentsCache || [])],
                [...(this.jobsCache || []), ...(this.publicJobsCache || [])]
            );
            if (documentsWithJobs != null) {
                const documentWithJobs = documentsWithJobs.find((d) => d.document.id === documentId);
                if (documentWithJobs != null) {
                    return of(documentWithJobs);
                }
            }
        }

        return this.authService.acquireToken(environment.auth.serviceScopes)
            .pipe(
                mergeMap((token) => {
                    return this.http.get(
                        environment.serviceURL + `/api/v1/documents/${documentId}`,
                        {
                            headers: { Authorization: 'Bearer ' + token },
                        }
                    ).pipe(
                        map((t: any) => Deserialize(t, BrowseCloudDocument) as BrowseCloudDocument),
                        mergeMap((document) => this.addJobsToDocument(document)),
                        catchError((error) => {
                            this.errorService.newError('Error getting document.', error);
                            throw error;
                        })
                    );
                })
            );
    }

    public getAllDocumentsWithJobs(isPublic: boolean): Observable<BrowseCloudDocumentWithJobs[]> {
        return zip(this.getAllDocuments(isPublic), this.getAllJobs(isPublic))
            .pipe(
                map(([documents, jobs]) => BrowseCloudDocumentWithJobs.fromDocumentsAndJobs(documents, jobs))
            );
    }

    public addJobsToDocument(document: BrowseCloudDocument): Observable<BrowseCloudDocumentWithJobs> {
        return this.getJobsForDocument(document.id)
            .pipe(
                map((jobs) => new BrowseCloudDocumentWithJobs(document, jobs))
            );
    }

    public postDocumentWithText(documentText: string): Observable<BrowseCloudDocument> {
        return this.authService.acquireToken(environment.auth.serviceScopes)
            .pipe(
                mergeMap((token) => {
                    return this.http.post(
                        environment.serviceURL + '/api/v1/documents',
                        documentText,
                        {
                            headers: { Authorization: 'Bearer ' + token },
                        }
                    ).pipe(
                        map((t: any) => Deserialize(t, BrowseCloudDocument) as BrowseCloudDocument),
                        tap((d) => this.documentsCache.push(d)),
                        catchError((error) => {
                            this.errorService.newError('Error creating new document.', error);
                            throw error;
                        })
                    );
                })
            );
    }

    public postValidateDocumentWithText(documentText: string): Observable<BrowseCloudFileValidationResponse> {
        return this.authService.acquireToken(environment.auth.serviceScopes)
            .pipe(
                mergeMap((token) => {
                    return this.http.post(
                        environment.serviceURL + '/api/v1/documents/validateInput',
                        documentText,
                        {
                            headers: { Authorization: 'Bearer ' + token },
                        }
                    ).pipe(
                        map((t: any) => Deserialize(t, BrowseCloudFileValidationResponse) as BrowseCloudFileValidationResponse),
                        catchError((error: HttpErrorResponse) => {
                            this.errorService.newError('Error validating document.', error);
                            throw error;
                        })
                    );
                })
            );
    }

    public putDocument(document: BrowseCloudDocument): Observable<BrowseCloudDocument> {
        return this.authService.acquireToken(environment.auth.serviceScopes)
            .pipe(
                mergeMap((token) => {
                    return this.http.put(
                        environment.serviceURL + `/api/v1/documents/${document.id}`,
                        Serialize(document),
                        {
                            headers: { Authorization: 'Bearer ' + token },
                        }
                    ).pipe(
                        map((t: any) => Deserialize(t, BrowseCloudDocument) as BrowseCloudDocument),
                        tap((d) => {
                            if (this.documentsCache != null) {
                                const index = this.documentsCache.findIndex((d1) => d1.id === d.id);
                                if (index !== -1) {
                                    this.documentsCache[index] = d;
                                }
                            }

                            if (this.publicDocumentsCache != null) {
                                const index = this.publicDocumentsCache.findIndex((d1) => d1.id === d.id);
                                if (index !== -1) {
                                    this.publicDocumentsCache[index] = d;
                                    if (document.isPublic === false) {
                                        this.publicDocumentsCache.splice(index, 1);
                                    }
                                } else if (document.isPublic === true) {
                                    this.publicDocumentsCache.push(document);
                                    if (this.jobsCache != null) {
                                        this.publicJobsCache.push(...this.jobsCache.filter((j) => j.documentId === document.id));
                                    }
                                }
                            }
                        }),
                        catchError((error) => {
                            this.errorService.newError('Error updating the document.', error);
                            throw error;
                        })
                    );
                })
            );
    }

    public putJob(job: BrowseCloudBatchJob): Observable<BrowseCloudBatchJob> {
        return this.authService.acquireToken(environment.auth.serviceScopes)
            .pipe(
                mergeMap((token) => {
                    return this.http.put(
                        environment.serviceURL + `/api/v1/jobs/${job.id}`,
                        Serialize(job),
                        {
                            headers: { Authorization: 'Bearer ' + token },
                        }
                    ).pipe(
                        map((t: any) => Deserialize(t, BrowseCloudBatchJob) as BrowseCloudBatchJob),
                        tap((j) => {
                            if (this.jobsCache != null) {
                                const index = this.jobsCache.findIndex((j1) => j1.id === j.id);
                                if (index !== -1) {
                                    this.jobsCache[index] = j;
                                }
                            }

                            if (this.publicJobsCache != null) {
                                const index = this.publicJobsCache.findIndex((j1) => j1.id === j.id);
                                if (index !== -1) {
                                    this.publicJobsCache[index] = j;
                                }
                            }
                        }),
                        catchError((error) => {
                            this.errorService.newError('Error updating the job settings.', error);
                            throw error;
                        })
                    );
                })
            );
    }

    public postDocumentWithTextAndModifyDocument(
        documentText: string,
        title: string,
        description: string,
        isPublic: boolean
    ): Observable<BrowseCloudDocument> {
        return this.postDocumentWithText(documentText)
            .pipe(
                mergeMap((document) => {
                    document.displayName = title;
                    document.description = description;
                    document.isPublic = isPublic;
                    return this.putDocument(document);
                })
            );
    }

    public deleteDocument(documentId: string): Observable<any> {
        return this.authService.acquireToken(environment.auth.serviceScopes)
            .pipe(
                mergeMap((token) => {
                    return this.http.delete(
                        environment.serviceURL + `/api/v1/documents/${documentId}`,
                        {
                            headers: { Authorization: 'Bearer ' + token },
                        }
                    ).pipe(
                        tap((d) => {
                            if (this.documentsCache != null) {
                                const index = this.documentsCache.findIndex((d1) => d1.id === documentId);
                                if (index !== -1) {
                                    this.documentsCache.splice(index, 1);
                                }
                            }

                            if (this.publicDocumentsCache != null) {
                                const index = this.publicDocumentsCache.findIndex((d1) => d1.id === documentId);
                                if (index !== -1) {
                                    this.publicDocumentsCache.splice(index, 1);
                                }
                            }
                        }),
                        catchError((error) => {
                            this.errorService.newError('Error deleting the document.', error);
                            throw error;
                        })
                    );
                })
            );
    }

    public getDemoData(): Observable<BrowseCloudDocumentWithJobs> {
        return this.http.get(
            'assets/demo/demo-data.json'
        ).pipe(
            map((t) => Deserialize(t, BrowseCloudDocumentWithJobs) as BrowseCloudDocumentWithJobs),
            catchError((error) => {
                this.errorService.newError('Error getting demo document.', error);
                throw error;
            })
        );
    }

    public getDemoFile(fileName: string): Observable<string> {
        return this.http.get(
            `assets/demo/${fileName}`,
            {
                responseType: 'text',
            }
        ).pipe(
            catchError((error) => {
                // No need to throw when the file is simply not available.
                // Some files are optional. Let CountingGridModel handle errors.
                if (error.status === 404) {
                    return of(null);
                }

                this.errorService.newError(`Error getting file ${fileName} for demo job.`, error);
                throw error;
            })
        );
    }

    public updateJobCache(job: BrowseCloudBatchJob): void {
        const jobIndex = this.jobsCache != null ? this.jobsCache.findIndex((j) => j.id === job.id) : -1;
        const publicJobIndex = this.publicJobsCache != null ? this.publicJobsCache.findIndex((j) => j.id === job.id) : -1;

        if (jobIndex === -1) {
            return;
        }

        this.jobsCache[jobIndex] = job;

        if (publicJobIndex === -1) {
            return;
        }

        this.publicJobsCache[publicJobIndex] = job;
    }

    public userCanModifyDocument(document: BrowseCloudDocument): Observable<boolean> {
        if (this.documentsCache != null) {
            return of(this.documentsCache.findIndex((doc) => doc.id === document.id) !== -1);
        }

        return this.authService.acquireToken(environment.auth.serviceScopes)
            .pipe(
                mergeMap((token) => {
                    return this.http.get(
                        environment.serviceURL + '/api/v1/users/me/userIdentityIds',
                        {
                            headers: { Authorization: 'Bearer ' + token },
                        }
                    ).pipe(
                        map((identityList: string[]) => {
                            return identityList.findIndex((identity) => identity === document.owner.id ) !== -1
                                || document.acl.some((aclItem) => {
                                    return identityList.findIndex((identity) => identity === aclItem.id ) !== -1;
                                });
                        }),
                        catchError((error) => {
                            this.errorService.newError('Error getting user groups.', error);
                            throw error;
                        })
                    );
                })
            );
    }

    public postNewJob(job: BrowseCloudBatchJob): Observable<BrowseCloudBatchJob> {
        return this.authService.acquireToken(environment.auth.serviceScopes)
            .pipe(
                mergeMap((token) => {
                    return this.http.post(
                        environment.serviceURL + '/api/v1/jobs',
                        job,
                        {
                            headers: { Authorization: 'Bearer ' + token },
                        }
                    ).pipe(
                        map((t: any) =>
                            Deserialize(t, BrowseCloudBatchJob) as BrowseCloudBatchJob
                        ),
                        tap((j) => {
                            if (this.jobsCache != null) {
                                this.jobsCache.push(j);
                            }
                        }),
                        catchError((error) => {
                            this.errorService.newError('Error posting new job.', error);
                            throw error;
                        })
                    );
                })
            );
    }
}
