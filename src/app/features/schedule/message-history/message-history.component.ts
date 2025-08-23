import { Component, EventEmitter, OnDestroy, OnInit, Output, output } from '@angular/core';
import { TableModule, Table } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { HttpClientModule } from '@angular/common/http';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ToolbarModule } from 'primeng/toolbar';
import { ButtonModule } from 'primeng/button';

import { MessageHistoryModel } from './message-history.model';
import { CampaignManagerService } from '../../../shared/services/campaign-manager.service';
import { SelectModule } from 'primeng/select';
import { LayoutService } from '../../../layout/service/app.layout.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-message-history',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,

    ToolbarModule,
    ButtonModule,
    TableModule,
    TagModule,
    IconFieldModule,
    InputTextModule,
    InputIconModule,
    MultiSelectModule,
    SelectModule,
    HttpClientModule,
    
  ],
  templateUrl: './message-history.component.html',
  styleUrl: './message-history.component.scss'
})
export class MessageHistoryComponent implements OnInit, OnDestroy {
    @Output() onFailedMessage: EventEmitter<number> = new EventEmitter();
    messages!: MessageHistoryModel[];
    loading: boolean = false;
    failed_message_count = 0;
    profile !: any;
    private destroy$ = new Subject<void>();


    constructor(private router: Router, private layoutService: LayoutService, private scheduleService: CampaignManagerService) {}

    ngOnDestroy(): void {
  this.destroy$.next();
  this.destroy$.complete();
}

  ngOnInit(): void {

    this.profile = JSON.parse(localStorage.getItem('profile'));
        if (!this.profile) {
          this.router.navigate(['/apps/login']);
          return;
        }
        else {
          this.layoutService.state.staticMenuDesktopInactive = true;
          this.loadHistory();
        }
  }

  loadHistory() {
    this.loading = true;
        this.scheduleService.list_history().pipe(takeUntil(this.destroy$)).subscribe(
          (data: MessageHistoryModel[]) => {
            this.messages = data;
            this.messages.forEach((message) => (message.send_date = new Date(<Date>message.send_date)));
            this.getFailedMessageCount();
            this.loading = false;
          },
          (err) => {
            console.error("Compose Message | Error getting history ", err);
            this.loading = false;
          }
        );

  }

  getFailedMessageCount() {
    this.failed_message_count = 0;
    this.messages.forEach((message) => {
      if (message.status == 'failed') {
        this.failed_message_count++;
      }
    });
    if (this.failed_message_count > 0) {
      this.onFailedMessage.emit(this.failed_message_count);
    }
  }
}
