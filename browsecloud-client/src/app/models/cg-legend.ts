// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { IRGBColor } from './cg-color';

export interface ILegendItem {
    name: string;
    color: IRGBColor;
}

export class CGLegend {
    private readonly maxColorValue = 255;

    public first: ILegendItem;
    public middle: IRGBColor;
    public second: ILegendItem;

    public constructor(legendText: string) {
        this.parseLegend(legendText);
    }

    public get hasLegend(): boolean {
        return this.first != null && this.second != null;
    }

    public getColorForFeature(feature: number): IRGBColor {
        if (feature >= 0 && feature <= 0.5) {
            return this.calculateColorFade(this.first.color, this.middle, feature * 2);
        } else if (feature > 0.5  && feature <= 1) {
            return this.calculateColorFade(this.middle, this.second.color, (feature - 0.5) * 2);
        }

        return null;
    }

    private parseLegend(legendText: string): void {
        if (legendText == null || legendText.trim() === '') {
            // Empty legends allowed.
            return;
        }
        const textComponents = legendText.split('\t');

        if (textComponents.length !== 11) {
            throw new Error('legend.txt improperly formatted.');
        }

        this.first = {
            name: textComponents[0].trim(),
            color: {
                red: parseFloat(textComponents[1]) * this.maxColorValue,
                green: parseFloat(textComponents[2]) * this.maxColorValue,
                blue: parseFloat(textComponents[3]) * this.maxColorValue,
            },
        };

        this.middle = {
            red: parseFloat(textComponents[4]) * this.maxColorValue,
            green: parseFloat(textComponents[5]) * this.maxColorValue,
            blue: parseFloat(textComponents[6]) * this.maxColorValue,
        };

        this.second = {
            name: textComponents[7].trim(),
            color: {
                red: parseFloat(textComponents[8]) * this.maxColorValue,
                green: parseFloat(textComponents[9]) * this.maxColorValue,
                blue: parseFloat(textComponents[10]) * this.maxColorValue,
            },
        };
    }

    private calculateColorFade(start: IRGBColor, end: IRGBColor, fadeAmount: number): IRGBColor {
        const diffColor: IRGBColor = {
            red: end.red - start.red,
            green: end.green - start.green,
            blue: end.blue - start.blue,
        };

        return {
            red: (diffColor.red * fadeAmount) + start.red,
            green: (diffColor.green * fadeAmount) + start.green,
            blue: (diffColor.blue * fadeAmount) + start.blue,
        };
    }
}
