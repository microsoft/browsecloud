// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Component, ViewChild } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { MatCheckboxChange, MatDialogRef } from '@angular/material';

import { map } from 'rxjs/operators';

import { BrowseCloudDocument, BrowseCloudUserIdentity } from '@browsecloud/models';
import { BrowseCloudService } from '@browsecloud/services';
import { UserInputComponent } from '@browsecloud/shared/user-input/user-input.component';

@Component({
    selector: 'app-edit-document-dialog',
    templateUrl: './edit-document-dialog.component.html',
    styleUrls: ['./edit-document-dialog.component.scss'],
})
export class EditDocumentDialogComponent {
    @ViewChild('ownerInput') public ownerInput: UserInputComponent;
    public document: BrowseCloudDocument;
    public documentNameFormControl: FormControl;
    public descriptionFormControl: FormControl;
    public loading = false;

    constructor(
        private dialog: MatDialogRef<EditDocumentDialogComponent>,
        private browseCloudService: BrowseCloudService
    ) { }

    public setDocument(document: BrowseCloudDocument): void {
        // Make a copy of the fields we need so we don't modify the actual document.
        // This is not a deep copy (it won't copy objects), but we only modify primitives, so it's ok.
        this.document = Object.assign({}, document);

        this.documentNameFormControl = new FormControl(this.document.displayName, [Validators.required, Validators.maxLength(50)]);
        this.descriptionFormControl = new FormControl(this.document.description, [Validators.maxLength(140)]);

        // mark as touched, so errors show immediately once someone clicks the publish checkbox.
        this.descriptionFormControl.markAsTouched();
    }

    public onPublishChanged(change: MatCheckboxChange): void {
        this.document.isPublic = change.checked;
    }

    public onOwnerChanged(owner: BrowseCloudUserIdentity): void {
        this.document.owner = owner;
    }

    public onAclChanged(acl: BrowseCloudUserIdentity[]): void {
        this.document.acl = acl;
    }

    public onEditDocumentClicked(): void {
        this.document.displayName = this.documentNameFormControl.value;
        this.document.description = this.descriptionFormControl.value;

        this.loading = true;
        this.dialog.disableClose = true;
        this.browseCloudService.putDocument(this.document)
            .pipe(
                map((document) => document)
            )
            .subscribe(
                // No unsubscribe needed. Observable completes.
                (document) => {
                    this.dialog.close(document);
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
