import { CommonModule } from '@angular/common';
import { 
  Component, 
  OnDestroy, 
  OnInit, 
  signal, 
  computed,
  inject,
  ViewChild,
  ElementRef
} from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, forkJoin, of, switchMap, tap } from 'rxjs';
import { catchError, map, takeUntil } from 'rxjs/operators';

// PrimeNG
import { DividerModule } from 'primeng/divider';
import { AvatarModule } from 'primeng/avatar';
import { InputTextModule } from 'primeng/inputtext';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { InputGroupModule } from 'primeng/inputgroup';
import { BadgeModule } from 'primeng/badge';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ButtonModule } from 'primeng/button';

// Services
import { CachedChatDataService } from '../../../shared/services/chat-cache.service';
import { LayoutService } from '../../../layout/service/app.layout.service';
import { SocketService } from '../../../shared/services/socketio.service';
import { ChatManagerService } from '../../../shared/services/chat-manager.service';

// Components
import { DetailChatWindowComponent } from './detail-chat-window/detail-chat-window.component';
import { PerformJsonOpPipe } from '../../../shared/pipes/perform-json-op.pipe';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { Tooltip } from "primeng/tooltip";

// Types
interface Conversation {
  id: number;
  contact: {
    id: number;
    name: string;
    phone: string;
    platform_name: string;
    image?: string;
  };
  messages: any[];
  status: string;
  assigned: { id: number };
  subject?: string;
  created_at: string;
  updated_at: string;
}

@Component({
  selector: 'app-chat-window',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DividerModule,
    AvatarModule,
    InputTextModule,
    InputGroupAddonModule,
    InputGroupModule,
    BadgeModule,
    ProgressSpinnerModule,
    ButtonModule,
    DetailChatWindowComponent,
    PerformJsonOpPipe,
    ToastModule,
    Tooltip
],
  templateUrl: './chat-window.component.html',
  styleUrl: './chat-window.component.scss',
  providers: [MessageService]
})
export class ChatWindowComponent implements OnInit, OnDestroy {
  @ViewChild('conversationList') conversationListRef!: ElementRef;

  private readonly destroy$ = new Subject<void>();
  private readonly PLATFORM = 'chat';
  private readonly PAGE_SIZE = 10;

  // Signals
  profile = signal<any>(null);
  conversations = signal<Conversation[]>([]);
  selectedConversation = signal<Conversation | null>(null);
  employees = signal<any[]>([]);
  
  // Pagination state
  currentPage = signal<number>(1);
  totalRecords = signal<number>(0);
  hasMorePages = signal<boolean>(true);
  isLoading = signal<boolean>(false);
  isLoadingMore = signal<boolean>(false);
  
  // Search state
  searchQuery = signal<string>('');
  isSearching = signal<boolean>(false);
  searchResultsPage = signal<number>(1);
  searchHasMore = signal<boolean>(true);
  private searchSubject$ = new Subject<string>();

