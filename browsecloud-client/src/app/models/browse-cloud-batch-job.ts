// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { autoserialize, autoserializeAs, SerializableEnumeration } from 'cerialize';

import { BrowseCloudJobSettings } from './browse-cloud-job-settings';

export enum JobStatus {
    NotStarted,
    PreProcessing,
    Training,
    Success,
    Failure,
}
SerializableEnumeration(JobStatus);

export enum JobType {
    CountingGridGeneration,
    SentimentColoring,
    MetadataColoring,
}
SerializableEnumeration(JobType);

export function jobStatusToString(jobStatus: JobStatus): string {
    switch (jobStatus) {
        case JobStatus.NotStarted:
            return 'Queued';
        case JobStatus.PreProcessing:
            return 'Pre-Processing';
        case JobStatus.Training:
            return 'Training';
        case JobStatus.Success:
            return 'Visualization Ready';
        case JobStatus.Failure:
            return 'Failed';
        default:
            return 'Unknown';
    }
}

export function jobStatusToStringDescription(jobStatus: JobStatus, supportsHtml: boolean = false): string {
    switch (jobStatus) {
        case JobStatus.NotStarted:
            return `The job is patiently waiting in line for a computer.
This might be a while, depending on the number of jobs already queued.`;
        case JobStatus.PreProcessing:
            return `The text is being prepared for training. This should not take long.`;
        case JobStatus.Training:
            return 'The core training algorithm is running on the text.';
        case JobStatus.Success:
            return 'The visualization is ready for viewing! Click the visualization name to see it.';
        case JobStatus.Failure:
            return supportsHtml === true ? `Theee job failed to complete successfully.
Please contact <a href="mailto:browsecloud-team@microsoft.com">browsecloud-team@microsoft.com</a> and they will help make it right!` :
            `The job failed to complete successfully.
Please contact browsecloud-team@microsoft.com and they will help make it right!`;
        default:
            return null;
    }
}

export function jobTypeToString(jobType: JobType): string {
    switch (jobType) {
        case JobType.CountingGridGeneration:
            return 'Counting Grid Generation';
        case JobType.SentimentColoring:
            return 'Sentiment Analysis Coloring';
        case JobType.MetadataColoring:
            return 'Metadata Column Coloring';
        default:
            return 'Unknown';
    }
}

/** Represents a BatchJob from the service. A training task. */
export class BrowseCloudBatchJob {
    @autoserialize public id: string;
    @autoserialize public documentId: string;
    @autoserialize public targetId?: string;
    @autoserialize public targetColumnName?: string;
    @autoserialize public progress: number;
    @autoserializeAs(JobStatus) public jobStatus: JobStatus;
    @autoserializeAs(JobType) public jobType: JobType;
    @autoserialize public windowSize?: number;
    @autoserialize public extentSize?: number;
    @autoserializeAs(Date) public submitDateTime: Date;
    @autoserializeAs(Date) public finishDateTime?: Date;
    @autoserializeAs(Date) public updateDateTime?: Date;
    @autoserializeAs(BrowseCloudJobSettings) public settings?: BrowseCloudJobSettings;
}
