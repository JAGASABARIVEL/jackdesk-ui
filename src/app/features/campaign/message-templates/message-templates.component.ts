import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { CardModule } from 'primeng/card';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FloatLabelModule } from 'primeng/floatlabel';
import { SelectModule } from 'primeng/select';
import { MessagePreviewComponent } from '../message-preview/message-preview.component';
import { PlatformManagerService } from '../../../shared/services/platform-manager.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-message-templates',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SelectModule,
    CardModule,
    FloatLabelModule,

    MessagePreviewComponent
  ],
  templateUrl: './message-templates.component.html',
  styleUrl: './message-templates.component.scss'
})
export class MessageTemplatesComponent implements OnInit, OnDestroy {

  _selectedPlatform: any;
  @Output() selectTemplate: EventEmitter<any> = new EventEmitter();
  private destroy$ = new Subject<void>();


  templates;
  
  selectedTemplate: any = null;

  constructor(private campaignService: PlatformManagerService) {}


  ngOnInit(): void {    
  }
  ngOnDestroy(): void {
  this.destroy$.next();
  this.destroy$.complete();
}



  @Input()
  set selectedPlatform(value: string) {
    this._selectedPlatform = value;
    this.handleSelectedPlatformChange(value);
  }

  get selectedPlatform(): string {
    return this._selectedPlatform;
  }

  handleSelectedPlatformChange(newValue: any) {
    this.campaignService.get_templates(newValue?.id).pipe(takeUntil(this.destroy$)).subscribe((templates_list) => {
      // At this moment we support only whatsapp
      this.templates = templates_list["whatsapp"];
      //this.templates.unshift(
      //  {
      //    name: 'None'
      //  }
      //)
    })
  }

  onTemplateSelect(templateName: string) {
    this.selectedTemplate = this.templates.find(t => t.name === templateName);
    if (!this.selectedTemplate || this.selectedTemplate?.name === 'None' ) {
      this.selectedTemplate = undefined;
    }
    this.selectTemplate.emit(this.selectedTemplate);
  }
}