  // ── Call state (lives here so it persists across conversation switches) ──
activeCallId              = signal<string | null>(null);
activeCallFrom            = signal<string>('');
activeCallPhoneNumberId   = signal<string>('');
activeCallPlatformId      = signal<string>('');
activeCallStatus          = signal<'ringing' | 'connecting' | 'active' | 'ended' | null>(null);
activeCallConversationId  = signal<number | null>(null);
waCallVisible             = signal<boolean>(false);
callDurationSeconds       = signal<number>(0);
isMuted                   = signal<boolean>(false);
agentPresence = signal<Map<number, 'online' | 'away' | 'offline'>>(new Map());
myPresenceStatus = signal<'available' | 'away'>('available');
activeCallIsTransfer = signal<boolean>(false);
activeCallIsOutbound = signal<boolean>(false);


private pendingMetaSdpOffer: string = '';
private peerConnection    : RTCPeerConnection | null = null;
private localStream       : MediaStream | null = null;
private remoteAudio       : HTMLAudioElement | null = null;
private callTimer         : any = null;
private pendingSdpOffer   : string = '';
 
private readonly ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  // Add TURN server for production
];

  // Computed
  displayedConversations = computed(() => {
    return this.sortByLastMessage(this.conversations());
  });

  // Helper for template - get username initial safely
  getUsernameInitial(): string {
    const profile = this.profile();
    return profile?.user?.username?.charAt(0)?.toUpperCase() || '?';
  }

  constructor(
    private router: Router,
    private layoutService: LayoutService,
    private socketService: SocketService,
    private cachedDataService: CachedChatDataService,
    private conversationService: ChatManagerService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.initializeComponent();
    this.setupSearchHandler();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this._cleanupCall();
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  private initializeComponent(): void {
    const storedProfile = localStorage.getItem('profile');
    
    if (!storedProfile) {
      this.router.navigate(['/apps/login']);
      return;
    }

    this.profile.set(JSON.parse(storedProfile));
    this.layoutService.state.staticMenuDesktopInactive = true;
    
    // For topbar
    this.loadConversationsForNotification();
    this.invalidateCacheAndRefreshNotifications();

    this.loadUsers();
    this.loadInitialConversations();
    this.initializeWebSocket();
    if (this.profile()?.user?.organization?.is_whatsapp_calling_enabled) {
      this.checkForOrphanedCall();
    }
    
  }

  private loadUsers(): void {
    this.cachedDataService.getUsers()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (users) => this.employees.set(users),
        error: (err) => console.error('Failed to load users:', err)
      });
  }

  loadConversationsForNotification() {
  this.conversationService.list_new_conversations("non-chat", 1, 13)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (result) => {
        // Normalize response
        let data: any[];
        // Always expect DRF pagination
        if (!result || !Array.isArray(result.results)) {
          console.error("Unexpected response format:", data);
          this.layoutService.totalNewMessageRecords = 0;
          return;
        }
        data = result.results;
        
        // Always assign an array
        this.layoutService.totalNewMessageRecords = result.count ?? data.length; // DRF count or fallback

        // Update messages for layout
        const newParsedMessages = data.map((unparsed) => ({
          customerName: unparsed?.contact?.name || unparsed?.contact?.phone,
          text: unparsed?.messages?.[0]?.message_body,
          total_count: result.count // TODO: Including the count in every payload until we add pagination to notification topbar
        }));
        this.layoutService.newTaskmessages.update(() => newParsedMessages);
        this.layoutService.newTaskUpdateToken.set(true);
      },
      error: (err) => {
        this.layoutService.newTaskUpdateToken.set(true);
        console.error("List conversation | Error getting conversations", err);
      }
    });
}

  private loadInitialConversations(): void {
    this.isLoading.set(true);

    if (this.isNonTicketing) {
      this.cachedDataService.getActiveConversationsForOrgPaginated(this.PLATFORM, 1, this.PAGE_SIZE)
      .pipe(
        takeUntil(this.destroy$),
        catchError(err => {
          console.error('Failed to load conversations:', err);
          this.showError('Failed to load conversations');
          return of({ results: [], count: 0 });
        })
      )
      .subscribe({
        next: (response: any) => {
          // Handle both paginated and non-paginated responses
          const results = response.results || response;
          const count = response.count || results.length;
          
          this.conversations.set(Array.isArray(results) ? results : []);
          this.totalRecords.set(count);
          this.currentPage.set(1);
          this.hasMorePages.set(this.conversations().length < count);
          this.isLoading.set(false);
          
        },
        error: (err) => {
          console.error('Load error:', err);
          this.isLoading.set(false);
        }
      });
    }
    else {

      this.cachedDataService
      .getActiveConversationsForUserPaginated(this.PLATFORM, 1, this.PAGE_SIZE)
      .pipe(
        takeUntil(this.destroy$),
        catchError(err => {
          console.error('Failed to load conversations:', err);
          this.showError('Failed to load conversations');
          return of({ results: [], count: 0 });
        })
      )
      .subscribe({
        next: (response: any) => {
          // Handle both paginated and non-paginated responses
          const results = response.results || response;
          const count = response.count || results.length;
          
          this.conversations.set(Array.isArray(results) ? results : []);
          this.totalRecords.set(count);
          this.currentPage.set(1);
          this.hasMorePages.set(this.conversations().length < count);
          this.isLoading.set(false);
          
        },
        error: (err) => {
          console.error('Load error:', err);
          this.isLoading.set(false);
        }
      });

    }
    
    
  }

  // ============================================================================
  // INFINITE SCROLL / LOAD MORE
  // ============================================================================

  onScrollConversationList(event: Event): void {
    const element = event.target as HTMLElement;
    const threshold = 100; // pixels from bottom
    
    const scrollPosition = element.scrollTop + element.clientHeight;
    const scrollHeight = element.scrollHeight;
    
    if (scrollHeight - scrollPosition < threshold && !this.isLoadingMore()) {
      this.loadMoreConversations();
    }
  }

  loadMoreConversations(): void {
    // Don't load more if searching or no more pages
    if (this.isSearching() || !this.hasMorePages() || this.isLoadingMore()) {
      return;
    }

    this.isLoadingMore.set(true);
    const nextPage = this.currentPage() + 1;

    this.cachedDataService
      .getActiveConversationsForUserPaginated(this.PLATFORM, nextPage, this.PAGE_SIZE)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          // Append new conversations
          this.conversations.update(convs => [...convs, ...response.results]);
          this.currentPage.set(nextPage);
          this.hasMorePages.set(this.conversations().length < response.count);
          this.isLoadingMore.set(false);
          
        },
        error: (err) => {
          console.error('Failed to load more conversations:', err);
          this.isLoadingMore.set(false);
        }
      });
  }

  // ============================================================================
  // SEARCH FUNCTIONALITY
  // ============================================================================

  private setupSearchHandler(): void {
    this.searchSubject$
      .pipe(
        debounceTime(400),
        distinctUntilChanged(),
        tap(query => {
          this.isSearching.set(query.trim().length > 0);
          this.searchResultsPage.set(1);
        }),
        switchMap(query => {
          if (!query.trim()) {
            // Clear search - reload owned conversations
            return this.cachedDataService.getActiveConversationsForUserPaginated(
              this.PLATFORM, 
              1, 
              this.PAGE_SIZE
            ).pipe(
              map(response => ({ conversations: response, contacts: null }))
            );
          }

          // Perform parallel search: conversations + contacts
          return forkJoin({
            conversations: this.cachedDataService.searchConversations(
              this.PLATFORM,
              query.trim(),
              1,
              this.PAGE_SIZE
            ).pipe(
              catchError(err => {
                console.error('Conversation search failed:', err);
                return of({ results: [], count: 0 });
              })
            ),
            contacts: this.cachedDataService.searchContacts(
              query.trim(),
              1,
              50 // Load more contacts for search
            ).pipe(
              catchError(err => {
                console.error('Contact search failed:', err);
                return of({ results: [], count: 0 });
              })
            )
          });
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (result: any) => {
          if (result.contacts) {
            // Search mode - merge conversations and contacts
            this.mergeConversationsAndContacts(result.conversations, result.contacts);
          } else {
            // Normal mode - just conversations
            const response = result.conversations;
            const results = response.results || response;
            const count = response.count || results.length;
            
            this.conversations.set(Array.isArray(results) ? results : []);
            this.totalRecords.set(count);
            this.searchHasMore.set(this.conversations().length < count);
          }
          
        },
        error: (err) => {
          console.error('Search subscription error:', err);
          this.showError('Search failed');
        }
      });
  }

  /**
   * Merge conversations with contacts that don't have active conversations
   * This allows users to search and start conversations with any contact
   */
  private mergeConversationsAndContacts(conversationsResponse: any, contactsResponse: any): void {
    const conversations = conversationsResponse.results || conversationsResponse;
    const contacts = contactsResponse.results || contactsResponse;
    
    // Create a Set of contact IDs that already have conversations
    const conversationContactIds = new Set(
      (Array.isArray(conversations) ? conversations : [])
        .map(conv => conv.contact?.id)
        .filter(id => id !== undefined)
    );
    
    // Filter contacts that don't have active conversations
    const contactsWithoutConversations = (Array.isArray(contacts) ? contacts : [])
      .filter(contact => !conversationContactIds.has(contact.id))
      .map(contact => this.createConversationFromContact(contact));
    
    // Merge: conversations first, then contacts without conversations
    const merged = [
      ...(Array.isArray(conversations) ? conversations : []),
      ...contactsWithoutConversations
    ];
    
    this.conversations.set(merged);
    this.totalRecords.set(
      (conversationsResponse.count || conversations.length) + 
      contactsWithoutConversations.length
    );
    this.searchHasMore.set(false); // Simple mode: don't paginate search results with contacts
  }

  /**
   * Create a conversation-like object from a contact
   * This allows displaying contacts in the conversation list
   */
  private createConversationFromContact(contact: any): Conversation {
    return {
      id: -1, // Negative ID indicates this is a contact, not an active conversation
      contact: {
        id: contact.id,
        name: contact.name || contact.phone,
        phone: contact.phone,
        platform_name: contact.platform_name || this.PLATFORM,
        image: contact.image
      },
      messages: [],
      status: 'new',
      assigned: { id: -1 },
      subject: undefined,
      created_at: contact.created_at || new Date().toISOString(),
      updated_at: contact.updated_at || new Date().toISOString()
    };
  }

  onSearchInput(query: string): void {
    this.searchQuery.set(query);
    this.searchSubject$.next(query);
  }

  loadMoreSearchResults(): void {
    if (!this.isSearching() || !this.searchHasMore() || this.isLoadingMore()) {
      return;
    }

    this.isLoadingMore.set(true);
    const nextPage = this.searchResultsPage() + 1;

    this.cachedDataService
      .searchConversations(
        this.PLATFORM,
        this.searchQuery().trim(),
        nextPage,
        this.PAGE_SIZE
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.conversations.update(convs => [...convs, ...response.results]);
          this.searchResultsPage.set(nextPage);
          this.searchHasMore.set(this.conversations().length < response.count);
          this.isLoadingMore.set(false);
        },
        error: (err) => {
          console.error('Failed to load more search results:', err);
          this.isLoadingMore.set(false);
        }
      });
  }

  // ============================================================================
  // WEBSOCKET HANDLING
  // ============================================================================

  private initializeWebSocket(): void {
    if (!this.socketService.isSocketConnected) {
      console.error('Socket not connected');
      return;
    }

    this.socketService.getMessages()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (message: any) => this.handleWebSocketMessage(message),
        error: (err) => console.error('WebSocket error:', err)
      });

    this.socketService.getCallEvents()
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next : (event: any) => this.handleCallEvent(event),
      error: (err) => console.error('Call event WebSocket error:', err)
    });

    // Also listen for Service Worker messages (FCM notification tap while offline)
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (swEvent) => {
      const msg = swEvent.data;
      if (msg?.type === 'wa_incoming_call') {
        this.activeCallId.set(msg.callId);
        this.activeCallFrom.set(msg.from || '');
        this.activeCallPhoneNumberId.set(msg.phoneId || '');
        this.activeCallPlatformId.set(msg.platform_id);
        this.activeCallStatus.set('ringing');
        this.activeCallConversationId.set(msg.convId ? +msg.convId : null);
        this.waCallVisible.set(true);
 
        // If agent tapped "Answer" directly on the notification, auto-answer
        if (msg.action === 'answer') {
          this.answerCall();
        }
        // Auto-navigate to the relevant conversation if not already selected
        if (msg.convId) {
          const convId = +msg.convId;
          const exists = this.conversations().find(c => c.id === convId);
          if (exists) {
            this.selectedConversation.set(exists);
          } else {
            this.fetchAndAddConversation(convId);
          }
        }
      }
    });
  }
  }

  

  private handleWebSocketMessage(message: any): void {
    //console.log("message ", message);
    const convId = message.conversation_id;
    
    // Check if conversation is in current list
    const convIndex = this.conversations().findIndex(c => c.id === convId);
    if (['INTERNAL', 'CUSTOMER'].includes(message.msg_from_type)) {
      if (convIndex !== -1) {
        // Update existing conversation
        this.updateConversationWithMessage(convIndex, message);
        
        this.playMessageSound();
      } else if (convIndex === -1) {
        if (this.isNonTicketing ||  (!this.isNonTicketing && this.profile()?.user?.id ===  message?.assigned_user_id)) {
          // Always add/update the conversation in the list
          this.fetchAndAddConversation(convId);
        }
      }

      // ── NEW: if I was tagged in this note + note has call context ──────
    if (
      message.msg_from_type    === 'INTERNAL' &&
      message.tagged_user_id   === this.profile()?.user?.id &&
      message.customer_phone
    ) {
      // Enable MY call button for this customer
      this.callPermissionGrantedFor.set(message.customer_phone);

      // Auto-open the conversation
      if (convIndex !== -1) {
        this.selectedConversation.set(this.conversations()[convIndex]);
      } else {
        this.fetchAndAddConversation(convId);
      }

      // Toast so agent notices
      this.messageService.add({
        severity : 'info',
        summary  : `📞 ${message.sender_name} asked you to call`,
        detail   : `${message.customer_name || message.customer_phone} — call button is now enabled`,
        life     : 20000,
      });
    }

    } else if (message.msg_from_type === 'ORG') {
      if (convIndex !== -1) {
        this.refreshConversation(convId);
      }
    }

    //this.invalidateCacheAndRefreshNotifications();
  }

  private updateConversationWithMessage(index: number, message: any): void {
    this.conversations.update(convs => {
      const updated = [...convs];
      updated[index] = {
        ...updated[index],
        messages: [...updated[index].messages, message],
        status: message?.conversation_status ?? updated[index].status,
      };
      return updated;
    });

    // Update selected if matches
    const selected = this.selectedConversation();
    if (selected && selected.id === this.conversations()[index].id) {
      this.selectedConversation.set(this.conversations()[index]);
    }
  }

  private fetchAndAddConversation(conversationId: number): void {
    this.cachedDataService
      .getConversation(this.PLATFORM, conversationId, true)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (conv) => {
          // Add to top of list
          this.conversations.update(convs => [conv, ...convs]);
          this.totalRecords.update(count => count + 1);
          this.playNewConversationSound();
        },
        error: (err) => console.error('Failed to fetch new conversation:', err)
      });
  }

  private refreshConversation(conversationId: number): void {
    this.cachedDataService
      .getConversation(this.PLATFORM, conversationId, true)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (conv) => {
          const index = this.conversations().findIndex(c => c.id === conversationId);
          if (index !== -1) {
            this.updateConversationInState(index, conv);
          }
        },
        error: (err) => console.error('Failed to refresh conversation:', err)
      });
  }

  private updateConversationInState(index: number, conversation: Conversation): void {
    this.conversations.update(convs => {
      const updated = [...convs];
      updated[index] = conversation;
      return updated;
    });

    const selected = this.selectedConversation();
    if (selected && selected.id === conversation.id) {
      this.selectedConversation.set(conversation);
    }
  }

  //private checkForOrphanedCall(): void {
  //this.conversationService.getActiveCall()
  //  .pipe(takeUntil(this.destroy$))
  //  .subscribe({
  //    next: (res: any) => {
  //      const call = res?.active_call;
  //      if (!call) return;
