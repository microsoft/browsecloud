// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Component, Input, OnChanges } from '@angular/core';
import { DomSanitizer, SafeStyle } from '@angular/platform-browser';

import { IRGBColor } from '@browsecloud/models/cg-color';
import { CGLegend } from '@browsecloud/models/cg-legend';

@Component({
    selector: 'app-legend',
    templateUrl: './legend.component.html',
    styleUrls: ['./legend.component.scss'],
})
export class LegendComponent implements OnChanges {
    @Input() public legend: CGLegend;

    public backgroundColor: SafeStyle;
    public firstTextColor: SafeStyle;
    public secondTextColor: SafeStyle;

    public constructor(private sanitizer: DomSanitizer) { }

    public ngOnChanges(): void {
        if (this.legend == null) {
            return;
        }

        this.firstTextColor = this.getTextColorFromBackgroundColor(this.legend.first.color);
        this.secondTextColor = this.getTextColorFromBackgroundColor(this.legend.second.color);

        const backgroundColorString =
            `linear-gradient(to right,
                rgb(${this.legend.first.color.red}, ${this.legend.first.color.green}, ${this.legend.first.color.blue}),
                rgb(${this.legend.middle.red}, ${this.legend.middle.green}, ${this.legend.middle.blue}),
                rgb(${this.legend.second.color.red}, ${this.legend.second.color.green}, ${this.legend.second.color.blue}))`;

        this.backgroundColor = this.sanitizer.bypassSecurityTrustStyle(backgroundColorString);
    }

    private getTextColorFromBackgroundColor(color: IRGBColor): SafeStyle {
        // From http://www.w3.org/TR/AERT#color-contrast.
        const contrast = Math.round(((color.red * 299) + (color.green * 587) + (color.blue * 114)) / 1000);

        return contrast > 125 ?
            this.sanitizer.bypassSecurityTrustStyle('black') :
            this.sanitizer.bypassSecurityTrustStyle('white');
    }
}
