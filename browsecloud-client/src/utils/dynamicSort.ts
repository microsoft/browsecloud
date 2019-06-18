// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/** Given a property name, returns a function that array.sort() can use to sort based on that property */
export function dynamicSort(property: string): (a: any, b: any) => number {
    if (property == null) {
        return (a: any, b: any) => 0;
    }

    let sortOrder = 1;
    if (property[0] === '-') {
        sortOrder = -1;
        property = property.substr(1);
    }
    return (a: any, b: any) => {
        const result = (a[property] < b[property]) ? -1 : (a[property] > b[property]) ? 1 : 0;
        return result * sortOrder;
    };
}
