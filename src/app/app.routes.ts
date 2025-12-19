import { Routes } from '@angular/router';
import { AppLayoutComponent } from './layout/app.layout.component';
import { LoginComponent } from './auth/login/login.component';
import { HomeComponent } from './features/home/home.component';
import { SubscriptionAndPaymentComponent } from './auth/subscription/subscription.component';
import { ErrorPagesComponent } from './auth/pages/unautorized/pages.component';
import { NotFoundPageComponent } from './auth/pages/not-found-page/not-found-page.component';
import { EnhancedConversationDashboardComponent } from './features/dashboard/enhanced-conversation-dashboard/enhanced-conversation-dashboard.component';
import { TicketingViewComponent } from './features/tickets/ticketing-view/ticketing-view.component';

export const routes: Routes = [
  { path: 'apps', component: AppLayoutComponent,
    children: [
        // TODO: Add route '' for dashboard component

        /** Dashboard */
        { path: '', loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent) },
        { path: 'analytics', component: EnhancedConversationDashboardComponent, data: { breadcrumb: 'Analytics' } },
        { path: 'ticketing', loadComponent: () => import('./features/tickets/ticketing-view/ticketing-view.component').then(m => m.TicketingViewComponent) },
        { path: 'productivity', loadComponent: () => import('./features/dashboard/productivity/productivity.component').then(m => m.ProductivityComponent) },

        /** Contacts and groups */
        { path: 'user',  loadComponent: () => import('./features/contacts/contact/contact.component').then(m => m.ContactComponent) },
        { path: 'group',  loadComponent: () => import('./features/contacts/groups/groups.component').then(m => m.GroupsComponent) },
        //{ path: 'contacts/:id', loadComponent: () => import('./features/contact/customer-detail/customer-detail.component').then(m => m.CustomerDetailComponent) },

        /** Campaign */
        { path: 'compose', loadComponent: () => import('./features/schedule/compose-message/compose-message.component').then(m => m.ComposeMessageComponent) },
        { path: 'schedules', loadComponent: () => import('./features/schedule/crud-schedules/crud-schedules.component').then(m => m.CrudSchedulesComponent) },
        { path: 'history', loadComponent: () => import('./features/schedule/message-history/message-history.component').then(m => m.MessageHistoryComponent) },

        /** Conversation */
        { path: 'chat',  loadComponent: () => import('./features/chat/chat-window/chat-window.component').then(m => m.ChatWindowComponent) },
        { path: 'chat/fmanager', loadComponent: () => import('./features/chat/file_explorer/explorer.component').then(m => m.ChatFileExplorerComponent) },
        { path: 'chat-active',  loadComponent: () => import('./features/chat/list-active-conversations/list-active-conversations.component').then(m => m.ListActiveConversationsComponent) },
        { path: 'chat-usage-cost',  loadComponent: () => import('./features/chat/cost-analysis/cost-analysis.component').then(m => m.CostAnalysisComponentChat) },

        /** Tickets */
        //{ path: 'ticketssrc/app/app.routes.ts',  loadComponent: () => import('./features/tickets/lists/lists.component').then(m => m.ListsComponent) },
        //{ path: 'tickets/view',  loadComponent: () => import('./features/tickets/details/details.component').then(m => m.DetailsComponent) },
        //{ path: 'tickets/create',  loadComponent: () => import('./features/tickets/create/create.component').then(m => m.CreateComponent) },

        /** Cloud storage */
        { path: 'fmanager', loadComponent: () => import('./features/filemanager/file-explorer/explorer.component').then(m => m.FileExplorerComponent) },
        { path: 'fmanager-usage-cost', loadComponent: () => import('./features/filemanager/cost-analysis/cost-analysis.component').then(m => m.CostAnalysisComponent) },
        

        /** Settings */
        { path: 'profile', loadComponent: () => import('./auth/user-profile/user-profile.component').then(m => m.UserProfileComponent) },

        { path: 'subscribe', component: SubscriptionAndPaymentComponent },
        { path: 'login', component: LoginComponent },
        { path: 'unauthorized', component: ErrorPagesComponent },
        { path: '**', component: NotFoundPageComponent }, // must be last
    ]
  },
  //{ path: 'email',  loadComponent: () => import('./features/email/mailbox.component').then(m => m.MailboxComponent) },
  { path: '', component: HomeComponent },
  { path: '**', component: NotFoundPageComponent }, // must be last
];
