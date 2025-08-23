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


    

activeSeconds = signal(0); // example: 1.5 hours


totalActiveTime = computed(() => {
  const seconds = this.activeSeconds();
  const percent = (seconds / SECONDS_IN_A_DAY) * 100;

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  const durationLabel = `${hours}h ${minutes}m`;

  return [
    {
      label: 'Active Time',
      value: Math.round(percent),
      color1: 'var(--p-primary-color)',
      color2: 'var(--p-primary-color)',
      icon: 'pi pi-clock',
      duration: durationLabel
    }
  ];
});


    

    addNotification(notification) {
        this.notifications.update((prev) => [...prev, notification]);
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
