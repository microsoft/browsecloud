// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { LoggedInGuard, NeedLoginGuard } from '../guards';
import { DashboardComponent } from '../pages/dashboard/dashboard.component';
import { DocumentComponent } from '../pages/document/document.component';
import { GalleryComponent } from '../pages/gallery/gallery.component';
import { HomeComponent } from '../pages/home/home.component';
import { LoginComponent } from '../pages/login/login.component';
import { NotFoundComponent } from '../pages/not-found/not-found.component';

const routes: Routes = [
    {
        path: 'home',
        component: HomeComponent,
        canActivate: [LoggedInGuard],
    },
    {
        path: 'login',
        component: LoginComponent,
        canActivate: [LoggedInGuard],
    },
    {
        path: 'gallery',
        component: GalleryComponent,
        canActivate: [NeedLoginGuard],
    },
    {
        path: 'document/:id',
        component: DocumentComponent,
        canActivate: [NeedLoginGuard],
    },
    {
        path: 'visualization/:id',
        component: DocumentComponent,
        canActivate: [NeedLoginGuard],
    },
    {
        path: '',
        component: DashboardComponent,
        canActivate: [NeedLoginGuard],
    },
    {
        path: '**',
        component: NotFoundComponent,
    },
];

@NgModule({
    imports: [RouterModule.forRoot(routes)],
    exports: [RouterModule],
})
export class AppRoutingModule { }
