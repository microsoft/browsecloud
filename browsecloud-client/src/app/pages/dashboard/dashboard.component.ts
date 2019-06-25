// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { ChangeDetectorRef, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatDialog, MatSort, MatTableDataSource, Sort } from '@angular/material';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';

import { LoggerService } from '@ngx-engoy/diagnostics-core';
import { User } from 'msal';
import { Subscription } from 'rxjs';

import {
    BrowseCloudDocumentWithJobs,
    InputType,
    inputTypeToString,
    JobStatus,
    jobStatusToString,
    jobStatusToStringDescription
} from '@browsecloud/models';
import { AuthService, BrowseCloudService, JobUpdateService } from '@browsecloud/services';
import { AddDocumentDialogComponent, EditDocumentDialogComponent } from '@browsecloud/shared';
import { Guid } from '@browsecloud/utils';

interface IFilterOptions {
    filterText: string;
    simpleInput: boolean;
    metadataInput: boolean;
    selfOwner: boolean;
    otherOwner: boolean;
}

@Component({
    selector: 'app-dashboard',
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit, OnDestroy {
    @ViewChild(MatSort) sort: MatSort;

    public displayedColumns: string[] = ['name', 'type', 'jobDate', 'status', 'options'];
    public documentsWithJobs: BrowseCloudDocumentWithJobs[];
    public tableDataSource: MatTableDataSource<BrowseCloudDocumentWithJobs> = new MatTableDataSource();
    public filterOptions: IFilterOptions;
    public currentSort: Sort;
    public user: User;

    public noTableElementsToShow = true;
    public tableLoading = true;

    private jobUpdateSubscription: Subscription;
    private queryParamsSubscription: Subscription;
    private unfinishedJobCount = 0;

    constructor(
        private authService: AuthService,
        private browseCloudService: BrowseCloudService,
        private dialog: MatDialog,
        private loggerService: LoggerService,
        private changeDetectorRef: ChangeDetectorRef,
        private router: Router,
        private activatedRoute: ActivatedRoute,
        private titleService: Title,
        private jobUpdateService: JobUpdateService
    ) { }

    public ngOnInit(): void {
        // Get current user.
        this.user = this.authService.getUser();

        this.titleService.setTitle('BrowseCloud | Dashboard');

        this.queryParamsSubscription = this.activatedRoute.queryParams
            .subscribe(
                (params) => {
                    if (params['action'] === 'add') {
                        // HACK: https://github.com/angular/material2/issues/5268
                        setTimeout(() => this.openNewDocumentDialog(true), 0);
                        this.router.navigateByUrl('/');
                    }
                }
            );

        // Setup data table.
        this.tableDataSource.sortingDataAccessor = (row, sortHeaderId) => {
            switch (sortHeaderId) {
                case this.displayedColumns[0]:
                    return row.document.displayName;
                case this.displayedColumns[1]:
                    return row.document.inputType;
                case this.displayedColumns[2]:
                    return row.jobs[0] == null ? -1 : row.jobs[0].submitDateTime.getTime();
                case this.displayedColumns[3]:
                    return row.jobs[0].jobStatus;
            }
        };

        this.filterOptions = {
            filterText: null,
            otherOwner: true,
            selfOwner: true,
            simpleInput: true,
            metadataInput: true,
        };

        this.currentSort = {
            active: 'jobDate',
            direction: 'desc',
        };

        // Get data.
        this.browseCloudService.getAllDocumentsWithJobs(false)
            .subscribe(
                // No unsubscribe needed. Observable completes.
                (docs) => {
                    this.documentsWithJobs = docs;
                    this.updateTableDataSource();
                    this.tableLoading = false;

                    // Set initial unfinished jobs count.
                    // At this point, jobs are cached, so just grab them from the service.
                    this.browseCloudService.getAllJobs(false)
                        // No unsubscribe needed. Observable completes.
                        .subscribe(
                            (jobs) => {
                                this.unfinishedJobCount = jobs
                                    .filter((j) => j.jobStatus !== JobStatus.Success && j.jobStatus !== JobStatus.Failure).length;

                                if (this.unfinishedJobCount > 0) {
                                    this.connectJobStatusUpdates();
                                }
                            }
                        );
                },
                (error) => {
                    this.tableLoading = false;
                }
            );

        this.loggerService.event('Dashboard.Load');
    }

    public ngOnDestroy(): void {
        if (this.jobUpdateSubscription != null) {
            this.jobUpdateSubscription.unsubscribe();
        }

        if (this.queryParamsSubscription != null) {
            this.queryParamsSubscription.unsubscribe();
        }
    }

    public onDeleteDocument(documentWithJobs: BrowseCloudDocumentWithJobs): void {
        this.tableLoading = true;

        const documentId = documentWithJobs.document.id;
        const index = this.documentsWithJobs.findIndex((d) => d.document.id === documentId);
        this.browseCloudService.deleteDocument(documentId)
            .subscribe(
                // No unsubscribe needed. Observable completes.
                () => {
                    this.documentsWithJobs.splice(index, 1);
                    this.updateTableDataSource();
                    this.tableLoading = false;
                    this.loggerService.event('Dashboard.Document.Delete', {
                        documentId,
                    });
                },
                (error) => {
                    this.tableLoading = false;
                }
            );
    }

    public onEditDocument(documentWithJobs: BrowseCloudDocumentWithJobs): void {
        const dialogRef = this.dialog.open(EditDocumentDialogComponent);
        dialogRef.componentInstance.setDocument(documentWithJobs.document);

        this.loggerService.event('Dashboard.Document.Edit.Start', {
            documentId: documentWithJobs.document.id,
        });

        dialogRef.afterClosed()
            .subscribe(
                // No unsubscribe needed. Observable completes.
                (result) => {
                    if (result != null) {
                        const index = this.documentsWithJobs.findIndex((d) => d.document.id === documentWithJobs.document.id);
                        this.documentsWithJobs[index].document = result;
                        this.updateTableDataSource();
                        this.loggerService.event('Dashboard.Document.Edit.Complete', {
                            documentId: documentWithJobs.document.id,
                        });
                    }
                }
            );
    }

    public openNewDocumentDialog(addToGallery: boolean = false): void {
        const dialogRef = this.dialog.open(AddDocumentDialogComponent);
        dialogRef.componentInstance.isPublic = addToGallery;

        const correlationId = Guid.newGuid().toString();
        this.loggerService.event('Dashboard.Document.New.Start', {
            correlationId,
        });

        dialogRef.afterClosed()
            .subscribe(
                // No unsubscribe needed. Observable completes.
                (result) => {
                    if (result != null) {
                        this.unfinishedJobCount += 1;
                        this.connectJobStatusUpdates();
                        this.documentsWithJobs.push(result as BrowseCloudDocumentWithJobs);
                        this.updateTableDataSource();
                        this.loggerService.event('Dashboard.Document.New.Complete', {
                            correlationId,
                        });
                    }
                }
            );
    }

    public updateTableDataSource(): void {
        const filteredData = this.getFilteredData();
        this.noTableElementsToShow = filteredData.length === 0;
        this.tableDataSource.data = filteredData;
        // Detect changes, because the matTable needs to be displayed to make this.sort available.
        this.changeDetectorRef.detectChanges();
        this.tableDataSource.sort = this.sort;
    }

    public onViewDocument(documentWithJobs: BrowseCloudDocumentWithJobs): void {
        this.router.navigate([`/visualization/${documentWithJobs.document.id}`]);
    }

    public inputTypeToString(inputType: InputType): string {
        return inputTypeToString(inputType);
    }

    public jobStatusToString(jobStatus: JobStatus): string {
        return jobStatusToString(jobStatus);
    }

    public jobStatusToStringDescription(jobStatus: JobStatus): string {
        return jobStatusToStringDescription(jobStatus);
    }

    private getFilteredData(): BrowseCloudDocumentWithJobs[] {
        return this.documentsWithJobs.filter((row) => {
            let showBasedOnSearch = true;
            if (this.filterOptions.filterText != null) {
                showBasedOnSearch = row.document.displayName.trim().toLowerCase().includes(
                    this.filterOptions.filterText.trim().toLowerCase()
                );
            }

            return showBasedOnSearch
                && ((this.filterOptions.simpleInput && row.document.inputType === InputType.SimpleInput)
                    || (this.filterOptions.metadataInput && row.document.inputType === InputType.MetadataInput))
                && ((this.filterOptions.selfOwner && row.document.owner.principalName === this.user.displayableId)
                    || (this.filterOptions.otherOwner && row.document.owner.principalName !== this.user.displayableId));
        });
    }

    private connectJobStatusUpdates(): void {
        // Start signalr connection subscription if it does not exist yet.
        if (this.jobUpdateSubscription == null) {
            this.jobUpdateSubscription = this.jobUpdateService.startConnection()
                .subscribe(
                    (job) => {
                        if (job == null) {
                            return;
                        }

                        this.browseCloudService.updateJobCache(job);

                        const docIndex = this.documentsWithJobs.findIndex((d) => d.document.id === job.documentId);

                        if (docIndex !== -1) {
                            const jobList = this.documentsWithJobs[docIndex].jobs;
                            const jobIndex = jobList.findIndex((j) => j.id === job.id);

                            if (jobIndex !== -1) {
                                this.documentsWithJobs[docIndex].jobs[jobIndex] = job;
                            }

                            this.updateTableDataSource();
                        }

                        if (job.jobStatus === JobStatus.Success || job.jobStatus === JobStatus.Failure) {
                            this.unfinishedJobCount -= 1;
                            if (this.unfinishedJobCount <= 0) {
                                this.jobUpdateSubscription.unsubscribe();
                                // No unsubscribe needed. Observable completes.
                                this.jobUpdateService.stopConnection().subscribe();
                            }
                        }
                    }
                );
        }
    }
}
