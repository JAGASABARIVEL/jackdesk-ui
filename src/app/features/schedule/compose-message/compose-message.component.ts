import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MultiSelectModule } from 'primeng/multiselect';
import { InputGroupModule } from 'primeng/inputgroup';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { FloatLabelModule } from 'primeng/floatlabel';
import { EditorModule, EditorTextChangeEvent } from 'primeng/editor';
import { FileUploadModule } from 'primeng/fileupload';
import { ProgressBarModule } from 'primeng/progressbar';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { BadgeModule } from 'primeng/badge';
import { Router } from '@angular/router';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';

import { ComposeMessageModel, DataSourceModel } from './compose.model';
import { MessageTemplatesComponent } from '../../campaign/message-templates/message-templates.component';
import { ContactManagerService } from '../../../shared/services/contact-manager.service';
import { PlatformManagerService } from '../../../shared/services/platform-manager.service';
import { CUstomEventService } from '../../../shared/services/Events/custom-events.service';
import { supported_contact_types, supported_frequencies, supported_datasource } from '../../../shared/constants';
import { CampaignManagerService } from '../../../shared/services/campaign-manager.service';
import { LayoutService } from '../../../layout/service/app.layout.service';
import { Subject, takeUntil } from 'rxjs';


@Component({
  selector: 'app-compose-message',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,

    SelectModule,
    SelectModule,
    MultiSelectModule,
    InputGroupModule,
    ButtonModule,
    DialogModule,
    FloatLabelModule,
    DatePickerModule,
    EditorModule,
    FileUploadModule,
    ProgressBarModule,
    ToastModule,
    BadgeModule,

    MessageTemplatesComponent
  ],
  providers: [MessageService],
  templateUrl: './compose-message.component.html',
  styleUrl: './compose-message.component.scss'
})
export class ComposeMessageComponent implements OnInit, OnDestroy {
  
  profile!: any;
  schedule_name: string = undefined;
  
  
  platform!: any;
  contact_types = supported_contact_types;
  datasource = supported_datasource;
  
  frequency = supported_frequencies;

  individual_contacts: any = undefined;
  selected_contacts_for_creating_group!: any;
  selected_contact_type: any = undefined;
  selected_template: any= undefined;
  contacts!: any;
  selected_contacts: any = undefined;
  contact_list_placeholder!: string;
  selected_date_time: any = undefined;
  selected_frequency: any = undefined;
  selected_platform: any = undefined;
  message_text: any = undefined;
  message_typed:any = undefined;
  selected_datasource: any = undefined;

  list_of_schedule_names = [];
  files !: any;
  totalSize : number = 0;
  totalSizePercent : number = 0;
  excel_icon = "assets/Icons/Schedule/ms-excel.svg";

  composeMessagePayload!: ComposeMessageModel;
  private destroy$ = new Subject<void>();


  constructor(
    private router: Router,
    private cd: ChangeDetectorRef,
    private messageService: MessageService,
    private layoutService: LayoutService,
    private scheduleService: CampaignManagerService,
    private contactServive: ContactManagerService,
    private platforService: PlatformManagerService,
    private scheduleEventService: CUstomEventService
    ) {}

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
      this.loadScheduleNames();
    this.loadGroups();

    this.platforService.list_platforms().pipe(takeUntil(this.destroy$)).subscribe(
      (data) => {
        this.platform = data;
      },
      (err) => {
        console.error("Compose Message | Error getting platforms ", err);  
      }
    );
    }

    

  }

  onScheduleNameSelected() {
    if (this.schedule_name?.length === 0) {
      this.schedule_name = undefined;
      this.selected_contact_type = undefined;
      this.selected_contacts = undefined;
      this.selected_date_time = undefined;
      this.selected_frequency = undefined;
      this.selected_platform = undefined;
      this.selected_datasource = undefined;
      this.message_text = undefined;
      this.message_text = undefined;
    }
    if (this.list_of_schedule_names.includes(this.schedule_name)) {
      let error = "Schedule name is already present. Please choose a different name";
      this.messageService.add({ severity: 'error', summary: 'Success', detail: error, sticky: true });
      this.schedule_name = undefined;
      this.selected_contact_type = undefined;
      this.selected_contacts = undefined;
      this.selected_date_time = undefined;
      this.selected_frequency = undefined;
      this.selected_platform = undefined;
      this.selected_datasource = undefined;
      this.message_text = undefined;
      this.message_text = undefined;
    }
  }

  loadScheduleNames() {
    this.scheduleService.list_campaign().pipe(takeUntil(this.destroy$)).subscribe(
      (data) => {        
        for (let schedule of data) {
            this.list_of_schedule_names.push(schedule.name);
        }
      },
      (err) => {
        console.error("Compose Message | Error getting schedule names ", err);
      }
    );
  }

  loadUserContacts() {
    this.contactServive.list_contact().pipe(takeUntil(this.destroy$)).subscribe(
      (data) => {
        data.forEach((individual_data)=> {
          individual_data.name = individual_data.name === ''? individual_data.phone : individual_data.name;
        });
        this.contacts = data;
        this.individual_contacts = data;
      },
      (err) => {
        console.error("Compose Message | Error getting contacts ", err);
      }
     )
  }

  loadGroups() {
    this.contactServive.list_groups().pipe(takeUntil(this.destroy$)).subscribe(
      (data) => {
        this.contacts = data;
      },
      (err) => {
        console.error("Compose Message | Error getting groups ", err);
      }
     )
  }

  onContactTypeSelected() {
    this.contacts = [];
    if (this.selected_contact_type?.name === "User") {
      this.contact_list_placeholder = "Recipients";
      this.loadUserContacts();

    }
    else if (this.selected_contact_type?.name === "Group") {
      this.contact_list_placeholder = "Groups";
      this.loadGroups();
    }
    else {
      this.selected_contact_type = undefined;
      this.selected_contacts = undefined;
      this.selected_date_time = undefined;
      this.selected_frequency = undefined;
      this.selected_platform = undefined;
      this.selected_datasource = undefined;
      this.message_text = undefined;
    }
  }

  onContactSelected() {
    if (this.selected_contacts?.length === 0) {
      // This is for hiding next element
      this.selected_contacts = undefined;
      this.selected_date_time = undefined;
      this.selected_frequency = undefined;
      this.selected_platform = undefined;
      this.selected_datasource = undefined;
      this.message_text = undefined;
    }
  }

  onScheduleDateTimeSelected() {
    if (String(this.selected_date_time)?.length === 0) {
      this.selected_date_time = undefined;
      this.selected_frequency = undefined;
      this.selected_platform = undefined;
      this.selected_datasource = undefined;
      this.message_text = undefined;
    }
  }

  onFrequencySelected() {
    if (String(this.selected_frequency)?.length === 0) {
      this.selected_frequency = undefined;
    }
  }

  onPlatformSelected () {
    if (!this.selected_platform) {
      this.selected_platform = undefined;
      this.selected_datasource = undefined;
      this.message_text = undefined;
    }
  }

  onTemplateSelected(selectedTemplate) {
    if (selectedTemplate?.name === "None") {
      this.selected_template = undefined;
    }
    else {
      this.selected_template = selectedTemplate;
    }
  }

  onMessageText(event: EditorTextChangeEvent) {
    this.message_text = event.textValue;
  }

  onDatasourceSelected() {
      if (this.selected_datasource?.length <= 0) {
        this.selected_datasource = undefined;
      }
  }

  choose(event, callback) {
    callback();
}

