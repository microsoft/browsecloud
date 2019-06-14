// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Observable, Subject } from 'rxjs';
import { first } from 'rxjs/operators';

export class FileUtils {
    public static openFile(file: File): Observable<string> {
        if (file == null) {
            return null;
        }

        const sub: Subject<string> = new Subject();

        const reader = new FileReader();
        reader.onload = (event) => {
            sub.next(reader.result as string);
        };
        reader.readAsText(file);

        return sub
            .pipe(
                first()
            );
    }
}