//
  //      // There's an active/connecting call that survived the refresh
  //      this.activeCallId.set(call.call_id);
  //      this.activeCallPhoneNumberId.set(call.phone_number_id);
  //      this.activeCallFrom.set(call.from_number || '');
  //      this.activeCallConversationId.set(call.conversation_id ?? null);
//
  //      if (call.status === 'active') {
  //        // Call is live — WebRTC is gone (page refreshed), only option is to end it
  //        this.activeCallStatus.set('active');
  //        this.activeCallIsOutbound.set(call.direction === 'outbound');
  //        this._showCallRecoveryDialog(call);
  //      } else if (call.status === 'ringing' || call.status === 'connecting') {
  //        // Still ringing — can still be cancelled
  //        this.activeCallStatus.set(call.status as any);
  //        this.activeCallIsOutbound.set(call.direction === 'outbound');
  //        this.waCallVisible.set(true);
//
  //        this.messageService.add({
  //          severity: 'warn',
  //          summary : 'Call in progress',
  //          detail  : `A ${call.direction} call is still active. You can cancel it.`,
  //          life     : 0,   // sticky
  //        });
  //      }
  //    },
  //    error: () => {} // silently ignore
  //  });
//}

private checkForOrphanedCall(): void {
  this.conversationService.getActiveCall()
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (res: any) => {
        const call = res?.active_call;
        if (!call) return;

        this.activeCallId.set(call.call_id);
        // Use platform_id (DB pk) for call actions, phone_number_id for display
        this.activeCallPhoneNumberId.set(
          call.platform_id?.toString()
        );
        this.activeCallPlatformId.set(call.platform_id?.toString());
        this.activeCallFrom.set(call.from_number || '');
        this.activeCallConversationId.set(call.conversation_id ?? null);
        this.activeCallIsOutbound.set(call.direction === 'outbound');

        if (call.status === 'active') {
          this.activeCallStatus.set('active');
          this._showCallRecoveryDialog(call);
        } else if (call.status === 'ringing' || call.status === 'connecting') {
          this.activeCallStatus.set(call.status as any);
          this.waCallVisible.set(true);
          this.messageService.add({
            severity: 'warn',
            summary : '⚠️ Call still in progress',
            detail  : `A ${call.direction} call is still active. You can cancel it.`,
            life    : 0,
          });
        }
      },
      error: () => {}
    });
}

