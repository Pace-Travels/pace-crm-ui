import { Routes } from '@angular/router';
import { MainLayout } from './layouts/main-layout/main-layout';
import { AuthLayout } from './layouts/auth-layout/auth-layout';

import { Dashboard } from './features/dashboard/dashboard';
import { LiveChat } from './features/live-chat/live-chat';
import { Campaigns } from './features/campaigns/campaigns';
import { CreateCampaignView } from './features/campaigns/create-campaign-view/create-campaign-view';
import { LandingView } from './features/landing/landing-view/landing-view';
import { Contacts } from './features/contacts/contacts';
import { Flows } from './features/flows/flows';
import { FlowCanvasView } from './features/flows/components/flow-canvas-view/flow-canvas-view';
import { DocsViewer } from './features/docs/docs-viewer/docs-viewer';
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

import { EventsRadar } from './features/events-radar/events-radar';

export const routes: Routes = [
    {
        path: '',
        component: LandingView,
        pathMatch: 'full',
        title: 'Pace Messenger - AI Enabled Multi Messenger Platform'
    },
    {
        path: 'login',
        component: AuthLayout,
        children: [
            { path: '', component: LoginView, title: 'Login - Pace Messenger' }
        ]
    },
    {
        path: 'signup',
        component: AuthLayout,
        children: [
            { path: '', component: SignupView, title: 'Sign Up - Pace Messenger' }
        ]
    },
    {
        path: '',
        component: MainLayout,
        children: [
            {
                path: 'projects',
                component: ProjectsView,
                title: 'Projects - Pace Messenger'
            },
            {
                path: 'events-radar',
                component: EventsRadar,
                title: 'Event Intelligence Radar - Pace Messenger'
            },
            {
                path: 'dashboard',
                component: Dashboard,
                title: 'Dashboard - Pace Messenger'
            },
            {
                path: 'account',
                component: AccountLayout,
                children: [
                    { path: '', component: ProfileView, title: 'Profile - Pace Messenger' }
                ]
            },
            {
                path: 'agents',
                component: AgentsView,
                title: 'Agents - Pace Messenger'
            },
            {
                path: 'developer',
                component: DeveloperView,
                title: 'Developer - Pace Messenger'
            },
            {
                path: 'chat',
                component: LiveChat,
                title: 'Live Chat - Pace Messenger'
            },
            {
                path: 'campaigns',
                children: [
                    { path: '', component: Campaigns, title: 'Campaigns - Pace Messenger' },
                    { path: 'create', component: CreateCampaignView, title: 'Create Campaign - Pace Messenger' }
                ]
            },
            {
                path: 'contacts',
                component: Contacts,
                title: 'Contacts - Pace Messenger'
            },
            {
                path: 'flows',
                children: [
                    { path: '', component: Flows, title: 'Flows - Pace Messenger' },
                    { path: 'builder', component: FlowCanvasView, title: 'Flow Builder - Pace Messenger' }
                ]
            },
            {
                path: 'ads',
                component: AdsManager,
                title: 'Ads Manager - Pace Messenger'
            },
            {
                path: 'payments',
                component: Payments,
                title: 'Payments - Pace Messenger'
            },
            {
                path: 'integrations',
                component: Integrations,
                title: 'Integrations - Pace Messenger'
            },
            {
                path: 'manage',
                component: Manage,
                title: 'Manage - Pace Messenger'
            },
            {
                path: 'docs',
                component: DocsViewer,
                title: 'Documentation - Pace Messenger'
            }
        ]
    }
];
