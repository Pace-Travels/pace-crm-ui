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
import { ForgotPasswordView } from './features/auth/forgot-password-view/forgot-password-view';
import { ProjectsView } from './features/projects/projects-view/projects-view';
import { DeveloperView } from './features/developer/developer-view/developer-view';
import { AgentsView } from './features/agents/agents-view/agents-view';
import { AccountLayout } from './features/account/account-layout/account-layout';
import { ProfileView } from './features/account/profile-view/profile-view';

import { EventsRadar } from './features/events-radar/events-radar';
import { MarketIntelligence } from './features/market-intelligence/market-intelligence';
import { AIMarketingIntelligence } from './features/ai-marketing-intelligence/ai-marketing-intelligence';
import { WebPush } from './features/webpush/components/web-push/web-push';
import { Email } from './features/email/components/email/email';
import { Templates } from './features/templates/templates';
import { CreateTemplateView } from './features/templates/create-template-view/create-template-view';
import { AiTemplateGeneratorView } from './features/templates/ai-template-generator-view/ai-template-generator-view';
import { OptInManagementView } from './features/templates/opt-in-management-view/opt-in-management-view';
import { History } from './features/history/history';
import { CsvGraphs } from './features/graphs/components/csv-graphs/csv-graphs';

// Public Marketing Pages
import { FeaturesView } from './features/public/features-view/features-view';
import { AboutView } from './features/public/about-view/about-view';
import { BlogView } from './features/public/blog-view/blog-view';
import { ContactView } from './features/public/contact-view/contact-view';
import { PricingView } from './features/public/pricing-view/pricing-view';

export const routes: Routes = [
    {
        path: '',
        component: LandingView,
        pathMatch: 'full',
        title: 'QuoteDesks Messenger - Conversational WhatsApp CRM'
    },
    {
        path: 'features',
        component: FeaturesView,
        title: 'Features - QuoteDesks Messenger'
    },
    {
        path: 'about',
        component: AboutView,
        title: 'About Us - QuoteDesks Messenger'
    },
    {
        path: 'blog',
        component: BlogView,
        title: 'Blog & Insights - QuoteDesks Messenger'
    },
    {
        path: 'contact',
        component: ContactView,
        title: 'Contact Us - QuoteDesks Messenger'
    },
    {
        path: 'pricing',
        component: PricingView,
        title: 'Pricing - QuoteDesks Messenger'
    },
    {
        path: 'login',
        component: AuthLayout,
        children: [
            { path: '', component: LoginView, title: 'Login - QuoteDesks Messenger' }
        ]
    },
    {
        path: 'signup',
        component: AuthLayout,
        children: [
            { path: '', component: SignupView, title: 'Sign Up - QuoteDesks Messenger' }
        ]
    },
    {
        path: 'forgot-password',
        component: AuthLayout,
        children: [
            { path: '', component: ForgotPasswordView, title: 'Forgot Password - QuoteDesks Messenger' }
        ]
    },
    {
        path: 'app',
        component: MainLayout,
        children: [
            {
                path: 'projects',
                component: ProjectsView,
                title: 'Projects - QuoteDesks Messenger'
            },
            {
                path: 'events-radar',
                component: EventsRadar,
                title: 'Event Intelligence Radar - QuoteDesks Messenger'
            },
            {
                path: 'dashboard',
                component: Dashboard,
                title: 'Dashboard - QuoteDesks Messenger'
            },
            {
                path: 'account',
                component: AccountLayout,
                children: [
                    { path: '', component: ProfileView, title: 'Profile - QuoteDesks Messenger' }
                ]
            },
            {
                path: 'agents',
                component: AgentsView,
                title: 'Agents - QuoteDesks Messenger'
            },
            {
                path: 'developer',
                component: DeveloperView,
                title: 'Developer - QuoteDesks Messenger'
            },
            {
                path: 'live-chat',
                component: LiveChat,
                title: 'Live Chat - QuoteDesks Messenger'
            },
            {
                path: 'history',
                component: History,
                title: 'Communication History - QuoteDesks Messenger'
            },
            {
                path: 'campaigns',
                children: [
                    { path: '', component: Campaigns, title: 'Campaigns - QuoteDesks Messenger' },
                    { path: 'create', component: CreateCampaignView, title: 'Create Campaign - QuoteDesks Messenger' }
                ]
            },
            {
                path: 'templates',
                children: [
                    { path: '', component: Templates, title: 'Message Templates - QuoteDesks Messenger' },
                    { path: 'create', component: CreateTemplateView, title: 'Create Template - QuoteDesks Messenger' },
                    { path: 'generate-ai', component: AiTemplateGeneratorView, title: 'Generate Template with AI - QuoteDesks Messenger' },
                    { path: 'opt-in', component: OptInManagementView, title: 'Opt-in Management - QuoteDesks Messenger' }
                ]
            },
            {
                path: 'contacts',
                component: Contacts,
                title: 'Contacts - QuoteDesks Messenger'
            },
            {
                path: 'flows',
                children: [
                    { path: '', component: Flows, title: 'Flows - QuoteDesks Messenger' },
                    { path: 'builder', component: FlowCanvasView, title: 'Flow Builder - QuoteDesks Messenger' },
                    { path: 'canvas', component: FlowCanvasView, title: 'Flow Canvas Builder - QuoteDesks Messenger' },
                    { path: 'canvas/:id', component: FlowCanvasView, title: 'Edit Flow Canvas - QuoteDesks Messenger' }
                ]
            },
            {
                path: 'ads-manager',
                component: AdsManager,
                title: 'Ads Manager - QuoteDesks Messenger'
            },
            {
                path: 'payments',
                component: Payments,
                title: 'Payments - QuoteDesks Messenger'
            },
            {
                path: 'integrations',
                component: Integrations,
                title: 'Integrations - QuoteDesks Messenger'
            },
            {
                path: 'manage',
                component: Manage,
                title: 'Manage - QuoteDesks Messenger'
            },
            {
                path: 'docs',
                component: DocsViewer,
                title: 'Documentation - QuoteDesks Messenger'
            },
            {
                path: 'webpush', component: WebPush, title: 'Web Push - QuoteDesks Messenger'
            },
            {
                path: 'email', component: Email, title: 'E-mail - QuoteDesks Messenger'
            },
            {
                path: 'csvdata', component: CsvGraphs, title: 'CSV Data - QuoteDesks Messenger'
            },
            {
                path: 'market-intelligence',
                component: MarketIntelligence,
                title: 'Market Intelligence Cloud - QuoteDesks Messenger'
            },
            {
                path: 'ai-marketing-intelligence',
                component: AIMarketingIntelligence,
                title: 'AI Marketing Intelligence Platform - QuoteDesks Messenger'
            }
        ]
    }
];
