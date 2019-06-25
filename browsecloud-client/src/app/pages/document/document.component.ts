// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { ENTER, SPACE } from '@angular/cdk/keycodes';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatChipInputEvent, MatDialog } from '@angular/material';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';

import { LoggerService } from '@ngx-engoy/diagnostics-core';
import { FileSaverService } from 'ngx-filesaver';
import { Observable, Subject, Subscription, zip } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

import { BrowseCloudBatchJob,
    BrowseCloudDocumentWithJobs,
    BrowseCloudFontSettings,
    CountingGridModel,
    JobStatus,
    jobStatusToString,
    jobStatusToStringDescription,
    JobType
} from '@browsecloud/models';
import { IDocEntry } from '@browsecloud/models/cg-database';
import { ILexiconWord } from '@browsecloud/models/cg-vocabulary';
import { BrowseCloudService, JobUpdateService } from '@browsecloud/services';
import { AddJobDialogComponent, CloudViewComponent, EditDocumentDialogComponent } from '@browsecloud/shared';

@Component({
    selector: 'app-document',
    templateUrl: './document.component.html',
    styleUrls: ['./document.component.scss'],
})
export class DocumentComponent implements OnInit, OnDestroy {
    public readonly wordSearchSeparatorKeyCodes: number[] = [ENTER, SPACE];
    public readonly defaultFontSettings: BrowseCloudFontSettings = {
        minimum: 10,
        quadraticWeight: 45,
    };

    @ViewChild('resultsView') public resultsView: ElementRef<HTMLDivElement>;
    @ViewChild(CloudViewComponent) public cloudViewComponent: CloudViewComponent;
    public documentWithJobs: BrowseCloudDocumentWithJobs;
    public countingGridModel: CountingGridModel;
    public documentList: IDocEntry[];
    public wordsToHighlight: string[];
    public highlightPosition: [number, number];
    public pinPosition: [number, number];
    public documentLoading = true;
    public documentLoadingFatalErrorText: string;
    public modelLoading = false;
    public isDemo = false;
    public userCanModify = true;
    public searchWords: ILexiconWord[] = [];
    public searchWordIds: number[] = [];

    private updateJobSettingsSubject: Subject<BrowseCloudBatchJob> = new Subject();
    private updateJobSettingsSubscription: Subscription;
    private jobUpdateSubscription: Subscription;

    constructor(
        private browseCloudService: BrowseCloudService,
        private dialog: MatDialog,
        private loggerService: LoggerService,
        private route: ActivatedRoute,
        private titleService: Title,
        private jobUpdateService: JobUpdateService,
        private changeDetectorRef: ChangeDetectorRef,
        private fileSaverService: FileSaverService
    ) { }

