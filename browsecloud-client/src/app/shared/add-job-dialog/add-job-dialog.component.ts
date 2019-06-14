// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material';

import { BrowseCloudBatchJob, BrowseCloudDocument, CountingGridModel, JobStatus, JobType, jobTypeToString } from '@browsecloud/models';
import { BrowseCloudService } from '@browsecloud/services';
import { Guid } from '@browsecloud/utils';

export interface IDropdownChoice {
    key: number | string;
    value: string;
    disabled: boolean;
}

@Component({
    selector: 'app-add-job-dialog',
    templateUrl: './add-job-dialog.component.html',
    styleUrls: ['./add-job-dialog.component.scss'],
})
export class AddJobDialogComponent {
    public loading = false;
    public newBatchJob: BrowseCloudBatchJob;
    public jobTypeChoices: IDropdownChoice[] = [];
    public metadataColumnChoices: IDropdownChoice[] = [];
    public jobType = JobType;

    private countingGridModel: CountingGridModel;

    constructor(
        private dialog: MatDialogRef<AddJobDialogComponent>,
        private browseCloudService: BrowseCloudService
    ) { }

    public initModal(
        document: BrowseCloudDocument,
        model: CountingGridModel,
        targetJob: BrowseCloudBatchJob,
        jobTypeOptions: JobType[]
    ): void {
        this.jobTypeChoices = jobTypeOptions.map((value) => ({
                key: value,
                value: jobTypeToString(value),
                disabled: value === JobType.MetadataColoring ? model.database.extraColumns.length === 0 : false,
            }));

        this.countingGridModel = model;

        // Setup defaults.
        this.newBatchJob = {
            id: Guid.newGuid().toString(),
            progress: 0,
            jobStatus: JobStatus.NotStarted,
            documentId: document.id,
            targetId: targetJob.id,
            windowSize: targetJob.windowSize || 5,
            extentSize: targetJob.extentSize || 24,
            settings: targetJob.settings,
            jobType: jobTypeOptions[0],
            submitDateTime: new Date(),
        };
    }

    public onJobTypeChosen(): void {
        if (this.newBatchJob.jobType !== JobType.MetadataColoring) {
            return;
        }

        this.metadataColumnChoices = this.countingGridModel.database.extraColumns.map((column): IDropdownChoice => {
            const columnData = this.countingGridModel.database.database.map((docEntry) => docEntry.otherFields[column]);
            const columnIs2Categorical = new Set(columnData).size === 2;
            const columnIsNumerical = columnData.some((data) => data !== '' && !isNaN(+data));
            const numericalDescription = columnIsNumerical === true ? ' (Numerical)' : '';
            const twoCategorialDescription = columnIs2Categorical === true ? ' (Two-Categorical)' : '';

            return {
                key: column,
                value: `${column}${twoCategorialDescription}${numericalDescription}`,
                disabled: !(columnIs2Categorical || columnIsNumerical),
            };
        });
    }

    public onAddJob(): void {
        this.loading = true;

        this.browseCloudService.postNewJob(this.newBatchJob)
            .subscribe(
                // No unsubscribe needed. Observable completes.
                (job) => {
                    this.dialog.close(job);
                },
                () => {
                    this.dialog.close();
                }
            );
    }

    public onCancelClicked(): void {
        this.dialog.close();
    }
}