private _showCallRecoveryDialog(call: any): void {
  // WebRTC session is dead — the audio pipe is broken
  // Industry standard: terminate the call and notify the customer
  this.messageService.add({
    severity: 'warn',
    summary : '⚠️ Call interrupted',
    detail  : 'Your browser was refreshed during an active call. The audio connection was lost. The call will be ended.',
    life    : 0,
  });

  // Auto-terminate after 5 seconds — give agent time to read the message
  // but don't leave the customer hanging in silence
  setTimeout(() => {
    this.conversationService.callAction(
      call.call_id,
      call.platform_id,
      'terminate'
    ).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this._cleanupCall();
        this.messageService.add({
          severity: 'info',
          summary : 'Call ended',
          detail  : 'The interrupted call was automatically terminated.',
          life    : 5000,
        });
      },
      error: () => this._cleanupCall()
    });
  }, 5000);
}

  private handleCallEvent(event: any): void {
  const currentCallId = this.activeCallId();

  switch (event.event_type) {

    case 'incoming_call': {
      // If we already have an active outbound call in progress, ignore
      if (currentCallId && this.activeCallIsOutbound()) {
        console.error('Ignoring incoming_call — outbound call in progress');
        break;
      }
      this.activeCallIsOutbound.set(false);
      const myUserId = this.profile()?.user?.id;
      const routedTo = event.routed_to;
      const shouldRing = !routedTo || routedTo === myUserId;

      this.pendingMetaSdpOffer = event.sdp_offer || '';
      this.activeCallId.set(event.call_id);
      this.activeCallFrom.set(event.caller_name || event.from || '');
      this.activeCallPhoneNumberId.set(event.phone_number_id || '');
      this.activeCallPlatformId.set(event.platform_id);
      this.activeCallStatus.set('ringing');
      this.activeCallConversationId.set(event.conversation_id ?? null);
      this.activeCallIsTransfer.set(event.is_transfer ?? false);

      if (shouldRing) {
        this.waCallVisible.set(true);
        this.playMessageSound();
      }
      break;
    }

    case 'outbound_call_initiated': {
      // Only update if this matches our current call or no call is active yet
      if (currentCallId && currentCallId !== event.call_id) break;
      // Don't touch waCallVisible here — already set in onInitiateCall
      if (!currentCallId) {
        // Edge case: Kafka arrived before API response (race)
        this.activeCallId.set(event.call_id);
        this.activeCallIsOutbound.set(true);
        this.activeCallFrom.set(event.to || '');
        this.activeCallStatus.set('ringing');
        this.waCallVisible.set(true);
      }
      break;
    }

    case 'outbound_call_connected': {
      if (event.call_id !== currentCallId) break;
      if (!this.peerConnection) {
        console.error('No peer connection for outbound_call_connected');
        break;
      }
      this.peerConnection.setRemoteDescription({
        type: 'answer',
        sdp : event.sdp_answer,
      }).then(() => {
        //this.waCallVisible.set(false);       // amber overlay gone
        this.activeCallStatus.set('connecting');
      }).catch((e: any) => {
        console.error('setRemoteDescription failed:', e);
        this._cleanupCall();
      });
      break;
    }

    case 'call_status': {
      if (event.call_id !== currentCallId) break;  // ignore stale events
      this.activeCallStatus.set(event.status);
      if (event.status === 'active' && !this.callTimer) {
        this.waCallVisible.set(false);
        this._startCallTimer();
      }
      if (event.status === 'ended' || event.status === 'rejected') {
        this._cleanupCall();
        this.waCallVisible.set(false);
      }
      break;
    }

    case 'call_ended': {
      if (event.call_id !== currentCallId) break;
      this._cleanupCall();
      this.waCallVisible.set(false);
      break;
    }

    case 'permission_reply': {
      if (event.response === 'ACCEPT') {
        this.callPermissionGrantedFor.set(event.from);
      }
      break;
    }

    case 'presence_update': {
      const uid = event.user_id;
      this.agentPresence.update(m => {
        const next = new Map(m);
        next.set(uid, event.status);
        return next;
      });
      break;
    }
  }
}
// Signal passed as @Input to detail-chat-window to enable its outbound call button
callPermissionGrantedFor = signal<string | null>(null);
 