    public ngOnInit(): void {
        this.documentLoading = true;

        const id = this.route.snapshot.paramMap.get('id');

        this.titleService.setTitle('BrowseCloud | Document');

        // If this is the demo app, this page will be the root url route with length 0. Show the demo data.
        // Also show the demo data if the id in the route is 'demo'.
        if (id === 'demo' || this.route.snapshot.url.length === 0) {
            this.isDemo = true;

            this.browseCloudService.getDemoData()
                .subscribe(
                    // No unsubscribe needed. Observable completes.
                    (documentWithJobs) => {
                        this.documentWithJobs = documentWithJobs;
                        this.documentLoading = false;
                        this.getModelFiles(true);
                    },
                    () => {
                        this.documentLoading = false;
                    }
                );

            return;
        }

        this.browseCloudService.getDocumentWithJobs(id)
            .subscribe(
                // No unsubscribe needed. Observable completes.
                (documentWithJobs) => {
                    this.documentWithJobs = documentWithJobs;
                    this.titleService.setTitle(`BrowseCloud | ${this.documentWithJobs.document.displayName}`);

                    this.userCanModify = false;
                    this.browseCloudService.userCanModifyDocument(this.documentWithJobs.document)
                        // No unsubscribe needed. Observable completes.
                        // We don't really care about error handing here.
                        // If the request fails, we just disable the edit button anyway.
                        .subscribe(
                            (userCanModify) => {
                                this.userCanModify = userCanModify;
                            }
                        );

                    this.documentLoading = false;

                    if (documentWithJobs.jobs != null && documentWithJobs.jobs.length !== 0) {
                        if (documentWithJobs.jobs[0].jobStatus === JobStatus.Success) {
                            this.setupFontSizeSetting();
                            this.getModelFiles();
                        } else {
                            this.startJobUpdatesUntilComplete();
                        }
                    }
                },
                (error: HttpErrorResponse) => {
                    this.documentLoading = false;

                    if (error.status === 401 || error.status === 403) {
                        this.documentLoadingFatalErrorText
                            = 'You do not have permission to access this document. Contact the owner for access.';
                    } else if (error.status === 400 || error.status === 404) {
                        this.documentLoadingFatalErrorText = 'Document not found.';
                    } else {
                        this.documentLoadingFatalErrorText = 'Something went wrong.';
                    }
                }
            );

        // Debounce job settings updates on font setting change.
        this.updateJobSettingsSubscription = this.updateJobSettingsSubject
            .pipe(
                debounceTime(1000)
            )
            .subscribe((job) => {
                if (this.userCanModify) {
                    // No unsubscribe needed. Observable completes.
                    this.browseCloudService.putJob(job).subscribe();
                }
            });

        this.loggerService.event('DocumentPage.Load', {
            documentId: id,
        });
    }

    public ngOnDestroy(): void {
        if (this.jobUpdateSubscription != null) {
            this.jobUpdateSubscription.unsubscribe();
        }

        if (this.updateJobSettingsSubscription != null) {
            this.updateJobSettingsSubscription.unsubscribe();
        }
    }

    public onEditDocument(): void {
        const dialogRef = this.dialog.open(EditDocumentDialogComponent);
        dialogRef.componentInstance.setDocument(this.documentWithJobs.document);

        this.loggerService.event('DocumentPage.Document.Edit.Start', {
            documentId: this.documentWithJobs.document.id,
        });

        dialogRef.afterClosed()
            .subscribe(
                // No unsubscribe needed. Observable completes.
                (result) => {
                    if (result != null) {
                        this.documentWithJobs.document = result;
                        this.loggerService.event('DocumentPage.Document.Edit.Complete', {
                            documentId: this.documentWithJobs.document.id,
                        });
                    }
                }
            );
    }

    public onFontSizeChanged(): void {
        // This forces change detection... Unfortunate, but needed.
        this.documentWithJobs.jobs[0].settings.fontSettings = {
            minimum: this.documentWithJobs.jobs[0].settings.fontSettings.minimum,
            quadraticWeight: this.documentWithJobs.jobs[0].settings.fontSettings.quadraticWeight,
        };
        this.updateJobSettingsSubject.next(this.documentWithJobs.jobs[0]);
    }

    public onPinPlaced(gridCoords: [number, number]): void {
        this.pinPosition = gridCoords;
        this.updateDocumentList();
    }

    public updateDocumentList(): void {
        if (this.pinPosition != null) {
            if (this.resultsView != null) {
                this.resultsView.nativeElement.scrollTop = 0;
            }

            this.documentList = this.countingGridModel.getDocumentEntryList(this.pinPosition[0], this.pinPosition[1], this.searchWordIds);

            if (this.searchWordIds != null && this.searchWordIds.length !== 0) {
                this.wordsToHighlight =
                    this.searchWordIds
                        .map((wordId) => this.countingGridModel.vocabulary.getVocabularyWordsById(wordId))
                        .reduce((a, b) => a.concat(b));
            } else {
                this.wordsToHighlight = null;
            }
        } else {
            this.documentList = [];
            this.wordsToHighlight = [];
        }
    }

