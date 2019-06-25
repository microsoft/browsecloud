// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Component, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { Router } from '@angular/router';

import { LoggerService } from '@ngx-engoy/diagnostics-core';

import { BrowseCloudDocument, JobStatus } from '@browsecloud/models';
import { BrowseCloudService } from '@browsecloud/services';

@Component({
    selector: 'app-gallery',
    templateUrl: './gallery.component.html',
    styleUrls: ['./gallery.component.scss'],
})
export class GalleryComponent implements OnInit {
    public documents: BrowseCloudDocument[];
    public displayDocs: BrowseCloudDocument[];
    public searchArray: string[];
    public searchTerm: '';

    public tableLoading = true;

    constructor(
        private browseCloudService: BrowseCloudService,
        private loggerService: LoggerService,
        private titleService: Title,
        private router: Router
    ) { }

    public ngOnInit(): void {
        this.titleService.setTitle('BrowseCloud | Gallery');

        // Get data.
        this.browseCloudService.getAllDocumentsWithJobs(true)
            .subscribe(
                // No unsubscribe needed. Observable completes.
                (docs) => {
                    // get all finished jobs.
                    this.documents = docs
                        .filter((doc) => {
                            const job = doc.jobs[0];
                            if (job !== null) {
                                return job.jobStatus === JobStatus.Success;
                            }

                            return false;
                        })
                        .map((docWithJobs) => docWithJobs.document);

                    // Setup search array.
                    this.searchArray = [];
                    this.documents.forEach((doc, index) => {
                        this.searchArray[index] = `${doc.displayName}${doc.description}${doc.owner}`.toLocaleLowerCase();
                    });

                    // Initially, set the display array to full set.
                    this.displayDocs = this.documents;

                    this.tableLoading = false;
                },
                (error) => {
                    this.tableLoading = false;
                }
            );

        this.loggerService.event('Gallery.Load');
    }

    public onSearch(searchTerm: string): void {
        if (searchTerm == null || searchTerm.length === 0) {
            this.displayDocs = this.documents;
        } else {
            searchTerm = searchTerm.toLocaleLowerCase();
            this.displayDocs = this.documents.filter((doc, index) => {
                return this.searchArray[index].includes(searchTerm);
            });
        }
    }

    public onAddDocument(): void {
        this.router.navigate(['/'], {
            queryParams: {
                action: 'add',
            },
        });
    }
}