onRemoveTemplatingFile(event, file, removeFileCallback, index) {
    removeFileCallback(event, index);
    this.totalSize -= parseInt(this.formatSize(file.size));
    this.totalSizePercent = this.totalSize / 10;
}

onClearTemplatingUpload(clear) {
    clear();
    this.totalSize = 0;
    this.totalSizePercent = 0;
}

onTemplatedUpload() {
    this.messageService.add({ severity: 'info', summary: 'Success', detail: 'File Uploaded', life: 3000 });
}

onSelectedFiles(event) {
    this.files = event.currentFiles;
    this.files.forEach((file) => {
        this.totalSize += parseInt(this.formatSize(file.size));
    });
    this.totalSizePercent = this.totalSize / 10;
}
uploadEvent(callback) {
    callback();
}

formatSize(bytes: number): string {
  if (bytes === 0) {
      return '0 B';
  }
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const dm = 2; // Decimal places
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const formattedSize = parseFloat((bytes / Math.pow(k, i)).toFixed(dm));
  return `${formattedSize} ${sizes[i]}`;
}



  formatDateToCustomString(date: Date): string {
    const pad = (n: number) => n.toString().padStart(2, '0');

    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1); // Months are 0-based
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    const seconds = pad(date.getSeconds());

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

  onReset() {
    this.schedule_name = undefined;
    this.selected_contact_type = undefined;
    this.selected_contacts = undefined;
    this.selected_date_time = undefined;
    this.selected_frequency = undefined;
    this.selected_platform = undefined;
    this.selected_datasource = undefined;
    this.message_text = undefined;
    this.loadScheduleNames();
    this.cd.markForCheck();
  }

  onSchedule() {
    // TODO: Once the message gets scheduled
    // reset the fileds
    let dataSourcePayload: DataSourceModel = {
      name: {
        type: this.selected_datasource?.name,
        file_upload: "uploaded_excel"
      }
    }
    let total_messages = 0;
    this.selected_contacts = [this.selected_contacts];
    for (let contact of this.selected_contacts) {
      //for (let selected_pltfrm of this.selected_platform) {
        this.composeMessagePayload = {
          name: this.schedule_name,
          uploaded_excel: this.files[0],
          organization_id: this.profile.organization,
          platform: this.selected_platform?.id,
          frequency: this.selected_frequency.value,
          user_id: this.profile.id,
          recipient_type: this.selected_contact_type?.value,
          recipient_id: contact?.id,
          message_body: this.message_text,
          scheduled_time: this.formatDateToCustomString(this.selected_date_time),
          datasource: dataSourcePayload,
          template: this.selected_template ? JSON.stringify(this.selected_template) : undefined
        }
        this.scheduleService.create_campaign(this.composeMessagePayload).pipe(takeUntil(this.destroy$)).subscribe(
          (res) => {
            total_messages += 1;
            if (total_messages === this.selected_contacts.length) {
              this.scheduleEventService.emitEvent("SCHEDULED");
              this.messageService.add({ severity: 'success', summary: 'Success', detail: 'All messages Scheduled' });
              this.onReset();
            }
          },
          (err) => {
            total_messages += 1;
            this.messageService.add( { severity: 'error', summary: 'Error', detail: 'Error scheduling some/all messages. Please contact support team'} );
            this.onReset();
          }
        )
      //}
    }
  }
}
