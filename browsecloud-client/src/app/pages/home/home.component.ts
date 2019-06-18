// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Component, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';

import { AuthService } from '@browsecloud/services';

@Component({
    selector: 'app-home',
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit {
    public loggingIn: boolean;

    constructor(
        private authService: AuthService,
        private titleService: Title
    ) { }

    public ngOnInit(): void {
        this.titleService.setTitle('BrowseCloud | Home');
    }

    public onLogin(): void {
        this.loggingIn = true;
        this.authService.login();
    }
}
