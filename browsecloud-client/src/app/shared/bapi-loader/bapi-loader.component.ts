// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Component, Input, OnChanges } from '@angular/core';

export type LoaderTheme = 'dark' | 'light';
export type LoaderSize = 'large' | 'small' ;

export interface ISpinnerSize {
    diameter: number;
    strokeWidth: number;
}

export const spinnerSizes: { [name: string]: ISpinnerSize } = {
    large: {
        diameter: 50,
        strokeWidth: 5,
    },
    small: {
        diameter: 20,
        strokeWidth: 2,
    },
};

@Component({
    selector: 'app-bapi-loader',
    template: '<mat-spinner [diameter]="spinnerSize.diameter" [strokeWidth]="spinnerSize.strokeWidth"></mat-spinner>',
})
export class BapiLoaderComponent implements OnChanges {
    @Input() public size: LoaderSize = 'large';

    public spinnerSize: ISpinnerSize = spinnerSizes[this.size];

    public ngOnChanges(): void {
        this.spinnerSize = spinnerSizes[this.size];
    }
}
