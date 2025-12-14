import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { TableModule, Table } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { DialogModule } from 'primeng/dialog';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { RadioButtonModule } from 'primeng/radiobutton';

import { ScheduleModel } from './schedule_crud.model';
import { StatusPipe } from '../../../shared/pipes/status.pipe';
import { supported_frequencies, supported_statuses } from '../../../shared/constants';
import { CUstomEventService } from '../../../shared/services/Events/custom-events.service';
import { CampaignManagerService } from '../../../shared/services/campaign-manager.service';
import { SelectModule } from 'primeng/select';
import { LayoutService } from '../../../layout/service/app.layout.service';


@Component({
  selector: 'app-crud-schedules',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
  
    DialogModule,
    ConfirmDialogModule,
    ToastModule,
    ToolbarModule,
    ButtonModule,
    TableModule,
    TagModule,
    IconFieldModule,
    InputTextModule,
    InputIconModule,
    MultiSelectModule,
    SelectModule,
    RadioButtonModule,
    InputGroupModule,
    InputGroupAddonModule,

    StatusPipe,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './crud-schedules.component.html',
  styleUrl: './crud-schedules.component.scss'
})
export class CrudSchedulesComponent implements OnInit, OnDestroy {
  @Output() totalSchedules: EventEmitter<number> = new EventEmitter();
  totalSchedulesCount: number = 0
  profile!: any;
  customers!: any;
  schedules!: ScheduleModel[];
  schedule!: ScheduleModel;
  selectedSchedules!: ScheduleModel[];
  representatives!: any;
  
  loading: boolean = true;
  activityValues: number[] = [0, 100];
  scheduleDialog: boolean = false;
  submitted: boolean = false;
  dialogProgress: boolean = false;

  schedule_names = [];
  recipient_types = [];
  recipient_names = [];
  available_platforms = [];
  creators = [];
  private destroy$ = new Subject<void>();


  frequencies = supported_frequencies;
  statuses = supported_statuses

  constructor(
    private router: Router,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private layoutService: LayoutService,
    private scheduleService: CampaignManagerService,
    private scheduleEventService: CUstomEventService
    ) { }
  ngOnDestroy(): void {
  this.destroy$.next();
  this.destroy$.complete();

  }
  ngOnInit() {

        this.profile = JSON.parse(localStorage.getItem('profile'));
        if (!this.profile) {
          this.router.navigate(['/apps/login']);
          return;
        }
        else {
          this.layoutService.state.staticMenuDesktopInactive = true;
          this.loadSchedules();
        this.scheduleEventService.event$.pipe(takeUntil(this.destroy$)).subscribe((msg) => {
          this.loadSchedules();
        });
        }
 }

  loadSchedules() {
    this.loading = true;
    this.totalSchedulesCount = 0;
    this.scheduleService.list_campaign().pipe(takeUntil(this.destroy$)).subscribe(
      (data) => {
        this.schedules = data        
        for (let schedule of this.schedules) {
          this.totalSchedulesCount++;

          if (!this.schedule_names.some(schedule_name => schedule_name.value == schedule.name)) {
            this.schedule_names.push({value : schedule.name});
          }

          if (!this.recipient_types.some(rec_type => rec_type.value == schedule.recipient_type)) {
            this.recipient_types.push({value : schedule.recipient_type});
          }

          if (!this.creators.some(creator => creator.value == schedule.created_by)) {
            this.creators.push({value : schedule.created_by});
          }

          if (!this.available_platforms.some(platform => platform.value == schedule.platform_name)) {
            this.available_platforms.push({value : schedule.platform_name});
          }
          
          if (!this.recipient_names.some(recipient_name => recipient_name.value == schedule.recipient_name)) {
            this.recipient_names.push({value : schedule.recipient_name});
          }
          schedule.scheduled_time = new Date(<Date>schedule.scheduled_time);
          schedule.created_at = new Date(<Date>schedule.created_at);
      }
      this.totalSchedules.emit(this.totalSchedulesCount);
      this.loading = false;
  
      },
      (error) => {
        console.error("Error in getting schedule ", error)
        this.loading = false;
      }
    );
  }
  clear(table: Table) {
    table.clear();
  }