    public onMouseEnterEntryCard(entryId: number): void {
        const gridMapping = this.countingGridModel.mappings.getPositionOfEntry(entryId);
        this.highlightPosition = [gridMapping.col, gridMapping.row];
    }

    public onMouseLeaveEntryCard(): void {
        this.highlightPosition = [null, null];
    }

    public jobStatusToString(jobStatus: JobStatus): string {
        return jobStatusToString(jobStatus);
    }

    public jobStatusToStringDescription(jobStatus: JobStatus): string {
        return jobStatusToStringDescription(jobStatus, true);
    }

    public onAddSearchWord(event: MatChipInputEvent): void {
        this.loggerService.event('DocumentPage.AddSearchWord', {
            documentId: this.documentWithJobs.document.id,
        });

        const input = event.input;
        const value = event.value;

        if (value != null && value !== '') {
            const vocabularyWord = this.countingGridModel.vocabulary.getLexiconWordByWord(value);

            if (vocabularyWord != null) {
                // Not using push here to trigger change detection.
                this.searchWords = [...this.searchWords, vocabularyWord];
                this.searchWordIds = [...this.searchWordIds, vocabularyWord.wordId];
            } else {
                this.searchWords = [...this.searchWords, {
                    word: value,
                    wordId: null,
                }];
            }
        }

        // Reset the input value.
        if (input != null) {
            input.value = '';
        }

        this.updateDocumentList();
    }

    public onRemoveSearchWord(word: string): void {
        this.loggerService.event('DocumentPage.RemoveSearchWord', {
            documentId: this.documentWithJobs.document.id,
        });

        const indexWord = this.searchWords.findIndex((w) => w.word === word);

        if (indexWord >= 0) {
            const vocabWord = this.searchWords[indexWord];
            this.searchWords.splice(indexWord, 1);

            if (vocabWord != null) {
                const indexId = this.searchWordIds.indexOf(vocabWord.wordId);

                if (indexId >= 0) {
                    this.searchWordIds.splice(indexId, 1);
                }
            }
        }

        // Trigger change detection.
        this.searchWordIds = this.searchWordIds.slice();

        this.updateDocumentList();
    }

    public onResetVisualization(): void {
        // Make pin location null.
        this.onPinPlaced(null);

        // Remove all search words.
        this.searchWordIds = [];
        this.searchWords = [];

        // Sent font sizes to default.
        if (this.documentWithJobs.jobs[0].settings != null) {
            this.documentWithJobs.jobs[0].settings.fontSettings = this.defaultFontSettings;
            this.onFontSizeChanged();
        }

        this.cloudViewComponent.resetVisualization();
    }

