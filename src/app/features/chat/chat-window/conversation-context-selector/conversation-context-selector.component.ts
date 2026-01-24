// conversation-context-selector.component.ts
import { Component, Output, EventEmitter, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';

interface ConversationContext {
  value: string;
  label: string;
  icon: string;
  description: string;
}

@Component({
  selector: 'app-conversation-context-selector',
  standalone: true,
  imports: [CommonModule, DialogModule, ButtonModule, SelectModule],
  template: `
    <p-dialog 
      [(visible)]="visible"
      [modal]="true"
      header="Select Conversation Type"
      [style]="{width: '500px'}">
      
      <div class="context-selector">
        <div 
          *ngFor="let context of contexts"
          class="context-option"
          [class.selected]="selectedContext === context.value"
          (click)="selectContext(context.value)">
          <i [class]="'pi ' + context.icon + ' context-icon'"></i>
          <div class="context-info">
            <h4>{{ context.label }}</h4>
            <p>{{ context.description }}</p>
          </div>
        </div>
      </div>
      
      <ng-template pTemplate="footer">
        <p-button 
          label="Cancel"
          [text]="true"
          (onClick)="cancel()">
        </p-button>
        <p-button 
          label="Start Conversation"
          [disabled]="!selectedContext"
          (onClick)="confirm()">
        </p-button>
      </ng-template>
    </p-dialog>
  `,
  styles: [`
    .context-selector {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      padding: 1rem 0;
    }
    
    .context-option {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1.5rem;
      border: 2px solid #e9ecef;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.3s ease;
      
      &:hover {
        border-color: #667eea;
        background: #f8f9ff;
      }
      
      &.selected {
        border-color: #667eea;
        background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
      }
    }
    
    .context-icon {
      font-size: 2rem;
      color: #667eea;
    }
    
    .context-info {
      h4 {
        margin: 0 0 0.5rem 0;
        color: #212529;
      }
      
      p {
        margin: 0;
        color: #6c757d;
        font-size: 0.875rem;
      }
    }
  `]
})
export class ConversationContextSelectorComponent {
  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() contextSelected = new EventEmitter<string>();
  
  selectedContext: string = '';
  
  contexts: ConversationContext[] = [
    {
      value: 'marketing',
      label: 'Marketing',
      icon: 'pi-megaphone',
      description: 'Promotional campaigns and brand awareness'
    },
    {
      value: 'sales',
      label: 'Sales',
      icon: 'pi-shopping-cart',
      description: 'Product inquiries and deal management'
    },
    {
      value: 'support',
      label: 'Support',
      icon: 'pi-headphones',
      description: 'Customer service and technical assistance'
    }
  ];
  
  selectContext(context: string): void {
    this.selectedContext = context;
  }
  
  confirm(): void {
    this.contextSelected.emit(this.selectedContext);
    this.visible = false;
    this.visibleChange.emit(false);
    this.selectedContext = '';
  }
  
  cancel(): void {
    this.visible = false;
    this.visibleChange.emit(false);
    this.selectedContext = '';
  }
}