// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Component, Input } from '@angular/core';

@Component({
    selector: 'app-loading-greyout',
    templateUrl: './loading-greyout.component.html',
    styleUrls: ['./loading-greyout.component.scss'],
})
export class LoadingGreyoutComponent {
    @Input() public show: boolean;
    @Input() public size: string;
    @Input() public global: boolean;
}
