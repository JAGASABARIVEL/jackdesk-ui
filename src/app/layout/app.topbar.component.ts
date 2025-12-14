import { Component, ElementRef, OnDestroy, OnInit, ViewChild, HostListener } from '@angular/core';
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
    @ViewChild('newTasksDropdown') newTasksDropdown!: ElementRef;
    @ViewChild('unrespondedDropdown') unrespondedDropdown!: ElementRef;
    @ViewChild('systemNotificationDropdown') systemNotificationDropdown!: ElementRef;

    IST_OFFSET_MINUTES = 330;
    today;
    now;
    istStart;
    istEnd;
    start;
    end;
    startISOString;
    endISOString;

    // Notification dropdown states
    showNewTasks = false;
    showUnrespondedMessages = false;
    showSystemNotifications = false;

    constructor(
        private router: Router, 
        private authService: SocialAuthService, 
        public layoutService: LayoutService, 
        private socketService: SocketService, 
        private localEventService: CUstomEventService, 
        private productivityService: ProductivityService, 
        private platformManagerService: PlatformManagerService
    ) {
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

    @HostListener('document:click', ['$event'])
    onDocumentClick(event: MouseEvent) {
        // Close new tasks dropdown if clicking outside
        if (this.showNewTasks && this.newTasksDropdown && 
            !this.newTasksDropdown.nativeElement.contains(event.target)) {
            this.showNewTasks = false;
        }

        // Close unresponded messages dropdown if clicking outside
        if (this.showUnrespondedMessages && this.unrespondedDropdown && 
            !this.unrespondedDropdown.nativeElement.contains(event.target)) {
            this.showUnrespondedMessages = false;
        }

        // Close system notifications dropdown if clicking outside
        if (this.showSystemNotifications && this.systemNotificationDropdown && 
            !this.systemNotificationDropdown.nativeElement.contains(event.target)) {
            this.showSystemNotifications = false;
        }
    }

    initDate() {
        const IST_OFFSET_MINUTES = 330;
        this.today = new Date();
        const istStart = new Date(this.today.getFullYear(), this.today.getMonth(), this.today.getDate(), 0, 0, 45);
        const istEnd = new Date(this.today.getFullYear(), this.today.getMonth(), this.today.getDate(), 23, 0, 47);
        const utcStart = new Date(istStart.getTime() - IST_OFFSET_MINUTES * 60 * 1000);
        const utcEnd = new Date(istEnd.getTime() - IST_OFFSET_MINUTES * 60 * 1000);
        this.start = istStart.toISOString();
        this.end = istEnd.toISOString();
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
        if (this.layoutService.isLoggedIn()) {
            this.fetchActiveTimeSubscription = this.productivityService.my_summary(this.start, this.end).subscribe(
                {
                    next: (data: any) => {
                        this.layoutService.activehours.set(data?.work_hours);
                        this.layoutService.idlehours.set(data?.idle_hours);
                    },
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
                next: (data) => { 
                    this.profile = data; 
                    this.fetchActiveTime(); 
                    this.fetchPlatformNotifications(); 
                },
                error: (err) => console.error("Error fetching active time upon receiving login success notification")
            }
        )
    }

    private messageSubscription: Subscription | undefined;
    subscribeToWebSocketChatMessages(): void {
        this.messageSubscription = this.socketService.getMessages().subscribe((message) => {
            if (message.msg_from_type === "CUSTOMER" && this.layoutService.newTaskUpdateToken()) {
                this.layoutService.newTaskUpdateToken.set(false);
                if (message.is_conversation_new) {
                    this.layoutService.newTaskmessages.update((prev) => [...prev, { 
                        'customerName': message.customer_name, 
                        'text': message.message_body, 
                        'total_count': message.total_count,
                        'conversationId': message.conversation_id,
                        'contactId': message.contact_id
                    }])
                    this.playNotificationSound();
                }
                this.layoutService.newTaskUpdateToken.set(true);
            }
        });
    }

    toggleNewTasks(event: Event) {
        event.stopPropagation();
        this.showNewTasks = !this.showNewTasks;
        this.showUnrespondedMessages = false;
        this.showSystemNotifications = false;
    }

    toggleUnrespondedMessages(event: Event) {
        event.stopPropagation();
        this.showUnrespondedMessages = !this.showUnrespondedMessages;
        this.showNewTasks = false;
        this.showSystemNotifications = false;
    }

    toggleSystemNotifications(event: Event) {
        event.stopPropagation();
        this.showSystemNotifications = !this.showSystemNotifications;
        this.showNewTasks = false;
        this.showUnrespondedMessages = false;
    }

    navigateToConversation(conversationId: number, contactId: number) {
        // Navigate to the conversation chat
        this.router.navigate(['/apps/chat'], { 
            queryParams: { 
                conversationId: conversationId,
                contactId: contactId 
            } 
        });
        this.showNewTasks = false;
        this.showUnrespondedMessages = false;
    }

    getSeverityIcon(severity: string): string {
        switch(severity) {
            case 'error': return 'pi pi-times-circle';
            case 'warn': return 'pi pi-exclamation-triangle';
            case 'info': return 'pi pi-info-circle';
            default: return 'pi pi-bell';
        }
    }

    getSeverityColor(severity: string): string {
        switch(severity) {
            case 'error': return 'text-red-500';
            case 'warn': return 'text-yellow-500';
            case 'info': return 'text-blue-500';
            default: return 'text-gray-500';
        }
    }

    getTimeAgo(dateString: string): string {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
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