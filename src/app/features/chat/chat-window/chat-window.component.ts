import { CommonModule } from '@angular/common';
import { AfterViewChecked, ChangeDetectorRef, Component, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output, signal, ViewChild } from '@angular/core';
import { ListChatWindowComponent } from './list-chat-window/list-chat-window.component';
import { DetailChatWindowComponent } from './detail-chat-window/detail-chat-window.component';
import { DividerModule } from 'primeng/divider';
import { ButtonModule } from 'primeng/button';
import { AvatarModule } from 'primeng/avatar';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { InputGroupAddon, InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { InputGroupModule } from 'primeng/inputgroup';
import { ContactManagerService } from '../../../shared/services/contact-manager.service';
import { ChatManagerService } from '../../../shared/services/chat-manager.service';
import { CUstomEventService } from '../../../shared/services/Events/custom-events.service';
import { ConversationNotificationTemplate, LayoutService } from '../../../layout/service/app.layout.service';
import { SocketService } from '../../../shared/services/socketio.service';
import { Subject, takeUntil } from 'rxjs';
import { UserManagerService } from '../../../shared/services/user-manager.service';
import { Router } from '@angular/router';



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

    ListChatWindowComponent,
    DetailChatWindowComponent,

  ],
  providers: [

  ],
  templateUrl: './chat-window.component.html',
  styleUrl: './chat-window.component.scss'
})
export class ChatWindowComponent implements OnInit {
  profile !: any;
  all_contacts = signal<any>(null);
  conversations = signal<any>(null);
  filterconversations = signal<any>(null);
  selectedConversation = signal<any>(null);
  searchQuery !: any;
  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef,
    private layoutService: LayoutService,
    private socketService: SocketService,
    private eventService: CUstomEventService,
    private contactService: ContactManagerService,
    private conversationService: ChatManagerService,
    private userManagerService: UserManagerService
  ) { }

  ngOnInit(): void {

    this.profile = JSON.parse(localStorage.getItem('profile'));
    if (!this.profile) {
      this.router.navigate(["/apps/login"])
    }
    else {
      this.layoutService.state.staticMenuDesktopInactive = true;
      this.initEmployees();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  employees = []
  initEmployees() {
    this.userManagerService.list_users().pipe(takeUntil(this.destroy$)).subscribe((data) => {
      this.employees = data;
      this.initContents();
    },
      (err) => {
        console.error("List conversation | Error getting users ", err);
      }
    );
  }

  async initContents() {
    await this.loadContacts();
    await this.loadConversations(); // Explicit call
    this.initSubscriptions();
  }

  initSubscriptions() {
    this.initwebsocketSubscriptions();
  }

  initwebsocketSubscriptions() {
    if (this.socketService.isSocketConnected) {
      this.subscribeToWebSocketChatMessages();
    }
    else {
      console.error("Socket connection not available for chat window subscription");
      this.layoutService.addNotification(
        { 'severity': 'error', 'app': 'ChatWindow', 'text': 'Socket connection not available for new notification' }
      )
    }
  }




  filterContacts() {
  const query = this.searchQuery.toLowerCase();

  const matchesQuery = (entry: any): boolean => {
  const contact = entry.contact;
  const baseMatch =
    contact.name?.toLowerCase().includes(query) ||
    contact.phone?.toLowerCase().includes(query) ||
    contact.description?.toLowerCase().includes(query) ||
    entry.subject?.toLowerCase().includes(query); // also match subject

  const customFieldsMatch = contact.custom_fields &&
    Object.values(contact.custom_fields).some((val: any) =>
      String(val).toLowerCase().includes(query)
    );

  return baseMatch || customFieldsMatch;
};


  if (query.length === 0) {
    this.filterconversations.set(this.conversations());
    this.sortUsersByLastMessageTime();
  } else {
    const filtered = this.all_contacts().filter(user =>
      matchesQuery(user)
    );
    this.filterconversations.set(filtered);
    this.sortUsersByLastMessageTime();
  }
}


  async reloadContactsIfNeeded(contactObject) {
    let foundIndex = this.all_contacts().findIndex((contact) => contactObject.contact.id === contact.contact.id)
    // New contact message but the user in chat window
    if (foundIndex < 0) {
      await this.loadContacts();
      await this.loadConversations();
    }
    this.updateContactForNewConversation(contactObject)
  }

  updateContactForNewConversation(conversation) {
    const updatedContacts = this.all_contacts().map((contactObject) =>
      contactObject.contact.id === conversation.contact.id
        ? { ...conversation }
        : contactObject
    )
    this.all_contacts.set(updatedContacts);
    // This would update the contacts already loaded but the conversation is new and user has searched and selected the conversation via contact search open
    let foundIndex = this.all_contacts().findIndex((contact) => conversation.contact.id === contact.contact.id)
    if (foundIndex >= 0) {
      if (this.selectedConversation()?.id === this.all_contacts()[foundIndex].id) {
        this.selectedConversation.set({ ...conversation });
      }
      this.updateAllConversationsSignals(conversation)
    }
  }

  updateAllConversationsSignals(conversation) {
        const updatedFilteredContacts = this.filterconversations().map((contactFilterObject) =>
          contactFilterObject.contact.id === conversation.contact.id
            ? { ...contactFilterObject, ...conversation }
            : contactFilterObject
        )
        this.filterconversations.set(updatedFilteredContacts);
  }

  playNewConversationNotificationSound() {
    const audio = new Audio("../../../../assets/media/new_conversation_notofication.mp3");
    audio.play();
  }

  playNewMessageNotificationSound() {
    const audio = new Audio("../../../../assets/media/new_message.mp3");
    audio.play();
  }

  subscribeToWebSocketChatMessages(): void {
    this.socketService.getMessages().pipe(takeUntil(this.destroy$)).subscribe((message) => {
      const conversations = this.conversations(); // snapshot of current conversations
      const conversationIndex = conversations.findIndex(
        (c) => c.id === message.conversation_id
      );
      if (message.msg_from_type === "CUSTOMER") {
        if (conversationIndex !== -1) {
          const updatedConversation = {
            ...conversations[conversationIndex],
            messages: [...conversations[conversationIndex].messages, message],
          };
          const updatedConversations = [...conversations];
          updatedConversations[conversationIndex] = updatedConversation;
          // Update conversations and selected conversation (if affected)
          this.conversations.set(updatedConversations);
          this.filterconversations.set(this.conversations());
          this.refreshFilterList();
          if (this.selectedConversation()?.id === updatedConversation.id) {
            this.selectedConversation.set({ ...updatedConversation });
          }
          this.playNewMessageNotificationSound();
        } else {
          this.conversationService
            .list_conversation_from_id(message.conversation_id).pipe(takeUntil(this.destroy$)).subscribe(
              {
                next: (conversation: any) => {
                  this.reloadContactsIfNeeded(conversation).then(() => {
                    if (this.layoutService.newTaskUpdateToken()) {
                      this.layoutService.newTaskUpdateToken.set(false);
                      this.refreshNewTasksNotifications();
                    }
                    this.playNewConversationNotificationSound();
                  }).catch((err) => console.error("Failed to reload contacts"));
                },
                error: () => ''
              }
            );
        }
        //this.updateNewConversationList();
        this.refreshUnrespondedConversationNotifications();
      }
      else if (message.msg_from_type === "ORG") {
        if (conversationIndex !== -1) {
          this.playNewMessageNotificationSound();
          const conversationId = conversations[conversationIndex].id;
          this.conversationService
            .list_conversation_from_id(conversationId)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (conv) => {
                const updatedConversation = {
                  ...conversations[conversationIndex],
                  messages: conv.messages,
                };
                const updatedConversations = [...conversations];
                updatedConversations[conversationIndex] = updatedConversation;
                this.conversations.set(updatedConversations);
                this.filterconversations.set(this.conversations());
                this.refreshFilterList();
                if (this.selectedConversation()?.id === updatedConversation.id) {
                  this.selectedConversation.set({ ...updatedConversation });
                }
                this.refreshUnrespondedConversationNotifications();
              },
              error: (err) => {
                console.error("Failed to refresh conversation:", err);
              },
            });
        }
      }
    });
  }


  refreshUnrespondedConversationNotifications() {
    this.conversationService.list_notification().pipe(takeUntil(this.destroy$)).subscribe({
      next: (notificationData: ConversationNotificationTemplate) => {
        this.layoutService.unrespondedConversationNotification.update((prev) => notificationData)
      },
      error: (err) => { console.error(`Could not get the conversation notifications ${err}`) }
    });
  }

  refreshNewTasksNotifications() {
    this.conversationService.list_new_conversations().pipe(takeUntil(this.destroy$)).subscribe((data) => {
      let new_parsed_messages = [].concat(...data.map((unparsed_data) => {
        return {
          'customerName': unparsed_data?.contact?.name === '' ? unparsed_data?.contact?.phone : unparsed_data?.contact?.name,
          'text': unparsed_data?.messages[0].message_body
        }
      }))
      this.layoutService.newTaskmessages.update(() => new_parsed_messages);
      this.layoutService.newTaskUpdateToken.set(true);
    },
      (err) => {
        console.error("List conversation | Error getting conversations ", err);
        this.layoutService.newTaskUpdateToken.set(true);
      }
    )
  }



  onConversationSelected(_selectedConversation) {
    this.selectedConversation.set(_selectedConversation);
  }

  onChatDetailsPageLoad() {
    this.cdr.detectChanges();
  }

  setContacts(data, conversationObject = null, resetAll = false) {
    this.all_contacts.set(data().map((ctxt) =>
      (conversationObject && ctxt.id === conversationObject.id) || (resetAll === true)
        ?
        ({
          id: -1,
          contact: {
            id: ctxt.contact.id,
            name: ctxt.contact.name,
            phone: ctxt.contact.phone,
            platform_name: ctxt.contact.platform_name,
            description: ctxt.contact.description,
            custom_fields: ctxt.contact.custom_fields
          },
          messages: [],
          subject: ctxt.subject,
          img: ctxt.img,//'http://emilcarlsson.se/assets/louislitt.png', // You can replace this with actual avatar if available
          status: 'org_new', // Add default status for demo purposes
          assigned: {
            id: -1
          }
        })
        : ctxt
    ));
  }
