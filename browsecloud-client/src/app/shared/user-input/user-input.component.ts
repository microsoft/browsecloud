// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { FormControl } from '@angular/forms';

import { of, Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';

import { BrowseCloudUserIdentity } from '@browsecloud/models';
import { GraphService } from '@browsecloud/services';

@Component({
    selector: 'app-user-input',
    templateUrl: './user-input.component.html',
    styleUrls: ['./user-input.component.scss'],
})
export class UserInputComponent implements OnChanges, OnInit, OnDestroy {
    @ViewChild('chipInput') chipInputElement: ElementRef;
    @Input() public chipInput = false;
    @Input() public user: BrowseCloudUserIdentity;
    @Input() public users: BrowseCloudUserIdentity[];
    @Input() public placeholder: string;
    @Output() public readonly valueChange = new EventEmitter<BrowseCloudUserIdentity | BrowseCloudUserIdentity[]>();
    public options: BrowseCloudUserIdentity[] = [];
    public loading = false;
    public singleUserFormControl: FormControl;
    public typeaheadDebounceSubject = new Subject<string>();
    public typeaheadDebounceSubscription: Subscription;

    constructor(private graphService: GraphService) { }

    public ngOnInit(): void {
        // Initialize options to known/initial value.
        this.options = this.user != null ? [this.user] : [];

        // Setup typeahead data debounce.
        this.typeaheadDebounceSubscription = this.typeaheadDebounceSubject
            .pipe(
                debounceTime(300),
                distinctUntilChanged(),
                switchMap((startsWith) => {
                    return startsWith && startsWith.length > 2 ?
                        this.graphService.getTypeaheadContacts(startsWith) :
                        of([]);
                })
            ).subscribe(
                (result) => {
                    this.loading = false;
                    this.options = result;
                }
            );
    }

    public ngOnChanges(): void {
        if (this.user == null) {
            return;
        }

        // Setup single user FormControl.
        this.singleUserFormControl = new FormControl(this.user.displayName);

        // Reset options to known/initial value.
        this.options = this.user != null ? [this.user] : [];
    }

    public ngOnDestroy(): void {
        if (this.typeaheadDebounceSubscription != null) {
            this.typeaheadDebounceSubscription.unsubscribe();
        }
    }

    public onAutocompleteOptionSelected(user: BrowseCloudUserIdentity): void {
        if (user != null) {
            if (this.users.findIndex(
                (userFromList) => userFromList.principalName.toLocaleLowerCase() === user.principalName.toLocaleLowerCase()) === -1
            ) {
                this.users.push(user);
                this.valueChange.next(this.users);
            }
        }

        this.chipInputElement.nativeElement.value = '';
    }

    public onRemoveUser(user: BrowseCloudUserIdentity): void {
        if (user == null) {
            return;
        }

        const index = this.users.indexOf(user);

        if (index >= 0) {
            this.users.splice(index, 1);
            this.valueChange.next(this.users);
        }
    }

    public singleUserOptionSelected(value: BrowseCloudUserIdentity): void {
        if (value == null) {
            return;
        }

        this.user = value;
        this.singleUserFormControl.setValue(value.displayName);
    }

    public onInputKeyUp(inputText: string): void {
        this.loading = true;
        this.typeaheadDebounceSubject.next(inputText);
    }

    public checkSingleUserInputErrorsAndOutput(): void {
        // See if it was selected from the latest options.
        if (this.options.map((user) => user.displayName).includes(this.singleUserFormControl.value)) {
            this.valueChange.next(this.user);
        } else {
            this.singleUserFormControl.setErrors({
                invalid: true,
            });
        }
    }
}