  getSeverity(status: string) {
    switch (status) {
        case 'Daily':
        case 'failed':
        case 'partially_failed':
            return 'danger';
        case 'Weekly':
        case 'sent':
            return 'success';
        case 'Monthly':
        case 'scheduled':
            return 'info';
        case 'Quarterly':
        case 'cancelled':
        case 'warning':
        case 'scheduled_warning':
            return 'warn';
        case 'Yearly':
            return null;
    }
    return null;
  }

  getFrequencyByName(frequency: number) {
    switch (frequency) {
        case -1:
            return 'NA';
        case 0:
            return 'Daily';
        case 1:
            return 'Weekly';
        case 2:
            return 'Monthly';
        case 3:
            return 'Quarterly';
        case 4:
            return 'Half Yearly';
        case 5:
            return 'Yearly';
    }
    return null;
  }

  onSearchInput(event: Event, dt: Table): void {
    const inputElement = event.target as HTMLInputElement;
    const searchValue = inputElement.value;
    dt.filterGlobal(searchValue, 'contains');
  }

  hideDialog() {
    this.scheduleDialog = false;
    this.submitted = false;
  }

  cancelSelectedSchedules() {
    this.loading = true;
    let selectedScheduleCount = 0;
    this.selectedSchedules = this.selectedSchedules.filter((schedule) => ["scheduled", "completed"].includes(schedule.status));
    let scheduleIds = []
    for (let selectedSchedule of this.selectedSchedules) {
      scheduleIds.push(selectedSchedule.id);
    }
    this.scheduleService.bulk_delete_campaign({"ids": scheduleIds}).pipe(takeUntil(this.destroy$)).subscribe(
        (data) => {
          this.loading = false;
          selectedScheduleCount++;
          if (selectedScheduleCount == this.selectedSchedules.length) {
            this.loadSchedules();
            
            this.messageService.add({ severity: 'success', summary: 'Success', detail: 'All selected schedules cancelled successfully' });
          }
        },
        (error) => {
          this.loading = false;
          this.selectedSchedules = null;
          this.loadSchedules();
          console.error("Error in deleting schedule ", error)
          
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'An error occurred while cancelling schedule', sticky: true }); 
        }
      );
  }

  cancelSelectedSchedule(schedule) {
    this.loading = true;
    this.scheduleService.delete_campaign(schedule.id).pipe(takeUntil(this.destroy$)).subscribe(
      (data) => {
        this.loadSchedules();
        this.loading = false;
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Schedule cancelled successfully' });
      },
      (error) => {
        console.error("Error in deleting schedule ", error)
        this.loading = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'An error occurred while cancelling schedule', sticky: true });
      }
    );
  }

  restartSchedule(schedule) {
    this.loading = true;
    this.scheduleService.update_campaign(schedule.id, {"status": "scheduled"}).pipe(takeUntil(this.destroy$)).subscribe(
      (data) => {
        this.loadSchedules();
        this.loading = false;
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Schedule restarted successfully' });
      },
      (error) => {
        console.error("Error in restarting schedule ", error)
        this.loading = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'An error occurred while restarting schedule', sticky: true });
      }
    );
  }

  viewSchedule(schedule) {
    this.schedule = {... schedule };
    this.scheduleDialog = true;
  }

  saveSchedule() {
    this.submitted = true;
    this.dialogProgress = true;

  }

  // Add this method to your CrudSchedulesComponent class

getPlatformIcon(platformName: string): string {
  const platform = platformName?.toLowerCase();
  switch (platform) {
    case 'whatsapp':
      return 'pi-whatsapp';
    case 'telegram':
      return 'pi-telegram';
    case 'messanger':
      return 'pi-facebook';
    case 'insta':
      return 'pi-instagram';
    default:
      return 'pi-send';
  }
}

getFrequencySeverity(frequency: number): any {
  switch (frequency) {
    case 0: // Daily
      return 'danger';
    case 1: // Weekly
      return 'success';
    case 2: // Monthly
      return 'info';
    case 3: // Quarterly
    case 4: // Half Yearly
      return 'warn';
    case 5: // Yearly
      return null;
    default:
      return null;
  }
}

  deleteProduct(schedule) {

  }
}