transferCall(targetUserId: number): void {
  if (!this.activeCallId()) return;
  this.conversationService.transferCall(
    this.activeCallId()!,
    this.activeCallPhoneNumberId(),
    targetUserId
  ).pipe(takeUntil(this.destroy$)).subscribe({
    next: () => {
      // Close local WebRTC — target agent takes over
      this._cleanupCall();
      this.messageService.add({
        severity: 'success', summary: 'Transferred',
        detail: 'Call transferred successfully'
      });
    },
    error: err => console.error('Transfer failed', err)
  });
}

// ADD presence toggle
togglePresence(): void {
  const next = this.myPresenceStatus() === 'available' ? 'away' : 'available';
  this.myPresenceStatus.set(next);
  this.socketService.setPresence(next);
}
 
// ── 7. ADD WebRTC methods (answer / reject / end / mute) ──────────────────────
 async answerCall(): Promise<void> {
  if (!this.activeCallId()) return;
  this.waCallVisible.set(false);
  this.activeCallStatus.set('connecting');

  // Step 1: Get mic
  try {
    this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch {
    this.rejectCall();
    return;
  }

  // Step 2: Create peer connection
  this.peerConnection = new RTCPeerConnection({ iceServers: this.ICE_SERVERS });
  this.localStream.getTracks().forEach(t =>
    this.peerConnection!.addTrack(t, this.localStream!)
  );

  this.peerConnection.ontrack = (e) => {
    if (!this.remoteAudio) {
      this.remoteAudio = new Audio();
      this.remoteAudio.autoplay = true;
    }
    this.remoteAudio.srcObject = e.streams[0];
  };

  // Step 3: Set Meta's SDP offer as remoteDescription
  // Meta is the OFFERER — we are the ANSWERER
  const metaSdpOffer = this.pendingMetaSdpOffer; // stored when incoming_call event arrived
  if (!metaSdpOffer) {
    console.error('No Meta SDP offer available');
    this._cleanupCall();
    return;
  }

  try {
    await this.peerConnection.setRemoteDescription({
      type: 'offer',
      sdp : metaSdpOffer,
    });
  } catch (e) {
    console.error('setRemoteDescription (Meta offer) failed:', e);
    this._cleanupCall();
    return;
  }

  // Step 4: Generate OUR answer in response to Meta's offer
  const answer = await this.peerConnection.createAnswer();
  await this.peerConnection.setLocalDescription(answer);

  // Step 5: Send OUR answer to Meta via pre_accept
  this.conversationService.callAction(
    this.activeCallId()!,
    //this.activeCallPhoneNumberId(),
    this.activeCallPlatformId(),
    'pre_accept',
    answer.sdp   // ← this is an ANSWER, not an offer
  ).pipe(takeUntil(this.destroy$)).subscribe({
    next: () => this._sendAccept(answer.sdp),
    error: err => {
      console.error('pre_accept failed', err);
      this._cleanupCall();
    }
  });
}

private _sendAccept(ourSdpAnswer: string): void {
  if (!this.activeCallId()) return;
  this.conversationService.callAction(
    this.activeCallId()!,
    //this.activeCallPhoneNumberId(),
    this.activeCallPlatformId(),
    'accept',
    ourSdpAnswer   // same answer SDP
  ).pipe(takeUntil(this.destroy$)).subscribe({
    next : () => {
      this.activeCallStatus.set('active');
      this._startCallTimer();
    },
    error: err => console.error('accept failed', err)
  });
}
 
rejectCall(): void {
  if (!this.activeCallId()) return;
  this.conversationService.callAction(
    this.activeCallId()!,
    this.activeCallPlatformId(),
    //this.activeCallPhoneNumberId(),
    'reject'
  ).pipe(takeUntil(this.destroy$)).subscribe();
  this._cleanupCall();
  this.waCallVisible.set(false);
}
 
endCall(): void {
  if (!this.activeCallId()) return;
  this.conversationService.callAction(
    this.activeCallId()!,
    //this.activeCallPhoneNumberId(),
    this.activeCallPlatformId(),
    'terminate'
  ).pipe(takeUntil(this.destroy$)).subscribe();
  this._cleanupCall();
}
 
toggleMute(): void {
  if (!this.localStream) return;
  const next = !this.isMuted();
  this.isMuted.set(next);
  this.localStream.getAudioTracks().forEach(t => { t.enabled = !next; });
}
 
get callDurationDisplay(): string {
  const s   = this.callDurationSeconds();
  const m   = Math.floor(s / 60).toString().padStart(2, '0');
  const sec = (s % 60).toString().padStart(2, '0');
  return `${m}:${sec}`;
}
 
private _startCallTimer(): void {
  this.callDurationSeconds.set(0);
  this.callTimer = setInterval(
    () => this.callDurationSeconds.update(s => s + 1),
    1000
  );
}

private _cleanupCall(): void {
  clearInterval(this.callTimer);
  this.callTimer = null;
  this.callDurationSeconds.set(0);
  this.activeCallStatus.set(null);
  this.activeCallId.set(null);
  this.activeCallFrom.set('');
  this.isMuted.set(false);
  this.activeCallIsOutbound.set(false);   // ← already present in your code ✅
  this.waCallVisible.set(false);          // ← ADD this so overlay closes on cleanup
  this.pendingSdpOffer = '';
  if (this.peerConnection) { this.peerConnection.close(); this.peerConnection = null; }
  if (this.localStream)    { this.localStream.getTracks().forEach(t => t.stop()); this.localStream = null; }
  if (this.remoteAudio)    { this.remoteAudio.srcObject = null; this.remoteAudio = null; }
}

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  onConversationSelected(conversation: Conversation): void {
    // If it's a contact without an active conversation (id === -1), 
    // we could either:
    // 1. Show a "Start Conversation" option
    // 2. Automatically create a conversation
    // 3. Show contact details with option to message
    
    if (conversation.id === -1) {
      // This is a contact without active conversation
      // You can customize this behavior
      
      // Option: Show in detail view but with "Start Conversation" button
      this.selectedConversation.set(conversation);
    } else {
      // Normal active conversation
      this.selectedConversation.set(conversation);
    }
  }

  /**
   * Start a new conversation with a contact that doesn't have an active conversation
   */
  startNewConversationWithContact(conversation: Conversation): void {
    if (conversation.id !== -1) {
      console.warn('This contact already has an active conversation');
      return;
    }

    // Create payload for new conversation
    const payload = {
      contact_id: conversation.contact.id,
      platform_id: conversation.contact.platform_name, // Adjust if needed
      message_body: '' // Will be filled when user sends first message
    };

    this.isLoading.set(true);

    // Call the service to create a new conversation
    this.conversationService.start_new_conversation(this.PLATFORM, payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (newConversation: Conversation) => {
          
          // Add to conversations list
          this.conversations.update(convs => [newConversation, ...convs]);
          this.totalRecords.update(count => count + 1);
          
          // Select the new conversation
          this.selectedConversation.set(newConversation);
          
          // Invalidate cache
          this.cachedDataService.invalidateConversations(this.PLATFORM, 'new_conversation_created');
          
          this.isLoading.set(false);
          
          this.layoutService.addNotification({
            'id': 0,
            severity: 'success',
            app: 'ChatWindow',
            text: `Started conversation with ${conversation.contact.name || conversation.contact.phone}`
          });
        },
        error: (err) => {
          console.error('Failed to start conversation:', err);
          this.isLoading.set(false);
          this.showError('Failed to start conversation. Please try again.');
        }
      });
  }

  onMessageSent(conversation: Conversation): void {
    // Move to top and update
    this.conversations.update(convs => {
      const filtered = convs.filter(c => c.id !== conversation.id);
      return [conversation, ...filtered];
    });

    this.cachedDataService.invalidateConversation(conversation.id, this.PLATFORM, 'message_sent');
  }

  onConversationClosed(conversation: Conversation): void {
    // Remove from list
    this.conversations.update(convs => 
      convs.filter(c => c.id !== conversation.id)
    );

    if (this.selectedConversation()?.id === conversation.id) {
      this.selectedConversation.set(null);
    }

    this.cachedDataService.invalidateConversations(this.PLATFORM, 'conversation_closed');
    this.invalidateCacheAndRefreshNotifications();
  }

  onOwnThisConversation(conversation: Conversation): void {
    this.conversations.update(convs => [conversation, ...convs]);
    this.selectedConversation.set(conversation);
    this.cachedDataService.invalidateConversations(this.PLATFORM, 'ownership_changed');
    //this.invalidateCacheAndRefreshNotifications();
  }

  onReassignThisConversation(): void {
    // Reload conversations after reassignment
    this.loadInitialConversations();
  }

  // ============================================================================
  // UTILITIES
  // ============================================================================

  private sortByLastMessage(conversations: Conversation[]): Conversation[] {
    return [...conversations].sort((a, b) => {
      const timeA = this.getLastMessageTimestamp(a);
      const timeB = this.getLastMessageTimestamp(b);
      return timeB - timeA;
    });
  }

  private getLastMessageTimestamp(conversation: Conversation): number {
    if (!conversation.messages || conversation.messages.length === 0) {
      return new Date(conversation.created_at).getTime();
    }

    const lastMsg = conversation.messages[conversation.messages.length - 1];
    const timeStr = lastMsg.received_time || lastMsg.sent_time;
    return timeStr ? new Date(timeStr).getTime() : 0;
  }

  getLastMessageTime(conversation: Conversation): string {
    if (!conversation.messages || conversation.messages.length === 0) {
      return '';
    }

    const lastMessage = conversation.messages[conversation.messages.length - 1];
    const time = lastMessage.received_time || lastMessage.sent_time;
    if (!time) return '';

    const messageDate = new Date(time);
    const now = new Date();
    const diffInHours = (now.getTime() - messageDate.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    if (diffInHours < 168) {
      return messageDate.toLocaleDateString('en-US', { weekday: 'short' });
    }
    return messageDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  getUnreadCount(conversation: Conversation): number {
    if (!conversation.messages) return 0;
    return conversation.messages.filter(msg => msg.status === 'unread').length;
  }

  trackConversation(index: number, conversation: Conversation): string | number {
    // For contacts without conversations (id === -1), use contact ID
    if (conversation.id === -1) {
      return `contact-${conversation.contact.id}`;
    }
    // For actual conversations, use conversation ID
    return conversation.id;
  }

  //private invalidateCacheAndRefreshNotifications(): void {
  //  // Refresh notification counts
  //  this.conversationService.list_notification(this.PLATFORM)
  //    .pipe(takeUntil(this.destroy$))
  //    .subscribe({
  //      next: (data: any) => {
  //        this.layoutService.unrespondedConversationNotification.update(() => data);
  //      },
  //      error: (err) => console.error('Failed to refresh notifications:', err)
  //    });
  //}
  // Notification pagination state
notificationPage = signal<number>(1);
notificationHasMore = signal<boolean>(true);
notificationLoading = signal<boolean>(false);

private invalidateCacheAndRefreshNotifications(reset = true): void {
    if (reset) {
        this.notificationPage.set(1);
    }

    this.conversationService
        .list_notification(this.PLATFORM, this.notificationPage(), 20)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
            next: (response: any) => {
                const data = response.results ?? response;
                const notifications = data.notifications ?? data;
                const totalCount = response.count ?? notifications.length;

                if (reset) {
                    // Replace on first load / refresh
                    this.layoutService.unrespondedConversationNotification.set({
                        conversation_count: totalCount,
                        notifications: notifications
                    });
                } else {
                    // Append on load more
                    this.layoutService.unrespondedConversationNotification.update(existing => ({
                        ...existing,
                        notifications: [...existing.notifications, ...notifications]
                    }));
                }

                this.notificationHasMore.set(
                    this.layoutService.unrespondedConversationNotification().notifications.length < totalCount
                );
            },
            error: (err) => console.error('Failed to refresh notifications:', err)
        });
}