async loadContacts(): Promise<void> {
  return new Promise((resolve, reject) => {
    this.contactService.list_contact().pipe(takeUntil(this.destroy$)).subscribe({
      next: (contactsData) => {
        this.conversationService.list_new_active_conversations().pipe(takeUntil(this.destroy$)).subscribe({
          next: (conversationsData: any[]) => {
            const entries = contactsData.map((contact) => {
              const conv = conversationsData.find((c) => c.contact.id === contact.id);

              return {
                id: conv?.id ?? null,
                contact: {
                  id: contact.id,
                  name: contact.name,
                  phone: contact.phone,
                  platform_name: contact.platform_name,
                  description: contact.description,
                  custom_fields: contact.custom_fields,
                  image: contact.image
                },
                subject: conv?.subject ?? null,
                messages: conv?.messages ?? [],
                status: conv?.status ?? 'org_new', // or null, based on your use case
                assigned: { id: conv?.assigned?.id ?? -1 }
              };
            });

            this.all_contacts.set(entries);
            resolve();
          },
          error: (error) => {
            console.error("Error loading new active conversations", error);
            reject(error);
          }
        });
      },
      error: (err) => {
        console.error("Contacts | Error getting contacts", err);
        reject(err);
      }
    });
  });
}




  loadConversations(): Promise<void> {
  return new Promise((resolve, reject) => {
    this.conversationService.list_active_coversations_for_user()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.conversations.set(data);
          this.filterconversations.set(this.conversations());
          this.sortUsersByLastMessageTime();
          resolve(); // ✅ resolve here
        },
        error: (error_details) => {
          console.error("Cannot load conversations", error_details);
          reject(error_details); // ✅ reject on error
        }
      });
  });
}


  onOwnThisConversation(conversationObject) {
    this.conversations.update((prevConversations) => [...prevConversations, conversationObject]);
    this.selectedConversation.set(conversationObject);
    this.refreshNewTasksNotifications()
    this.refreshUnrespondedConversationNotifications();
    //this.updateNewConversationList();
    this.moveUserConversationToTop(conversationObject);
  }

  /** Callbacks and their actions */
  onMessageSent(conversationObject) {
    //this.updateNewConversationList();
    this.moveUserConversationToTop(conversationObject);
  }

  onConversationClosed(conversationObject) {
    this.setContacts(this.all_contacts, conversationObject);
    const conversations = this.conversations();
    const index = conversations.findIndex(c => c.id === conversationObject.id);
    if (index === -1) return;
    const [deletedConversation] = conversations.splice(index, 1);
    this.conversations.set([...conversations]); // ✅ ensure reactivity
    this.selectedConversation.set(null);
    this.refreshFilterList();
    this.refreshUnrespondedConversationNotifications();
  }

  total_new_conversation_count: any[] = [];

  /** Count unread messages */
  updateNewConversationList() {
    this.total_new_conversation_count = this.conversations().filter(conversation =>
      conversation.messages?.some((msg: any) => msg?.status === 'unread')
    );
    this.eventService.emitNewConversationCount(this.total_new_conversation_count.length);
  }

  /** Move specific conversation to top */
  moveUserConversationToTop(conversationObject: any) {
    this.conversations.update((prevConversations) =>
      prevConversations.map((conversation) =>
        conversation.id === conversationObject.id
          ? conversationObject // replace
          : conversation
      )
    );
    const conversations = this.conversations();


    const index = conversations.findIndex(c => c.id === conversationObject.id);
    if (index === -1) return;

    const [deletedConversation] = conversations.splice(index, 1);
    conversations.unshift(deletedConversation);

    this.conversations.set([...conversations]); // ✅ ensure reactivity
    this.refreshFilterList();
  }

  /** Refresh filtered list */
  refreshFilterList() {
    this.filterconversations.set([...this.conversations()]);  // ✅ must clone to ensure change detection
    this.sortUsersByLastMessageTime();
  }

  /** Sort conversations by last message time */
  sortUsersByLastMessageTime() {
    const sorted = [...this.filterconversations()].sort((a, b) => {
      const getLastMessageTime = (conversation: any): number => {
        const lastMsg = conversation.messages?.[conversation.messages.length - 1];
        const timeStr = lastMsg?.received_time || lastMsg?.sent_time;
        return timeStr ? new Date(timeStr).getTime() : 0;
      };
      return getLastMessageTime(b) - getLastMessageTime(a); // Descending
    });

    this.filterconversations.set(sorted);
  }

}