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
    PerformJsonOpPipe
  ],
  templateUrl: './chat-window.component.html',
  styleUrl: './chat-window.component.scss'
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
    private conversationService: ChatManagerService
  ) {}

  ngOnInit(): void {
    this.initializeComponent();
    this.setupSearchHandler();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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
  }

  private handleWebSocketMessage(message: any): void {
    const convId = message.conversation_id;
    
    // Check if conversation is in current list
    const convIndex = this.conversations().findIndex(c => c.id === convId);
    if (['INTERNAL', 'CUSTOMER'].includes(message.msg_from_type)) {
      if (convIndex !== -1) {
        // Update existing conversation
        this.updateConversationWithMessage(convIndex, message);
        
        this.playMessageSound();
      } else if (convIndex === -1 && this.profile()?.user?.id ===  message?.assigned_user_id){
        // New conversation - fetch and add
        this.fetchAndAddConversation(convId);
      }
    } else if (message.msg_from_type === 'ORG') {
      if (convIndex !== -1) {
        this.refreshConversation(convId);
      }
    }

    this.invalidateCacheAndRefreshNotifications();
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
    this.invalidateCacheAndRefreshNotifications();
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

  private invalidateCacheAndRefreshNotifications(): void {
    // Refresh notification counts
    this.conversationService.list_notification(this.PLATFORM)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {
          this.layoutService.unrespondedConversationNotification.update(() => data);
        },
        error: (err) => console.error('Failed to refresh notifications:', err)
      });
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
}