// Call this when user scrolls to bottom of notification panel
loadMoreNotifications(): void {
    if (!this.notificationHasMore() || this.notificationLoading()) return;

    this.notificationLoading.set(true);
    this.notificationPage.update(p => p + 1);
    this.invalidateCacheAndRefreshNotifications(false);
    this.notificationLoading.set(false);
}

  private playMessageSound(): void {
    const audio = new Audio('../../../../assets/media/new_message.mp3');
    audio.play().catch(() => {});
  }

  private playNewConversationSound(): void {
    const audio = new Audio('../../../../assets/media/new_message.mp3');
    audio.play().catch(() => {});
  }

  private showError(message: string): void {
    this.layoutService.addNotification({
      'id': -2,
      severity: 'error',
      app: 'ChatWindow',
      text: message
    });
  }

  // activeCallFrom now holds caller_name (resolved in consumer from value['contacts'])
// so this just returns it directly, with conversation name as fallback.
 
getCallerDisplayName(): string {
  const convId = this.activeCallConversationId();
  if (convId) {
    const conv = this.conversations().find(c => c.id === convId);
    if (conv?.contact?.name) return conv.contact.name;
  }
  return this.activeCallFrom() || 'Unknown caller';
}

onRequestCallPermission(payload: { platformId: string; to: string }): void {
  this.conversationService
    .requestCallPermission(payload.platformId, payload.to)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: () => { /* toast success optional */ },
      error: err => console.error('request permission failed', err)
    });
}

