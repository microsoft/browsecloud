// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { MatCheckboxChange, MatDialogRef } from '@angular/material';

import { mergeMap } from 'rxjs/operators';

import { BrowseCloudService } from '@browsecloud/services';
import { FileUtils } from '@browsecloud/utils';

@Component({
    selector: 'app-add-document-dialog',
    templateUrl: './add-document-dialog.component.html',
    styleUrls: ['./add-document-dialog.component.scss'],
})
export class AddDocumentDialogComponent implements OnInit {
    @ViewChild('filePicker', { static: false }) public filePicker: ElementRef;
    public documentNameFormControl: FormControl;
    public descriptionFormControl: FormControl;
    public documentName = '';
    public description = '';
    public isPublic = false;
    public file: File;
    public fileName: string;
    public fileText: string;
    public validationText: string;
    public isValidFile = false;
    public loading = false;

    constructor(
        private dialog: MatDialogRef<AddDocumentDialogComponent>,
        private browseCloudService: BrowseCloudService
    ) { }

    public ngOnInit(): void {
        this.documentNameFormControl = new FormControl(this.documentName, [Validators.required, Validators.maxLength(50)]);
        this.descriptionFormControl = new FormControl(this.description, [Validators.maxLength(140)]);

        // mark as touched, so errors show immediately once someone clicks the publish checkbox.
        if (this.isPublic === false) {
            this.descriptionFormControl.markAsTouched();
        }
    }

    public onPublishChanged(change: MatCheckboxChange): void {
        this.isPublic = change.checked;
    }

    public onSelectFileClicked(): void {
        (this.filePicker.nativeElement as HTMLInputElement).click();
    }

    public onFilePickerChange(): void {
        const filePicker = this.filePicker.nativeElement as HTMLInputElement;
        this.file = filePicker.files.item(0);

        // Reset value to null
        filePicker.value = null;

        if (this.file == null) {
            return;
        }

        this.fileName = this.file.name;

        // Test file.
        this.validationText = 'Loading...';
        this.isValidFile = false;
        FileUtils.openFile(this.file)
            .pipe(
                mergeMap((text) => {
                    this.fileText = text.trim();
                    return this.browseCloudService.postValidateDocumentWithText(this.fileText);
                })
            )
            .subscribe(
                // No unsubscribe needed. Observable completes.
                (validationResponse) => {
                    this.validationText = validationResponse.message;
                    this.isValidFile = validationResponse.isValid;
                }
            );
    }

    public onAddDocumentClicked(): void {
        this.documentName = this.documentNameFormControl.value;
        this.description = this.descriptionFormControl.value;

        this.loading = true;
        this.dialog.disableClose = true;
        this.browseCloudService.postDocumentWithTextAndModifyDocument(this.fileText, this.documentName, this.description, this.isPublic)
            .pipe(
                mergeMap((document) => this.browseCloudService.addJobsToDocument(document))
            )
            .subscribe(
                // No unsubscribe needed. Observable completes.
                (documentWithJobs) => {
                    this.dialog.close(documentWithJobs);
                },
                (error) => {
                    this.dialog.close();
                }
            );
    }

    public onCancelClicked(): void {
        this.dialog.close();
    }
}
