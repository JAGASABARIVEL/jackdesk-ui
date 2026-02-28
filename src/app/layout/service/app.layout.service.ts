import { Injectable, computed, effect, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { UserManagerService } from '../../shared/services/user-manager.service';
import { ChatManagerService } from '../../shared/services/chat-manager.service';

const SECONDS_IN_A_DAY = 86400;

export interface AppConfig {
    inputStyle: string;
    colorScheme: string;
    theme: string;
    ripple: boolean;
    menuMode: string;
    scale: number;
}

interface LayoutState {
    staticMenuDesktopInactive: boolean;
    overlayMenuActive: boolean;
    profileSidebarVisible: boolean;
    configSidebarVisible: boolean;
    staticMenuMobileActive: boolean;
    menuHoverActive: boolean;
}

interface NotificationTemplate {
    severity: string,
    app: string,
    text: string
}

export interface Notification {
  id: string | number;
  severity: 'error' | 'warn' | 'info' | 'success';
  app: string;
  text: string;
}


export interface ConversationNotificationTemplate {
    conversation_count: number,
    notifications: [
        {
            conversation_id: number,
            contact_id: number,
            contact_name: string,
            last_message: {
                message_body: string,
                received_time: string,
                status: string
            }
        }
    ]
}

@Injectable({
    providedIn: 'root',
})
export class LayoutService {
    _config: AppConfig = {
        ripple: false,
        inputStyle: 'outlined',
        menuMode: 'static',
        colorScheme: 'light',
        theme: 'lara-light-indigo',
        scale: 14,
    };

    config = signal<AppConfig>(this._config);
    newTaskUpdateToken = signal<boolean>(true);
    isLoggedIn = signal<boolean>(false);

    state: LayoutState = {
        staticMenuDesktopInactive: true,
        overlayMenuActive: false,
        profileSidebarVisible: false,
        configSidebarVisible: false,
        staticMenuMobileActive: false,
        menuHoverActive: false,
    };

    private configUpdate = new Subject<AppConfig>();

    private overlayOpen = new Subject<any>();

    configUpdate$ = this.configUpdate.asObservable();

    overlayOpen$ = this.overlayOpen.asObservable();
    totalNewMessageRecords = 0;


    menuItemsCache = signal<any[]>([]);
    unrespondedConversationNotification = signal<ConversationNotificationTemplate>({
        conversation_count: 0,
        notifications: [{
            conversation_id: -1,
            contact_id: -1,
            contact_name: undefined,
            last_message: {
                message_body: undefined,
                received_time: undefined,
                status: undefined
            }
        }]
    });
    newTaskmessages = signal<any[]>([]);
    notifications = signal<NotificationTemplate[]>([]);


    

activehours = signal(0); // example: 1.5 hours



totalActiveTime = computed(() => {
  const percent = (this.activehours() / 24) * 100;
  return [
    {
      label: 'Work',
      value: Math.round(percent),
      color1: 'var(--p-primary-color)',
      color2: 'var(--p-primary-color)',
      icon: 'pi pi-clock',
      duration: this.activehours()
    }
  ];
});

idlehours = signal(0); // example: 1.5 hours

totalIdleTime = computed(() => {
  const percent = (this.idlehours() / 24) * 100;
  return [
    {
      label: 'Idle',
      value: Math.round(percent),
      color1: 'var(--p-primary-color)',
      color2: 'var(--p-primary-color)',
      icon: 'pi pi-clock',
      duration: this.idlehours()
    }
  ];
});

get totalProductivityTime() {
    return [
        ...this.totalActiveTime(),
        ...this.totalIdleTime()
    ];
}


    

    addNotification(notification: Notification) {
    this.notifications.update((current) => {
      // Check if notification with same ID already exists
      const exists = current.some((n:Notification) => n.id === notification.id);
      if (exists) {
        // Update existing notification
        return current.map((n: Notification) => 
          n.id === notification.id ? notification : n
        );
      }
      // Add new notification
      return [...current, notification];
    });
  }

    // NEW: Clear specific notification by ID
  clearNotificationById(id: string | number) {
    this.notifications.update((current) =>
      current.filter((n: Notification) => n.id !== id)
    );
  }

  // NEW: Clear notification by platform_id (more semantic)
  clearPlatformNotification(platformId: number) {
    this.clearNotificationById(platformId);
  }

  // Optional: Clear multiple notifications by IDs
  clearNotificationsByIds(ids: (string | number)[]) {
    this.notifications.update((current) =>
      current.filter((n: Notification) => !ids.includes(n.id))
    );
  }

  // Getter for notifications
  getNotifications() {
    return this.notifications.asReadonly();
  }

    clearNotification(appName: string) {
  this.notifications.update((current) =>
    current.filter((n) => n.app !== appName)
  );
}

    clearNotifications() {
        this.notifications.update((prev)=> [])
    }

    clearMenuItems() {
        this.menuItemsCache.update((prev) => []);
    }

    constructor() {
        effect(() => {
            const config = this.config();
            if (this.updateStyle(config)) {
                this.changeTheme();
            }
            this.changeScale(config.scale);
            this.onConfigUpdate();
        });
    }

    updateStyle(config: AppConfig) {
        return (
            config.theme !== this._config.theme ||
            config.colorScheme !== this._config.colorScheme
        );
    }

    onMenuToggle() {
        if (this.isOverlay()) {
            this.state.overlayMenuActive = !this.state.overlayMenuActive;
            if (this.state.overlayMenuActive) {
                this.overlayOpen.next(null);
            }
        }
        if (this.isDesktop()) {
            this.state.staticMenuDesktopInactive =
                !this.state.staticMenuDesktopInactive;
        } else {
            this.state.staticMenuMobileActive =
                !this.state.staticMenuMobileActive;

            if (this.state.staticMenuMobileActive) {
                this.overlayOpen.next(null);
            }
        }
    }

    showProfileSidebar() {
        this.state.profileSidebarVisible = !this.state.profileSidebarVisible;
        if (this.state.profileSidebarVisible) {
            this.overlayOpen.next(null);
        }
    }

    showConfigSidebar() {
        this.state.configSidebarVisible = true;
    }

    isOverlay() {
        return this.config().menuMode === 'overlay';
    }

    isDesktop() {
        return window.innerWidth > 991;
    }

    isMobile() {
        return !this.isDesktop();
    }

    onConfigUpdate() {
        this._config = { ...this.config() };
        this.configUpdate.next(this.config());
    }

    changeTheme() {
        const config = this.config();
        const themeLink = <HTMLLinkElement>document.getElementById('theme-css');
        const themeLinkHref = themeLink.getAttribute('href')!;
        const newHref = themeLinkHref
            .split('/')
            .map((el) =>
                el == this._config.theme
                    ? (el = config.theme)
                    : el == `theme-${this._config.colorScheme}`
                    ? (el = `theme-${config.colorScheme}`)
                    : el
            )
            .join('/');

        this.replaceThemeLink(newHref);
    }
    replaceThemeLink(href: string) {
        const id = 'theme-css';
        let themeLink = <HTMLLinkElement>document.getElementById(id);
        const cloneLinkElement = <HTMLLinkElement>themeLink.cloneNode(true);

        cloneLinkElement.setAttribute('href', href);
        cloneLinkElement.setAttribute('id', id + '-clone');

        themeLink.parentNode!.insertBefore(
            cloneLinkElement,
            themeLink.nextSibling
        );
        cloneLinkElement.addEventListener('load', () => {
            themeLink.remove();
            cloneLinkElement.setAttribute('id', id);
        });
    }

    changeScale(value: number) {
        document.documentElement.style.fontSize = `${value}px`;
    }
}
