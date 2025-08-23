import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { formatDate } from '@angular/common';

import { LayoutService } from "./service/app.layout.service";
import { SplitButtonModule } from 'primeng/splitbutton';
import { OverlayBadgeModule } from 'primeng/overlaybadge';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { SocketService } from '../shared/services/socketio.service';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { MeterGroup } from 'primeng/metergroup';
import { CardModule } from 'primeng/card';
import { ProductivityService } from '../shared/services/productivity.service';

import { ACTIVE_TIME_POLLING_DURATION, PLATFORM_NOTIFICATION_POLLING_DURATION } from '../../environment'
import { SocialAuthService } from '@abacritt/angularx-social-login';
import { CUstomEventService } from '../shared/services/Events/custom-events.service';
import { PlatformManagerService } from '../shared/services/platform-manager.service';

declare const google: any;

@Component({
    selector: 'app-topbar',
    templateUrl: './app.topbar.component.html',
    styleUrl: './app.topbar.component.scss',
    standalone: true,
    imports: [
        CommonModule,
        SplitButtonModule,
        RouterLink,

        OverlayBadgeModule,
        AvatarModule,
        ButtonModule,
        MeterGroup,
        CardModule
    ]

})
export class AppTopBarComponent implements OnInit, OnDestroy {

    items!: MenuItem[];

    @ViewChild('menubutton') menuButton!: ElementRef;

    @ViewChild('topbarmenubutton') topbarMenuButton!: ElementRef;

    @ViewChild('topbarmenu') menu!: ElementRef;

    IST_OFFSET_MINUTES = 330; // IST = UTC+5:30
    today;
    now;
    // Set start of IST day (00:00 IST)
    istStart;
    // Set end of IST day (23:59:59.999 IST)
    istEnd;
    start;
    end;
    // Resulting UTC ISO strings
    startISOString;
    endISOString;

    constructor(private router: Router, private authService: SocialAuthService, public layoutService: LayoutService, private socketService: SocketService, private localEventService: CUstomEventService, private productivityService: ProductivityService, private platformManagerService: PlatformManagerService) {
        this.items = [
            {
                icon: 'pi pi-user',
                label: 'Profile',
                command: () => {
                    this.profileViewButton();
                }
            },
            {
                icon: 'pi pi-sign-out',
                label: 'Logout',
                command: () => {
                    this.layoutService.isLoggedIn.set(false);
                    this.logoutButton();
                }
            }
        ];


    }

    initDate() {

        const IST_OFFSET_MINUTES = 330; // IST = UTC + 5:30

        this.today = new Date(); // local system date (assumed IST)

        // Construct IST datetime: 2025-06-28 00:00:45 IST
        const istStart = new Date(this.today.getFullYear(), this.today.getMonth(), this.today.getDate(), 0, 0, 45);

        // Construct IST datetime: 2025-06-28 23:00:47 IST
        const istEnd = new Date(this.today.getFullYear(), this.today.getMonth(), this.today.getDate(), 23, 0, 47);

        // Convert IST to UTC
        const utcStart = new Date(istStart.getTime() - IST_OFFSET_MINUTES * 60 * 1000);
        const utcEnd = new Date(istEnd.getTime() - IST_OFFSET_MINUTES * 60 * 1000);

        // Output as ISO strings in UTC (with "Z")
        this.start = istStart.toISOString();  // ✅ "2025-06-27T18:30:45.000Z"
        this.end = istEnd.toISOString();      // ✅ "2025-06-28T17:30:47.000Z"
    }

    ngOnDestroy(): void {
        this.loginNotificationSubscription?.unsubscribe();
        this.messageSubscription?.unsubscribe();
        this.fetchActiveTimeSubscription?.unsubscribe();
        this.fetchPlatformNotificationSubscription?.unsubscribe();
    }

    ngOnInit(): void {

        if (!this.socketService.isSocketConnected) {
            this.layoutService.addNotification(
                { 'severity': 'error', 'app': 'Socket', 'text': 'Socket connection not available for new notification. Please contact Engineering' }
            );
        }
        else {
            this.initDate();
            this.subscribeToLocalEvents();
            this.subscribeToWebSocketChatMessages();
            this.initBackgroundFtech();
        }
    }

    initBackgroundFtech() {
        setInterval(this.fetchActiveTime.bind(this), ACTIVE_TIME_POLLING_DURATION);
        setInterval(this.fetchPlatformNotifications.bind(this), PLATFORM_NOTIFICATION_POLLING_DURATION);
    }

