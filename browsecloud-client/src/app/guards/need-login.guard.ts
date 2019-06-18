// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot } from '@angular/router';

import { AuthService } from '@browsecloud/services';

@Injectable()
export class NeedLoginGuard implements CanActivate {
    constructor(private authService: AuthService, private router: Router) { }

    public canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
        if (this.authService.loggedIn) {
            return true;
        }

        this.router.navigate(['/home'], { queryParams: { redirect: state.url }});
        return false;
    }
}
