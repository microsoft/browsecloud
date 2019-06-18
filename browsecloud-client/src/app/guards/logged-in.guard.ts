// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot } from '@angular/router';

import { AuthService } from '@browsecloud/services';

@Injectable()
export class LoggedInGuard implements CanActivate {
    constructor(private authService: AuthService, private router: Router) { }

    public canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
        if (this.authService.loggedIn) {
            const redirectUrl = route.queryParams['redirect'] == null ? '/' : route.queryParams['redirect'];
            this.router.navigateByUrl(redirectUrl);
            return false;
        }

        return true;
    }
}