    private fetchActiveTimeSubscription: Subscription | undefined;
    fetchActiveTime() {
        // Call service with default date range
        if (this.layoutService.isLoggedIn()) {
            this.fetchActiveTimeSubscription = this.productivityService.my_summary(this.start, this.end).subscribe(
                {
                    next: (data: any) => this.layoutService.activeSeconds.set(data?.productive_time_seconds),
                    error: (err) => console.error("Topbar => Could not load my activity data")
                }
            )
        }
    }

    private fetchPlatformNotificationSubscription: Subscription | undefined;
    fetchPlatformNotifications() {
        if (this.layoutService.isLoggedIn()) {
            this.layoutService.clearNotification('Platform');
            this.fetchPlatformNotificationSubscription = this.platformManagerService.list_notification().subscribe({
                next: (data: any[]) => {
                    data.forEach((item) => {
                        const platformLabel = item.platform_name || 'Gmail Platform';

                        if (item.active === false) {
                            this.layoutService.addNotification({
                                severity: 'error',
                                app: 'Platform',
                                text: `${platformLabel} (${item.email}): Account access has been revoked. Please provide access to sync the Gmail INBOX.`
                            });
                        }
                        if (item.watch_expired) {
                            this.layoutService.addNotification({
                                severity: 'error',
                                app: 'Platform',
                                text: `${platformLabel} (${item.email}): Watcher subscription has expired. Please refresh to sync the Gmail INBOX.`
                            });
                        } else if (item.watch_expiry_warning) {
                            this.layoutService.addNotification({
                                severity: 'warn',
                                app: 'Platform',
                                text: `${platformLabel} (${item.email}): Watcher subscription is about to expire in a day. Please refresh.`
                            });
                        }
                        //if (item.token_expired) {
                        //    this.layoutService.addNotification({
                        //        severity: 'info',
                        //        app: 'Topbar',
                        //        text: `${platformLabel} (${item.email}): Token expired. Attempting automatic refresh.`
                        //    });
                        //}
                    });
                },
                error: (err) =>
                    console.error("Topbar => Could not load Gmail expiry notifications", err)
            });
        }
    }




    playNotificationSound() {
        const audio = new Audio("../../assets/media/new_conversation_notofication.mp3");
        audio.play();

    }

    profile = { user: { is_productivity_enable: false } };
    private loginNotificationSubscription: Subscription | undefined;
    subscribeToLocalEvents() {
        this.loginNotificationSubscription = this.localEventService.loginSuccessNotification$.subscribe(
            {
                next: (data) => { this.profile = data; this.fetchActiveTime(); this.fetchPlatformNotifications(); },
                error: (err) => console.error("Error fetching active time upon receiving login succeess notification")
            }
        )
    }

    private messageSubscription: Subscription | undefined;
    subscribeToWebSocketChatMessages(): void {
        this.messageSubscription = this.socketService.getMessages().subscribe((message) => {
            if (message.msg_from_type === "CUSTOMER" && this.layoutService.newTaskUpdateToken()) {
                this.layoutService.newTaskUpdateToken.set(false);
                if (message.is_conversation_new) {
                    this.layoutService.newTaskmessages.update((prev) => [...prev, { 'customerName': message.customer_name, 'text': message.message_body }])
                    this.playNotificationSound();
                }
                this.layoutService.newTaskUpdateToken.set(true);
            }
        });
    }

    showMessages = false;
    toggleMessages() {
        this.showMessages = !this.showMessages;
        //if (!this.showMessages) {
        //  this.messages.update(()=>[]);
        //}
    }

    showNotificationMessages = false;
    toggleNotificationMessages() {
        this.showNotificationMessages = !this.showNotificationMessages;
    }

    showUnrespondedConversationMessages = false;
    toggleUnrespondedConversationMessages() {
        this.showUnrespondedConversationMessages = !this.showUnrespondedConversationMessages;
    }

    profileViewButton() {
        this.router.navigate(['/apps/profile']);
        return;
    }

    logoutButton() {
        let googleLoginDetails = JSON.parse(localStorage.getItem("googleLoginDetails"))
        const user = googleLoginDetails.user;
        google.accounts.id.revoke(user.email, () => {
            localStorage.clear();
            this.layoutService.menuItemsCache.update((prev) => []);
            this.router.navigate(['/apps/login']);
        });
    }
}
