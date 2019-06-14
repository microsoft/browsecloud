// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export interface IRGBColor {
    red: number;
    green: number;
    blue: number;
}

/** From colors_browser.txt. Contains the RGB Color of each grid. */
export class CGColor {
    private readonly maxColorValue = 255;
    private colorMap: IRGBColor[][];

    public constructor(colorBrowserText: string) {
        this.parseColor(colorBrowserText);
    }

    public getColor(row: number, col: number) {
        if (this.colorMap[row - 1] == null) {
            return null;
        }

        return this.colorMap[row - 1][col - 1];
    }

    private parseColor(colorBrowserText: string): void {
        this.colorMap = [];
        const lines = colorBrowserText.split(/\r?\n/);
        lines.forEach((line) => {
            const [rowText, colText, redText, greenText, blueText] = line.split('\t');
            const row = parseInt(rowText, 10);
            const col = parseInt(colText, 10);
            const red = parseFloat(redText) * this.maxColorValue;
            const green = parseFloat(greenText) * this.maxColorValue;
            const blue = parseFloat(blueText) * this.maxColorValue;

            if (this.colorMap[row - 1] == null) {
                this.colorMap[row - 1] = [];
            }

            this.colorMap[row - 1][col - 1] = { red, green, blue };
        });
    }
}
