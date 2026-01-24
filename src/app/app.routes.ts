import { Routes } from '@angular/router';
import { AppLayoutComponent } from './layout/app.layout.component';
import { LoginComponent } from './auth/login/login.component';
import { HomeComponent } from './features/home/home.component';
import { SubscriptionAndPaymentComponent } from './auth/subscription/subscription.component';
import { ErrorPagesComponent } from './auth/pages/unautorized/pages.component';
import { NotFoundPageComponent } from './auth/pages/not-found-page/not-found-page.component';
import { EnhancedConversationDashboardComponent } from './features/dashboard/enhanced-conversation-dashboard/enhanced-conversation-dashboard.component';
import { authGuard } from './shared/guard/auth.guard';

export const routes: Routes = [
  // Public routes (NO authGuard)
  { path: '', loadComponent: () => import('./features/home/home.component').then(m => m.HomeComponent) },
  { path: 'subscribe', loadComponent: () => import('./auth/subscription/subscription.component').then(m => m.SubscriptionAndPaymentComponent) },
  { path: 'unauthorized', loadComponent: () => import('./auth/pages/unautorized/pages.component').then(m => m.ErrorPagesComponent) },
  // Protected routes (WITH authGuard)
  { 
    path: 'apps', 
    component: AppLayoutComponent,
    children: [
      { path: 'login', loadComponent: () => import('./auth/login/login.component').then(m => m.LoginComponent)},
      /** Dashboard */
      { path: '', loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent), canActivate: [authGuard] },
      { path: 'analytics', component: EnhancedConversationDashboardComponent, data: { breadcrumb: 'Analytics' }, canActivate: [authGuard] },
      { path: 'ticketing', loadComponent: () => import('./features/tickets/ticketing-view/ticketing-view.component').then(m => m.TicketingViewComponent), canActivate: [authGuard] },
      { path: 'productivity', loadComponent: () => import('./features/dashboard/productivity/productivity.component').then(m => m.ProductivityComponent), canActivate: [authGuard] },

      /** CA Firm */
      {
        path: 'ca-firm',
        children: [
          {path: 'dashboard', loadComponent: () => import('./features/ca-firm/ca-firm-dashboard/ca-firm-dashboard.component').then(m=>m.CAFirmDashboardComponent), canActivate: [authGuard]},
          {path: 'employees', loadComponent: () => import('./features/ca-firm/employee-management/employee-management.component').then(m=>m.EmployeeManagementComponent), canActivate: [authGuard]},
          {path: 'departments', loadComponent: () => import('./features/ca-firm/department-management/department-management.component').then(m=>m.DepartmentManagementComponent), canActivate: [authGuard]},
          {path: 'products', loadComponent: () => import('./features/ca-firm/products-management/products-management.component').then(m=>m.ProductsManagementComponent), canActivate: [authGuard]},
          {path: 'office-purchases', loadComponent: () => import('./features/ca-firm/office-purchases/office-purchases.component').then(m => m.OfficePurchasesComponent), canActivate: [authGuard]},
          {path: 'customers', loadComponent: () => import('./features/ca-firm/customers/customers.component').then(m=>m.CustomersComponent), canActivate: [authGuard]},
          {path: 'customer-purchases', loadComponent: () => import('./features/ca-firm/customer-purchases/customer-purchases.component').then(m=>m.CustomerPurchasesComponent), canActivate: [authGuard]},
          {path: 'salaries', loadComponent: () => import('./features/ca-firm/salary-management/salary-management.component').then(m=>m.SalaryManagementComponent), canActivate: [authGuard]}
        ]
      },

      /** Contacts and groups */
      { path: 'user',  loadComponent: () => import('./features/contacts/contact/contact.component').then(m => m.ContactComponent), canActivate: [authGuard] },
      { path: 'group',  loadComponent: () => import('./features/contacts/groups/groups.component').then(m => m.GroupsComponent), canActivate: [authGuard] },

      /** Campaign */
      { path: 'compose', loadComponent: () => import('./features/schedule/compose-message/compose-message.component').then(m => m.ComposeMessageComponent), canActivate: [authGuard] },
      { path: 'schedules', loadComponent: () => import('./features/schedule/crud-schedules/crud-schedules.component').then(m => m.CrudSchedulesComponent), canActivate: [authGuard] },
      { path: 'history', loadComponent: () => import('./features/schedule/message-history/message-history.component').then(m => m.MessageHistoryComponent), canActivate: [authGuard] },

      /** Conversation */
      { path: 'chat',  loadComponent: () => import('./features/chat/chat-window/chat-window.component').then(m => m.ChatWindowComponent), canActivate: [authGuard] },
      { path: 'chat/fmanager', loadComponent: () => import('./features/chat/file_explorer/explorer.component').then(m => m.ChatFileExplorerComponent), canActivate: [authGuard] },
      { path: 'chat-active',  loadComponent: () => import('./features/chat/list-active-conversations/list-active-conversations.component').then(m => m.ListActiveConversationsComponent), canActivate: [authGuard] },
      { path: 'chat-usage-cost',  loadComponent: () => import('./features/chat/cost-analysis/cost-analysis.component').then(m => m.CostAnalysisComponentChat), canActivate: [authGuard] },

      /** Cloud storage */
      { path: 'fmanager', loadComponent: () => import('./features/filemanager/file-explorer/explorer.component').then(m => m.FileExplorerComponent), canActivate: [authGuard] },
      { path: 'fmanager-usage-cost', loadComponent: () => import('./features/filemanager/cost-analysis/cost-analysis.component').then(m => m.CostAnalysisComponent), canActivate: [authGuard] },

      /** Settings */
      { path: 'profile', loadComponent: () => import('./auth/user-profile/user-profile.component').then(m => m.UserProfileComponent), canActivate: [authGuard] },
      { path: 'settings', loadComponent: () => import('./auth/user-profile/admin-settings/admin-settings.component').then(m => m.AdminSettingsComponent), canActivate: [authGuard] }
    ]
  },
  
  // Fallback - must be last
  { path: '**', component: NotFoundPageComponent }
];