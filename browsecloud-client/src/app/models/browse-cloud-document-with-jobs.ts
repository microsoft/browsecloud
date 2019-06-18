// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { autoserializeAs } from 'cerialize';

import { dynamicSort } from 'src/utils/dynamicSort';
import { BrowseCloudBatchJob } from './browse-cloud-batch-job';
import { BrowseCloudDocument } from './browse-cloud-document';

/** A document along with all the jobs that have been run on the document. */
export class BrowseCloudDocumentWithJobs {
    @autoserializeAs(BrowseCloudDocument) public document: BrowseCloudDocument;
    @autoserializeAs(BrowseCloudBatchJob) public jobs: BrowseCloudBatchJob[];

    constructor(document: BrowseCloudDocument, jobs: BrowseCloudBatchJob[]) {
        this.document = document;

        if (jobs != null) {
            this.jobs = jobs.sort(dynamicSort('-submitDateTime'));
        }
    }

    public static fromDocumentsAndJobs(documents: BrowseCloudDocument[], jobs: BrowseCloudBatchJob[]): BrowseCloudDocumentWithJobs[] {
        if (documents == null || documents.length === 0) {
            return [];
        }

        if (jobs == null) {
            jobs = [];
        }

        return documents.map((document) => {
            const jobsForDoc = jobs.filter((j) => j.documentId === document.id);
            return new BrowseCloudDocumentWithJobs(document, jobsForDoc);
        });
    }
}
