// ============================================
// FILE 1: app-initialization.service.ts
// ============================================
import { Injectable, signal } from '@angular/core';
import { LayoutService } from '../../layout/service/app.layout.service';
import { SocketService } from './socketio.service';
import { UserManagerService } from './user-manager.service';
import { Router } from '@angular/router';
import { PushNotificationService } from './push-notification.service';

@Injectable({
  providedIn: 'root'
})
export class AppInitializationService {
  private isInitialized = signal(false);
  private initializationPromise: Promise<void> | null = null;

  constructor(
    private layoutService: LayoutService,
    private socketService: SocketService,
    private userManagerService: UserManagerService,
    private router: Router,
    private pushNotificationService: PushNotificationService
  ) {}

  async initializeApp(profile: any): Promise<void> {
    // If already initialized, return immediately
    if (this.isInitialized()) {
      return Promise.resolve();
    }

    // If initialization is in progress, wait for it
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    // Start initialization
    this.initializationPromise = this._doInitialization(profile);
    return this.initializationPromise;
  }

  private async _doInitialization(profile: any): Promise<void> {
    try {
      // Validate token first
      await this.userManagerService.ping_user_token().toPromise();

      // Initialize socket
      await this.socketService.initSocket(profile);

      // Initialize menu
      this.initLayoutMenu(profile);

      // Set login state
      this.layoutService.isLoggedIn.set(true);

      this.isInitialized.set(true);

      // Register for desktop push notifications
      this.pushNotificationService.requestPermissionAndRegister();
    } catch (err: any) {
      console.error('Initialization failed:', err);
      
      if (err.status === 401) {
        localStorage.clear();
        this.router.navigate(['/apps/login']);
        throw err;
      }

      // Socket failed but token is valid - allow access but notify
      if (err.message?.includes('Socket')) {
        this.layoutService.addNotification({
          'id': -1,
          severity: 'warn',
          app: 'System',
          text: 'Real-time features(socket) unavailable. Continuing with limited functionality.'
        });
        this.initLayoutMenu(profile);
        this.layoutService.isLoggedIn.set(true);
        this.isInitialized.set(true);
      }
    }
  }

  private initLayoutMenu(profile: any): void {
    this.layoutService.menuItemsCache.update(() => []);
    
    if (profile.user.role === 'individual') {
      // Add individual menu items
      return;
    }

    let enterpriseMenuItems = []

    if (this.isTicketing(profile) || (this.isNonTicketing(profile) && this.isOwner(profile))) {
      // Enterprise menu items
      enterpriseMenuItems = [
        this.getDashboardLinkItems(profile),
        this.getContactLink(profile),
        this.getCampaignLinkItems(profile),
        {
          label: 'Tickets',
          icon: 'pi pi-comment',
          items: [
            {
              label: 'Chat',
              icon: 'pi pi-comment',
              routerLink: ['/apps/chat'],
            },
            {
              label: 'Active',
              icon: 'pi pi-comments',
              routerLink: ['/apps/chat-active'],
            },
            {
              label: 'Journal',
              icon: 'pi pi-ticket',
              routerLink: ['/apps/ticketing'],
            }
          ]
        }
      ];
    }
    else {
      enterpriseMenuItems = [this.getContactLink(profile),
      {
        label: 'Chat',
          icon: 'pi pi-comment',
          routerLink: ['/apps/chat'],
        }
      ];
    }
    this.layoutService.menuItemsCache.update(() => [{ items: enterpriseMenuItems }]);
  }

  private getDashboardLinkItems(profile: any) {
    if (this.isOwner(profile)) {
      return {
        label: 'My Firm',
        icon: 'pi pi-home',
        items: [
          {
            label: 'Dasboard',
            icon: 'pi pi-briefcase',
            items: [
              { label: 'Finance', icon: 'pi pi-chart-bar', routerLink: ['/apps/ca-firm/dashboard'] },
              { label: 'Tickets', icon: 'pi pi-comments', routerLink: ['/apps'] },
              { label: 'Productivity', icon: 'pi pi-stopwatch', routerLink: ['/apps/productivity'] }
            ]
          },
          {
            label: 'Manage',
            icon: 'pi pi-list',
            items: [
              { label: 'Employees', icon: 'pi pi-users', routerLink: ['/apps/ca-firm/employees'] },
              { label: 'Departments', icon: 'pi pi-sitemap', routerLink: ['/apps/ca-firm/departments'] },
              { label: 'Salary', icon: 'pi pi-wallet', routerLink: ['/apps/ca-firm/salaries'] },
              { label: 'Products & Services', icon: 'pi pi-box', routerLink: ['/apps/ca-firm/products'] },
              { label: 'Expense', icon: 'pi pi-shopping-cart', routerLink: ['/apps/ca-firm/office-purchases'] },
              { label: 'Sales', icon: 'pi pi-dollar', routerLink: ['/apps/ca-firm/customer-purchases'] },
              //{
              //  label: 'Template Studio',
              //  icon: 'pi pi-dollar',
              //  routerLink: ['/apps/template-manager']
              //}
            ]
          }
        ]
      };
    }
    return {
      label: 'My Firm',
      icon: 'pi pi-home',
      items: [
        {
            label: 'Dasboard',
            icon: 'pi pi-briefcase',
            items: [
              { label: 'Tickets', icon: 'pi pi-comments', routerLink: ['/apps'] },
              { label: 'Productivity', icon: 'pi pi-stopwatch', routerLink: ['/apps/productivity'] }
            ]
        },
        {
          label: 'Manage',
          icon: 'pi pi-list',
          items: [
            { label: 'Expense', icon: 'pi pi-shopping-cart', routerLink: ['/apps/ca-firm/office-purchases'] },
            { label: 'Sales', icon: 'pi pi-dollar', routerLink: ['/apps/ca-firm/customer-purchases'] }
          ]
        }
      ]
    };
  }

  private getCampaignLinkItems(profile: any) {
    const items = [
      { label: 'Journal', icon: 'pi pi-history', routerLink: ['/apps/history'] },
      { label: 'Jobs', icon: 'pi pi-calendar-clock', routerLink: ['/apps/schedules'] }
    ];

    if (this.isOwner(profile)) {
      items.push({ label: 'Compose', icon: 'pi pi-pencil', routerLink: ['/apps/compose'] });
    }

    return {
      label: 'Campaign',
      icon: 'pi pi-megaphone',
      items
    };
  }

  private getContactLink(profile: any) {
    return {
      label: 'Customers',
      icon: 'pi pi-users',
      items: [
        { label: 'Customer Map', icon: 'pi pi-address-book', routerLink: ['/apps/ca-firm/customers'] },
        { label: 'Contacts', icon: 'pi pi-user', routerLink: ['/apps/user'] },
        { label: 'Groups', icon: 'pi pi-users', routerLink: ['/apps/group'] }
      ]
    };
  }

  reset(): void {
    this.isInitialized.set(false);
    this.initializationPromise = null;
  }

  isNonTicketing(profile): boolean {
  return profile?.user?.organization?.conversation_mode === 'non_ticketing';
}

isTicketing(profile): boolean {
  return profile?.user?.organization?.conversation_mode === 'ticketing';
}

isOwner(profile): boolean {
  return profile?.user.role === "owner"
}

}
