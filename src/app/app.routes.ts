import { Routes } from '@angular/router';
import { MainLayout } from './layouts/main-layout/main-layout';
import { AuthLayout } from './layouts/auth-layout/auth-layout';
import { ProjectsLayout } from './layouts/projects-layout/projects-layout';
import { Dashboard } from './features/dashboard/dashboard';
import { LiveChat } from './features/live-chat/live-chat';
import { Campaigns } from './features/campaigns/campaigns';
import { CreateCampaignView } from './features/campaigns/create-campaign-view/create-campaign-view';
import { LandingView } from './features/landing/landing-view/landing-view';
import { Contacts } from './features/contacts/contacts';
import { Flows } from './features/flows/flows';
import { AdsManager } from './features/ads-manager/ads-manager';
import { Payments } from './features/payments/payments';
import { Integrations } from './features/integrations/integrations';
import { Manage } from './features/manage/manage';
import { LoginView } from './features/auth/login-view/login-view';
import { SignupView } from './features/auth/signup-view/signup-view';
import { ProjectsView } from './features/projects/projects-view/projects-view';
import { DeveloperView } from './features/developer/developer-view/developer-view';
import { AgentsView } from './features/agents/agents-view/agents-view';
import { AccountLayout } from './features/account/account-layout/account-layout';
import { ProfileView } from './features/account/profile-view/profile-view';

export const routes: Routes = [
    {
        path: '',
        component: LandingView,
        pathMatch: 'full'
    },
    {
        path: 'login',
        component: AuthLayout,
        children: [
            { path: '', component: LoginView }
        ]
    },
    {
        path: 'signup',
        component: AuthLayout,
        children: [
            { path: '', component: SignupView }
        ]
    },
    {
        path: 'projects',
        component: ProjectsLayout,
        children: [
            { path: '', component: ProjectsView }
        ]
    },
    {
        path: '',
        component: MainLayout,
        children: [
            {
                path: 'dashboard',
                component: Dashboard
            },
            {
                path: 'account',
                component: AccountLayout,
                children: [
                    { path: '', component: ProfileView }
                ]
            },
            {
                path: 'agents',
                component: AgentsView
            },
            {
                path: 'developer',
                component: DeveloperView
            },
            {
                path: 'chat',
                component: LiveChat
            },
            {
                path: 'campaigns',
                component: Campaigns
            },
            {
                path: 'campaigns/create',
                component: CreateCampaignView
            },
            {
                path: 'contacts',
                component: Contacts
            },
            {
                path: 'flows',
                component: Flows
            },
            {
                path: 'ads',
                component: AdsManager
            },
            {
                path: 'payments',
                component: Payments
            },
            {
                path: 'integrations',
                component: Integrations
            },
            {
                path: 'manage',
                component: Manage
            }
        ]
    }

];
