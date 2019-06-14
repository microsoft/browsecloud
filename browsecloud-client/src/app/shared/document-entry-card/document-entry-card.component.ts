// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Component, Input, OnChanges } from '@angular/core';
import { DomSanitizer, SafeHtml, SafeStyle } from '@angular/platform-browser';

import { IDocEntry } from '@browsecloud/models/cg-database';
import { CGLegend } from '@browsecloud/models/cg-legend';

@Component({
    selector: 'app-document-entry-card',
    templateUrl: './document-entry-card.component.html',
    styleUrls: ['./document-entry-card.component.scss'],
})
export class DocumentEntryCardComponent implements OnChanges {
    @Input() public docEntry: IDocEntry;
    @Input() public legend: CGLegend;
    @Input() public wordsToHighlight: string[];
    public linkValid: boolean;
    public abstractValid: boolean;
    public docEntryAbstract: SafeHtml;
    public docEntryTitle: SafeHtml;
    public backgroundColor: SafeStyle;
    public otherFieldKeys: string[];
    public moreInfoOpen = false;
    public moreInfoPresent = false;

    public constructor(
        private domSanitizer: DomSanitizer
    ) { }

    public ngOnChanges(): void {
        // Don't show an empty link / abstract or the default outut of the trainer.
        this.linkValid = this.docEntry.link != null && this.docEntry.link !== '';
        this.abstractValid = this.docEntry.abstract != null && this.docEntry.abstract !== 'nan' && this.docEntry.abstract !== '';

        if (this.docEntry.otherFields != null) {
            this.otherFieldKeys = Object.keys(this.docEntry.otherFields);
            this.moreInfoPresent = this.otherFieldKeys.length > 0;
        }

        let docEntryAbstract = this.docEntry.abstract;
        let docEntryTitle = this.docEntry.title;

        if (this.wordsToHighlight != null && this.wordsToHighlight.length !== 0) {
            this.wordsToHighlight.forEach((word) => {
                docEntryAbstract =
                    docEntryAbstract.replace(
                        new RegExp(`\\b${this.escapeRegExp(word)}\\b`, 'gi'),
                        (match) => `<span class="highlight-text">${match}</span>`
                    );

                docEntryTitle =
                    docEntryTitle.replace(
                        new RegExp(`\\b${this.escapeRegExp(word)}\\b`, 'gi'),
                        (match) => `<span class="highlight-text">${match}</span>`
                    );
            });
        }

        this.docEntryTitle = this.domSanitizer.bypassSecurityTrustHtml(docEntryTitle);
        this.docEntryAbstract = this.domSanitizer.bypassSecurityTrustHtml(docEntryAbstract);

        const color = this.legend.getColorForFeature(this.docEntry.feature);
        if (color != null) {
            this.backgroundColor = this.domSanitizer.bypassSecurityTrustStyle(`rgba(${color.red}, ${color.green}, ${color.blue}, 0.4)`);
        }
    }

    private escapeRegExp(str: string): string {
        return str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, '\\$1');
    }
}
