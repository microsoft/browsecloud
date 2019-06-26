// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import {
    AfterViewInit,
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    ElementRef,
    EventEmitter,
    HostListener,
    Input,
    NgZone,
    OnChanges,
    Output,
    ViewChild
} from '@angular/core';
import { MatSliderChange } from '@angular/material';

import * as d3 from 'd3';
import { ZoomBehavior, ZoomTransform } from 'd3';

import { BrowseCloudFontSettings, CountingGridModel, IWordLabel } from '@browsecloud/models';

@Component({
    selector: 'app-cloud-view',
    templateUrl: './cloud-view.component.html',
    styleUrls: ['./cloud-view.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CloudViewComponent implements OnChanges, AfterViewInit {
    @ViewChild('cloudView', { static: true }) public entryElement: ElementRef<HTMLCanvasElement>;
    @Input() public model: CountingGridModel;
    @Input() public searchWordIds: number[] = [];
    @Input() public zoomRange: [number, number] = [1, 13];
    @Input() public maxLabels = 10000;
    @Input() public maxStartLabels = 500;
    @Input() public portionOfLabelsShownOnStart = 0.02;
    @Input() public pastBoundsTranslation = 300;
    @Input() public fontPolynomial: BrowseCloudFontSettings;
    @Input() public highlightPosition: [number, number];
    @Input() public highlightLength = 150;
    @Input() public pinCircleRadius = 10;

    @Output() public readonly pinPlaced: EventEmitter<[number, number]> = new EventEmitter();

    public currentTransform: ZoomTransform;

    private canvas: HTMLCanvasElement;
    private context: CanvasRenderingContext2D;
    private numberLabelsShownOnStart: number;
    private normalizedZoomFactor = 0;
    private pinCanvasCoordinates: [number, number];
    private textWidthCache: { [name: string]: number } = {};
    private zoomBehavior: ZoomBehavior<Element, {}>;

    constructor(
        private zone: NgZone,
        private changeDetectorRef: ChangeDetectorRef
    ) { }

    public ngOnChanges(): void {
        if (this.portionOfLabelsShownOnStart <= 0 || this.portionOfLabelsShownOnStart > 1) {
            throw new Error('portionOfLabelsShownOnStart must be between 0 and 1');
        }

        // Reset textWidthCache.
        this.textWidthCache = {};

        this.updateNumberLabelsShownOnStart();

        this.render();
    }

    public ngAfterViewInit(): void {
        this.canvas = this.entryElement.nativeElement;

        // Alpha is false below to enable the browser to make optimizations based on
        // the fact that we don't need the background of the canvas to be transparent.
        this.context = this.canvas.getContext('2d', { alpha: false });

        this.updateNumberLabelsShownOnStart();

        // Save for after view is visible.
        setTimeout(() => {
            this.makeBoundsUpdates();
            this.render();
        }, 0);
    }

    public resetVisualization(): void {
        this.pinCanvasCoordinates = null;
        d3.select(this.canvas).call(this.zoomBehavior.transform, d3.zoomIdentity);
    }

    public onCanvasClicked(event: MouseEvent) {
        this.pinCanvasCoordinates = [
            ((event.offsetX - this.currentTransform.x) / this.currentTransform.k) * window.devicePixelRatio,
            ((event.offsetY - this.currentTransform.y) / this.currentTransform.k) * window.devicePixelRatio,
        ];

        const colLength = this.canvas.width / this.model.topGrid.columnLength;
        const rowLength = this.canvas.height / this.model.topGrid.rowLength;
        let gridCol = Math.floor((this.pinCanvasCoordinates[0] + colLength / 2) / colLength) % this.model.topGrid.columnLength;
        let gridRow = Math.floor((this.pinCanvasCoordinates[1] + rowLength / 2) / rowLength) % this.model.topGrid.rowLength;
        gridCol = gridCol > 0 ? gridCol : gridCol + this.model.topGrid.columnLength;
        gridRow = gridRow > 0 ? gridRow : gridRow + this.model.topGrid.rowLength;

        this.pinPlaced.emit([gridRow, gridCol]);

        this.render();
    }

    public render(): void {
        if (this.canvas == null || this.context == null) {
            return;
        }

        if (this.currentTransform == null) {
            this.currentTransform = d3.zoomIdentity;
        }

        // Start with a clean slate.
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Fill black background.
        this.context.fillStyle = 'black';
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Calculate bounds of the zoomed grid.
        const visualizationWidth = this.canvas.width * this.currentTransform.k;
        const visualizationHeight = this.canvas.height * this.currentTransform.k;

        // Place words.
        const scaledGridData = this.model.getScaledGridData(
            this.searchWordIds,
            visualizationWidth,
            visualizationHeight,
            this.currentTransform.x * window.devicePixelRatio,
            this.currentTransform.y * window.devicePixelRatio,
            this.currentTransform.k
        );
        this.drawLabels(scaledGridData.wordLabels);

        if (this.pinCanvasCoordinates != null) {
            let pinActualX = ((this.pinCanvasCoordinates[0] * this.currentTransform.k)
                + (this.currentTransform.x * window.devicePixelRatio)) % visualizationWidth;
            let pinActualY = ((this.pinCanvasCoordinates[1] * this.currentTransform.k)
                + (this.currentTransform.y * window.devicePixelRatio)) % visualizationHeight;
            pinActualX = pinActualX > 0 ? pinActualX : pinActualX + visualizationWidth;
            pinActualY = pinActualY > 0 ? pinActualY : pinActualY + visualizationHeight;

            this.drawPinCircle(pinActualX, pinActualY);

            if (this.highlightPosition != null && this.highlightPosition[0] != null && this.highlightPosition[1]) {
                // Calculate highlight position nearest the pin.
                let highlightPossibleX = ((this.highlightPosition[0] * scaledGridData.colDistance)
                    + (this.currentTransform.x * window.devicePixelRatio)) % visualizationWidth;
                let highlightPossibleY = ((this.highlightPosition[1] * scaledGridData.rowDistance)
                    + (this.currentTransform.y * window.devicePixelRatio)) % visualizationHeight;
                highlightPossibleX = highlightPossibleX > 0 ? highlightPossibleX : highlightPossibleX + visualizationWidth;
                highlightPossibleY = highlightPossibleY > 0 ? highlightPossibleY : highlightPossibleY + visualizationHeight;

                const hightlightPossibleXs =
                    [highlightPossibleX - visualizationWidth, highlightPossibleX, highlightPossibleX - visualizationWidth];
                const hightlightPossibleYs =
                    [highlightPossibleY - visualizationHeight, highlightPossibleY, highlightPossibleY - visualizationHeight];

                this.drawHighlight(
                    hightlightPossibleXs.sort((a, b) => (b - pinActualX) - (a - pinActualX))[0],
                    hightlightPossibleYs.sort((a, b) => (b - pinActualY) - (a - pinActualY))[0]
                );
            }
        }
    }

    private drawLabels(wordLabels: IWordLabel[]): void {
        const numberToShow = this.normalizedZoomFactor * (wordLabels.length - this.numberLabelsShownOnStart)
            + this.numberLabelsShownOnStart;
        const startIndex = Math.max(0, wordLabels.length - Math.min(numberToShow, this.maxLabels));
        const numberOfWordsOnScreen = wordLabels.length - startIndex;

        // Global text settings.
        // Baseline at the top so the background rect will match the text.
        this.context.textBaseline = 'top';

        wordLabels.slice(startIndex).forEach((wordLabel, index) => {

            // Font size is quadratic.
            const fontSize = this.quadraticResult(
                wordLabel.scaledWeight, this.fontPolynomial.quadraticWeight, 0, this.fontPolynomial.minimum
            ) * window.devicePixelRatio;

            // tslint:disable-next-line:max-line-length
            this.context.font = `${fontSize}px \"Segoe UI Web (West European)\", \"Segoe UI\", -apple-system, BlinkMacSystemFont, \"Roboto\", \"Helvetica Neue\", sans-serif`;

            // Calculate Alpha as a portion of the total items to show.
            const alpha = 1 - ((numberOfWordsOnScreen - index) / numberOfWordsOnScreen);

            // calculate text placement
            if (this.textWidthCache[`${wordLabel.wordId}${wordLabel.scaledWeight}}`] == null) {
                this.textWidthCache[`${wordLabel.wordId}${wordLabel.scaledWeight}}`] = this.context.measureText(wordLabel.word).width;
            }
            const textWidth = this.textWidthCache[`${wordLabel.wordId}${wordLabel.scaledWeight}}`];
            const textX = wordLabel.point.x - textWidth / 2;
            const textY = wordLabel.point.y - fontSize / 2;

            // Display Background above threshold chosen for perf.
            if (alpha > 0.6) {
                // Background is black and half as transparent as the text so it can be seen through.
                this.context.fillStyle = `rgba(0, 0, 0, ${alpha * 0.5}`;
                this.context.fillRect(textX, textY, textWidth, fontSize);
            }

            // Text fill color setup. Alpha is also applied here.
            this.context.fillStyle = `rgba(${wordLabel.color.red}, ${wordLabel.color.green}, ${wordLabel.color.blue}, ${alpha})`;

            // Display word.
            this.context.fillText(wordLabel.word, textX, textY);
        });
    }

    private drawPinCircle(x: number, y: number): void {
        this.context.beginPath();
        this.context.arc(x - this.pinCircleRadius, y, this.pinCircleRadius * window.devicePixelRatio, 0, 2 * Math.PI, true);
        this.context.fillStyle = 'red';
        this.context.fill();
    }

    private drawHighlight(x: number, y: number): void {
        this.context.strokeStyle = 'yellow';
        this.context.lineWidth = 5 * window.devicePixelRatio;

        const length = this.highlightLength * this.currentTransform.k * window.devicePixelRatio;
        this.context.strokeRect(
            x - length / 2,
            y - length / 2,
            length, length
        );
    }

    @HostListener('window:resize', ['$event']) public onWindowResize(): void {
        // Update size and render.
        this.makeBoundsUpdates();
        this.render();
    }

    public onZoomSlider(change: MatSliderChange): void {
        this.zoomBehavior.scaleTo(d3.select(this.canvas), change.value);
    }

    private onZoom(): void {
        this.currentTransform = d3.event.transform;
        this.normalizedZoomFactor = (this.currentTransform.k - this.zoomRange[0]) / (this.zoomRange[1] - this.zoomRange[0]);
        this.changeDetectorRef.detectChanges();
        this.render();
    }

    private makeBoundsUpdates(): void {
        const oldWidth = this.canvas.width;
        const oldHeight = this.canvas.height;

        // Set initial size.
        this.canvas.width = this.canvas.offsetWidth * window.devicePixelRatio;
        this.canvas.height = this.canvas.offsetHeight * window.devicePixelRatio;

        // Setup d3 zoom. Outside NgZone so change detection is not constantly called.
        this.zone.runOutsideAngular(() => {
            this.zoomBehavior = d3.zoom()
                .scaleExtent(this.zoomRange)
                .on('zoom', () => this.onZoom());

            d3.select(this.canvas).call(this.zoomBehavior);
        });

        // Update pin location.
        if (this.pinCanvasCoordinates != null) {
            this.pinCanvasCoordinates[0] *= (this.canvas.width / oldWidth);
            this.pinCanvasCoordinates[1] *= (this.canvas.height / oldHeight);
        }
    }

    private updateNumberLabelsShownOnStart(): void {
        this.numberLabelsShownOnStart = Math.min(
            this.maxStartLabels, Math.floor(this.portionOfLabelsShownOnStart * this.model.topGrid.wordTags.length));
    }

    private quadraticResult(x: number, a: number, b: number, c: number) {
        return a * x ** 2 + b * x + c;
    }
}