private async checkMicrophoneAvailability(): Promise<{ available: boolean; message: string }> {
  // Check if mediaDevices API is available (requires HTTPS)
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return {
      available: false,
      message: 'Microphone access requires a secure (HTTPS) connection.'
    };
  }

  // Check current permission state without prompting
  try {
    const permissionStatus = await navigator.permissions.query(
      { name: 'microphone' as PermissionName }
    );

    if (permissionStatus.state === 'denied') {
      return {
        available: false,
        message: 'Microphone access is blocked. Please allow microphone access in your browser settings and try again.'
      };
    }
  } catch {
    // navigator.permissions not supported in all browsers — fall through to getUserMedia check
  }

  // Check if any audio input device exists
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const hasMic = devices.some(d => d.kind === 'audioinput');
    if (!hasMic) {
      return {
        available: false,
        message: 'No microphone detected. Please connect a microphone and try again.'
      };
    }
  } catch {
    // enumerateDevices failed — fall through, getUserMedia will catch it
  }

  return { available: true, message: '' };
}

async onInitiateCall(payload: { platform_id: string; to: string; }): Promise<void> {
  // phoneNumberId here is actually the platform DB id (contact.platform_id)
  const platformId = payload.platform_id;

  const micCheck = await this.checkMicrophoneAvailability();
  if (!micCheck.available) {
    this.messageService.add({
      severity: 'error',
      summary : 'Microphone Required',
      detail  : micCheck.message,
      life    : 8000,
    });
    return;
  }

  // Step 1: Generate WebRTC SDP offer — business is the caller/offerer
  let sdpOffer: string;
  try {
    this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true });

    this.peerConnection = new RTCPeerConnection({ iceServers: this.ICE_SERVERS });
    this.localStream.getTracks().forEach(t =>
      this.peerConnection!.addTrack(t, this.localStream!)
    );

    this.peerConnection.ontrack = (e) => {
      if (!this.remoteAudio) {
        this.remoteAudio = new Audio();
        this.remoteAudio.autoplay = true;
      }
      this.remoteAudio.srcObject = e.streams[0];
    };

    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);
    sdpOffer = offer.sdp!;

  } catch (e) {
    
    this.showError(`Failed to initiate call ${e}`);
    this._cleanupCall();
    return;
  }

  // Step 2: Send offer to backend → Meta
  this.conversationService
    .initiateCall(platformId, payload.to, sdpOffer)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (res: any) => {
        this.activeCallId.set(res.call_id);
        this.activeCallIsOutbound.set(true);
        this.activeCallPhoneNumberId.set(platformId);
        this.activeCallPlatformId.set(platformId);
        this.activeCallFrom.set(payload.to);
        this.activeCallStatus.set('ringing');
        this.waCallVisible.set(true);
        // Meta will respond with a 'connect' webhook (BUSINESS_INITIATED direction)
        // containing the SDP answer — handled in handleCallEvent 'outbound_call_connected'
      },
      error: err => {
        console.error('initiate call failed', err);
        this._cleanupCall();
      }
    });
}

