import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

// PrimeNG Imports
import { TabsModule } from 'primeng/tabs';
import { ButtonModule } from 'primeng/button';
import { AvatarModule } from 'primeng/avatar';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { CardModule } from 'primeng/card';
import { TimelineModule } from 'primeng/timeline';
import { ChipModule } from 'primeng/chip';
import { BadgeModule } from 'primeng/badge';
import { DividerModule } from 'primeng/divider';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

// Services
import { ContactManagerService } from '../../../shared/services/contact-manager.service';
import { ChatManagerService } from '../../../shared/services/chat-manager.service';

interface CustomerDetail {
  id: number;
  name: string;
  phone: string;
  email?: string;
  description: string;
  category: string;
  address: string;
  platform_name: string;
  image?: string;
  custom_fields: any;
  lifecycle_stage?: string;
  lead_score?: number;
  total_revenue?: number;
  last_contact?: string;
  customer_since?: string;
  created_at: any;
}

interface PurchaseHistory {
  product_id: number;
  product_name: string;
  product_sku: string;
  quantity: number;
  total_spent: number;
  purchases: Array<{
    date: string;
    quantity: number;
    amount: number;
  }>;
}

interface ProductRelationship {
  product: {
    id: number;
    name: string;
    sku: string;
  };
  relationship_type: string;
  total_purchases: number;
  total_spent: number;
  first_purchase: string;
  last_purchase: string;
  subscription_status?: string;
  support_tickets: number;
  satisfaction_score?: number;
}

@Component({
  selector: 'app-customer-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TabsModule,
    ButtonModule,
    AvatarModule,
    TagModule,
    TableModule,
    CardModule,
    TimelineModule,
    ChipModule,
    BadgeModule,
    DividerModule,
    DialogModule,
    InputTextModule,
    TextareaModule,
    SelectModule,
    ToastModule
  ],
  providers: [MessageService],
  templateUrl: './customer-detail.component.html',
  styleUrls: ['./customer-detail.component.scss']
})
export class CustomerDetailComponent implements OnInit, OnDestroy {
  customerId: number;
  customer: CustomerDetail;
  purchaseHistory: any;
  productRelationships: ProductRelationship[] = [];
  conversations: any[] = [];
  activityTimeline: any[] = [];
  
  loading = false;
  editDialogVisible = false;
  
  lifecycleStages = [
    { label: 'Lead', value: 'lead' },
    { label: 'Prospect', value: 'prospect' },
    { label: 'Customer', value: 'customer' },
    { label: 'Loyal Customer', value: 'loyal_customer' },
    { label: 'At Risk', value: 'at_risk' },
    { label: 'Churned', value: 'churned' }
  ];
  
  private destroy$ = new Subject<void>();
  
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private contactService: ContactManagerService,
    private conversationService: ChatManagerService,
    private messageService: MessageService
  ) {}
  
  ngOnInit(): void {
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.customerId = +params['id'];
      if (this.customerId) {
        this.loadCustomerData();
      }
    });
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  loadCustomerData(): void {
    this.loading = true;
    
    // Load basic customer info
    this.contactService.list_contact()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (contacts) => {
          this.customer = contacts.find(c => c.id === this.customerId);
          this.loadPurchaseHistory();
          this.loadProductRelationships();
          this.loadConversations();
        },
        error: (err) => {
          console.error('Error loading customer:', err);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to load customer data'
          });
          this.loading = false;
        }
      });
  }
  
  loadPurchaseHistory(): void {
    // Call customer purchase history endpoint
    this.conversationService.list_conversations_enhanced('chat', {
      search: this.customer.phone
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          // Mock purchase history - replace with actual API call
          this.purchaseHistory = {
            customer: this.customer,
            summary: {
              total_purchases: 12,
              total_spent: 25000.00,
              avg_order_value: 2083.33,
              last_purchase: new Date().toISOString()
            },
            products: []
          };
          this.loading = false;
        },
        error: (err) => {
          console.error('Error loading purchase history:', err);
          this.loading = false;
        }
      });
  }
  
  loadProductRelationships(): void {
    // Load product relationships from API
    // Using mock data for now
    this.productRelationships = [
      {
        product: { id: 1, name: 'Premium Service', sku: 'PKG-001' },
        relationship_type: 'subscribed',
        total_purchases: 2,
        total_spent: 18000,
        first_purchase: '2024-01-15',
        last_purchase: '2024-07-10',
        subscription_status: 'active',
        support_tickets: 3,
        satisfaction_score: 4.5
      }
    ];
  }
  
  loadConversations(): void {
    this.conversationService.list_conversations_enhanced('chat', {
      search: this.customer.phone
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.conversations = data.results || data;
          this.buildActivityTimeline();
        },
        error: (err) => {
          console.error('Error loading conversations:', err);
        }
      });
  }
  
  buildActivityTimeline(): void {
    this.activityTimeline = this.conversations.map(conv => ({
      date: conv.created_at,
      type: conv.context || 'support',
      title: this.getActivityTitle(conv),
      description: this.getActivityDescription(conv),
      icon: this.getActivityIcon(conv.context)
    }));
  }
  
  getActivityTitle(conversation: any): string {
    const types = {
      'marketing': 'Marketing Campaign',
      'sales': 'Sales Inquiry',
      'support': 'Support Ticket'
    };
    return types[conversation.context] || 'Customer Interaction';
  }
  
  getActivityDescription(conversation: any): string {
    return `${conversation.message_count || 0} messages exchanged`;
  }
  
  getActivityIcon(context: string): string {
    const icons = {
      'marketing': 'pi-megaphone',
      'sales': 'pi-shopping-cart',
      'support': 'pi-headphones'
    };
    return icons[context] || 'pi-comments';
  }
  
  getLifecycleSeverity(stage: string): any {
    const severities = {
      'lead': 'info',
      'prospect': 'warn',
      'customer': 'success',
      'loyal_customer': 'success',
      'at_risk': 'danger',
      'churned': 'secondary'
    };
    return severities[stage] || 'info';
  }
  
  getRelationshipIcon(type: string): string {
    const icons = {
      'subscribed': 'pi-calendar',
      'purchased': 'pi-shopping-bag',
      'trial': 'pi-clock'
    };
    return icons[type] || 'pi-tag';
  }
  
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }
  
  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
  
  openEditDialog(): void {
    this.editDialogVisible = true;
  }
  
  saveCustomer(): void {
    this.loading = true;
    this.contactService.update_contact(this.customer)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Customer updated successfully'
          });
          this.editDialogVisible = false;
          this.loading = false;
        },
        error: (err) => {
          console.error('Error updating customer:', err);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to update customer'
          });
          this.loading = false;
        }
      });
  }
  
  startConversation(context: 'marketing' | 'sales' | 'support'): void {
    this.router.navigate(['/apps/chat'], {
      queryParams: {
        contactId: this.customerId,
        context: context
      }
    });
  }
  
  viewConversation(conversationId: number): void {
    this.router.navigate(['/apps/chat'], {
      queryParams: { conversationId }
    });
  }
  
  goBack(): void {
    this.router.navigate(['/apps/contacts']);
  }
}