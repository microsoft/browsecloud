// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from '../app/app-root/app.module';
import { environment } from '../environments/environment';

// Required by Material for gestures.
import 'hammerjs';

if (environment.production) {
    enableProdMode();
}

platformBrowserDynamic().bootstrapModule(AppModule)
    .catch((err) => console.error(err));