onTransferCall(payload: { targetUserId: number }): void {
  if (!this.activeCallId()) return;

  this.conversationService.transferCall(
    this.activeCallId()!,
    this.activeCallPhoneNumberId(),
    payload.targetUserId
  ).pipe(takeUntil(this.destroy$)).subscribe({
    next: () => {
      this._cleanupCall();   // originating agent's WebRTC closes
      this.messageService.add({
        severity: 'success',
        summary : 'Call Transferred',
        detail  : 'Call has been transferred successfully',
      });
    },
    error: err => {
      console.error('Transfer failed', err);
      this.messageService.add({
        severity: 'error',
        summary : 'Transfer Failed',
        detail  : err?.error?.error || 'Could not transfer call',
      });
    },
  });
}

onCallPermissionRestored(phone: string): void {
  this.callPermissionGrantedFor.set(phone);
}

getLastMessagePreview(conversation: Conversation): string {
  if (!conversation.messages || conversation.messages.length === 0) {
    return 'No messages yet';
  }

  const lastMsg = conversation.messages[conversation.messages.length - 1];

  // ── Call history messages ─────────────────────────────────────────────
  switch (lastMsg.message_type) {
    case 'missed_call':
      return '📵 Missed call';
    case 'call_connected': {
      const secs = lastMsg.message_body ? +lastMsg.message_body : 0;
      const m    = Math.floor(secs / 60).toString().padStart(2, '0');
      const s    = (secs % 60).toString().padStart(2, '0');
      return `📞 Call · ${m}:${s}`;
    }
    case 'call_rejected':
      return '📵 Call declined';
    case 'call_not_answered':
      return '📵 Call not answered';
    case 'missed_call':
      return '📵 Missed call';
  }

  // ── Template ──────────────────────────────────────────────────────────
  if (lastMsg.template) {
    try {
      const tmpl = typeof lastMsg.template === 'string'
        ? JSON.parse(lastMsg.template)
        : lastMsg.template;
      const bodyComp = tmpl?.components?.find((c: any) => c.type === 'BODY');
      return '📋 ' + (bodyComp?.text?.slice(0, 50) || 'Template');
    } catch {
      return '📋 Template';
    }
  }

  // ── Email ─────────────────────────────────────────────────────────────
  if (lastMsg.message_type === 'email') {
    return '✉️ ' + (lastMsg.message_body?.slice(0, 50) || 'Email');
  }

  // ── Default ───────────────────────────────────────────────────────────
  return lastMsg.message_body?.slice(0, 50) || '';
}

get isNonTicketing(): boolean {
  return this.profile()?.user?.organization?.conversation_mode === 'non_ticketing';
}


}