    public onDownloadResults(): void {
        this.loggerService.event('DocumentPage.DownloadResults', {
            documentId: this.documentWithJobs.document.id,
        });

        if (this.documentList == null) {
            return;
        }

        const colDelim = ',';
        const rowDelim = '\r\n';

        let dataForDownload = `Title${colDelim}Text${colDelim}Relevance${colDelim}Link${colDelim}Feature${colDelim}`;
        this.countingGridModel.database.extraColumns.forEach((key) => dataForDownload += `${key}${colDelim}`);
        dataForDownload += rowDelim;

        this.documentList.forEach((result, index) => {
            const sanitizedTitle = result.title.toLowerCase() !== 'nan' ? result.title.replace(/"/g, '""') : '';
            const sanitizedAbstract = result.abstract.toLowerCase() !== 'nan' ? result.abstract.replace(/"/g, '""') : '';

            // tslint:disable-next-line:max-line-length
            dataForDownload += `"${sanitizedTitle}"${colDelim}"${sanitizedAbstract}"${colDelim}${(this.documentList.length - index)}${colDelim}"${result.link}"${colDelim}"${result.feature > 0 ? result.feature : ''}"${colDelim}`;
            this.countingGridModel.database.extraColumns.forEach((key) => {
                let value = result.otherFields[key] || '';
                value = value.replace(/"/g, '""');
                return dataForDownload += `${result.otherFields[key] || ''}${colDelim}`;
            });
            dataForDownload += rowDelim;
        });

        const blob = new Blob([dataForDownload], { type: 'octet/stream' });

        this.fileSaverService.save(blob, 'BrowseCloudSearchResults.csv');
    }

    public onAddColor(): void {
        this.onAddNewJob([JobType.SentimentColoring, JobType.MetadataColoring]);
    }

    public onRetrain(): void {
        this.onAddNewJob([JobType.CountingGridGeneration]);
    }

    public onAddNewJob(jobTypeOptions: JobType[]): void {
        this.loggerService.event('DocumentPage.AddNewJob', {
            documentId: this.documentWithJobs.document.id,
        });

        const dialogRef = this.dialog.open(AddJobDialogComponent);

        // target job is defined as the last job that was a counting grids generation.
        const targetJob = this.documentWithJobs.jobs.find((job) => job.jobType === JobType.CountingGridGeneration);

        dialogRef.componentInstance.initModal(this.documentWithJobs.document, this.countingGridModel, targetJob, jobTypeOptions);

        dialogRef.afterClosed()
        .subscribe(
            // No unsubscribe needed. Observable completes.
            (result) => {
                if (result != null) {
                    this.documentWithJobs.jobs.unshift(result);
                    this.countingGridModel = null;
                    this.onResetVisualization();
                    this.startJobUpdatesUntilComplete();
                }
            }
        );
    }

    private startJobUpdatesUntilComplete(): void {
        this.jobUpdateSubscription = this.jobUpdateService.startConnection()
            .subscribe(
                (job) => {
                    if (job != null) {
                        this.browseCloudService.updateJobCache(job);

                        const jobIndex = this.documentWithJobs.jobs.findIndex((j) => j.id === job.id);
                        if (jobIndex !== -1) {
                            this.documentWithJobs.jobs[jobIndex] = job;

                            if (this.documentWithJobs.jobs[0].jobStatus === JobStatus.Success
                                && (this.modelLoading === false || this.countingGridModel == null)
                            ) {
                                this.setupFontSizeSetting();
                                this.getModelFiles();
                                // No unsubscribe needed. Observable completes.
                                this.jobUpdateService.stopConnection().subscribe();
                            }

                            this.changeDetectorRef.detectChanges();
                        }
                    }
                }
            );
    }

    private getModelFiles(isDemo = false): void {
        this.modelLoading = true;
        const jobId = this.documentWithJobs.jobs[0].id;

        const functionToUse: (fileName: string) => Observable<string> = isDemo === false ?
            (fileName: string) => this.browseCloudService.getJobFile(jobId, fileName) :
            (fileName: string) => this.browseCloudService.getDemoFile(fileName);

        zip(
            functionToUse('top_pi.txt'),
            functionToUse('colors_browser.txt'),
            functionToUse('words.txt'),
            functionToUse('docmap.txt'),
            functionToUse('database.txt'),
            functionToUse('legend.txt'),
            functionToUse('correspondences.txt'),
            functionToUse('top_pi_layers.txt')
        ).subscribe(
            // No unsubscribe needed. Observable completes.
            // Type declaration below to avoid TS2556.
            (result: [string, string, string, string, string, string, string, string]) => {
                this.modelLoading = false;
                this.documentList = [];
                try {
                    this.countingGridModel =
                        new CountingGridModel(...result);
                } catch (ex) {
                    this.loggerService.error(ex, {
                        documentId: this.documentWithJobs.document.id,
                    });

                    throw ex;
                }
                this.changeDetectorRef.detectChanges();
            },
            () => {
                this.modelLoading = false;
            }
        );
    }

    private setupFontSizeSetting(): void {
        if (this.documentWithJobs.jobs[0].settings == null) {
            this.documentWithJobs.jobs[0].settings = {};
        }

        if (this.documentWithJobs.jobs[0].settings.fontSettings == null) {
            this.documentWithJobs.jobs[0].settings.fontSettings = this.defaultFontSettings;
        }
    }
}
