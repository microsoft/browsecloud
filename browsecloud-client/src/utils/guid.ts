// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export class Guid {
    private static emptyInternal = new Guid('00000000-0000-0000-0000-000000000000');

    private constructor(private strGuid: string) {
        // Do nothing.
    }

    /**
     * Initializes a new instance of the Guid class.
     */
    public static newGuid(): Guid {
        // Modified version of the code in one of the answers here:
        // https://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
        let date = Date.now();

        if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
            date += performance.now();
        }

        const strGuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            // Disable "no-bitwise" rule - bitwise operations are needed here.
            /* tslint:disable:no-bitwise */

            const r = (date + Math.random() * 16) % 16 | 0;

            date = Math.floor(date / 16);

            return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);

            // Enable "no-bitwise" rule back.
            /* tslint:enable:no-bitwise */
        });

        return new Guid(strGuid);
    }

    /**
     * A read-only instance of the Guid class whose value is all zeroes.
     */
    public static get empty(): Guid {
        return this.emptyInternal;
    }

    /**
     * Gets string representation of the Guid object.
     */
    toString(): string {
        return this.strGuid;
    }
}
