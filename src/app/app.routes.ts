import { Routes } from '@angular/router';
import { MainLayout } from './layouts/main-layout/main-layout';
import { Dashboard } from './features/dashboard/dashboard';

export const routes: Routes = [

    {
        path: '',
        component: MainLayout,
        children: [
            {
                path: '',
                component: Dashboard
            }
        ]
    }

];
