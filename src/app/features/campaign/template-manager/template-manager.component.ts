import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

// PrimeNG Imports
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { CardModule } from 'primeng/card';
import { RadioButtonModule } from 'primeng/radiobutton';
import { FileUploadModule } from 'primeng/fileupload';
import { CheckboxModule } from 'primeng/checkbox';
import { FloatLabelModule } from 'primeng/floatlabel';
import { ConfirmationService, MessageService } from 'primeng/api';

import { PlatformManagerService } from '../../../shared/services/platform-manager.service';
import { MessagePreviewComponent } from '../message-preview/message-preview.component';
import { TextareaModule } from 'primeng/textarea';
import { ChipModule } from 'primeng/chip';
import { ExcelGeneratorService } from '../../../shared/services/excel-generator.service';

interface TemplateComponent {
  type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
  format?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  text?: string;
  buttons?: TemplateButton[];
  example?: any;
}

interface TemplateButton {
  type: 'QUICK_REPLY' | 'PHONE_NUMBER' | 'URL';
  text: string;
  phone_number?: string;
  url?: string;
}

interface WhatsAppTemplate {
  id?: string;
  name: string;
  language: string;
  category: string;
  parameter_format?: 'named';
  status?: string;
  components: TemplateComponent[];
  rejected_reason?: string;
}

interface NamedParameter {
  param_name: string;
  example: string;
}

@Component({
  selector: 'app-template-manager',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    TextareaModule,
    SelectModule,
    TagModule,
    TooltipModule,
    ConfirmDialogModule,
    ToastModule,
    CardModule,
    RadioButtonModule,
    FileUploadModule,
    ChipModule,
    CheckboxModule,
    FloatLabelModule,
    MessagePreviewComponent
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './template-manager.component.html',
  styleUrls: ['./template-manager.component.scss']
})
export class TemplateManagerComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // Template data
  templates: WhatsAppTemplate[] = [];
  filteredTemplates: WhatsAppTemplate[] = [];
  selectedPlatform: any;
  registeredPlatforms: any;
  
  // Dialog states
  showTemplateDialog = false;
  showPredefineDialog = false;
  showQuickPreview = false;
  
  // Custom tab state
  activeTab = 0;
  
  // Forms
  templateForm: FormGroup;
  editMode = false;
  currentTemplateId: string | null = null;
  
  // Preview
  previewTemplate: any = null;
  quickPreviewTemplate: any = null;
  
  // Named Parameters
  detectedParameters: string[] = [];
  parameterExamples: FormArray;
  
  // Predefined templates from Facebook
  predefinedTemplates: any[] = [
    {
      name: 'welcome_message',
      category: 'UTILITY',
      language: 'en',
      components: [
        { type: 'BODY', text: 'Welcome to {{1}}! We\'re excited to have you here.' },
        { type: 'FOOTER', text: 'Reply STOP to unsubscribe' }
      ]
    },
    {
      name: 'order_confirmation',
      category: 'UTILITY',
      language: 'en',
      components: [
        { type: 'HEADER', format: 'TEXT', text: 'Order Confirmed' },
        { type: 'BODY', text: 'Hi {{1}}, your order #{{2}} has been confirmed and will be delivered by {{3}}.' },
        { type: 'FOOTER', text: 'Thank you for your purchase!' }
      ]
    },
    {
      name: 'appointment_reminder',
      category: 'UTILITY',
      language: 'en',
      components: [
        { type: 'HEADER', format: 'TEXT', text: 'Appointment Reminder' },
        { type: 'BODY', text: 'Hi {{1}}, this is a reminder about your appointment on {{2}} at {{3}}.' },
        {
          type: 'BUTTONS',
          buttons: [
            { type: 'QUICK_REPLY', text: 'Confirm' },
            { type: 'QUICK_REPLY', text: 'Reschedule' }
          ]
        }
      ]
    }
  ];
  
  // Dropdown options
  languageOptions = [
    { label: 'English (US)', value: 'en_US' },
    { label: 'English (UK)', value: 'en_GB' },
    { label: 'Spanish', value: 'es' },
    { label: 'French', value: 'fr' },
    { label: 'German', value: 'de' },
    { label: 'Portuguese (BR)', value: 'pt_BR' },
    { label: 'Hindi', value: 'hi' },
    { label: 'Arabic', value: 'ar' }
  ];
  
  categoryOptions = [
    { label: 'Marketing', value: 'MARKETING' },
    { label: 'Utility', value: 'UTILITY' },
    { label: 'Authentication', value: 'AUTHENTICATION' }
  ];
  
  headerFormatOptions = [
    { label: 'Text', value: 'TEXT' },
    { label: 'Image', value: 'IMAGE' },
    { label: 'Video', value: 'VIDEO' },
    { label: 'Document', value: 'DOCUMENT' }
  ];
  
  buttonTypeOptions = [
    { label: 'Quick Reply', value: 'QUICK_REPLY' },
    { label: 'Phone Number', value: 'PHONE_NUMBER' },
    { label: 'URL', value: 'URL' }
  ];
  
  constructor(
    private fb: FormBuilder,
    private platformService: PlatformManagerService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private excelService: ExcelGeneratorService
  ) {
    this.parameterExamples = this.fb.array([]);
    this.initializeForm();
  }
  
  ngOnInit(): void {
    this.loadPlatforms();
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadPlatforms() {
    this.platformService.list_platforms().pipe(takeUntil(this.destroy$)).subscribe(
      {
        next: (data) => {this.registeredPlatforms = data;},
        error: (err) => console.error("Could not get the platforms ", err)
      }
    )
  }

  loadTemplatesFromPlatform() {
    this.loadTemplates(this.selectedPlatform.id);
  }
  
  initializeForm(): void {
    this.templateForm = this.fb.group({
      name: ['', [Validators.required, Validators.pattern(/^[a-z0-9_]+$/)]],
      language: ['en_US', Validators.required],
      category: ['UTILITY', Validators.required],
      hasHeader: [false],
      headerFormat: ['TEXT'],
      headerText: [''],
      bodyText: ['', Validators.required],
      hasFooter: [false],
      footerText: [''],
      hasButtons: [false],
      buttons: this.fb.array([])
    });
    
    // Watch for changes to update preview and detect parameters
    this.templateForm.valueChanges.pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.updatePreview();
    });
    
    // Watch body text changes to detect named parameters
    this.templateForm.get('bodyText')?.valueChanges.pipe(
      takeUntil(this.destroy$)
    ).subscribe((text: string) => {
      this.detectNamedParameters(text);
    });
  }
  
  /**
   * Detect named parameters in body text
   * Looks for patterns like {{customer_name}}, {{order_id}}, etc.
   */
  detectNamedParameters(text: string): void {
    if (!text) {
      this.detectedParameters = [];
      this.clearParameterExamples();
      return;
    }
    
    // Match both named parameters {{name}} and numbered {{1}}
    const namedParamRegex = /\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g;
    const matches = text.matchAll(namedParamRegex);
    const params: string[] = [];
    
    for (const match of matches) {
      const paramName = match[1];
      if (!params.includes(paramName)) {
        params.push(paramName);
      }
    }
    
    // Only update if parameters changed
    if (JSON.stringify(params) !== JSON.stringify(this.detectedParameters)) {
      this.detectedParameters = params;
      this.updateParameterExamples();
    }
  }
  
  /**
   * Update parameter examples form array based on detected parameters
   */
  updateParameterExamples(): void {
    this.clearParameterExamples();
    
    this.detectedParameters.forEach(paramName => {
      this.parameterExamples.push(this.fb.group({
        param_name: [paramName, Validators.required],
        example: ['', Validators.required]
      }));
    });
  }
  
  /**
   * Clear all parameter examples
   */
  clearParameterExamples(): void {
    while (this.parameterExamples.length) {
      this.parameterExamples.removeAt(0);
    }
  }
  
  /**
   * Get parameter example form group
   */
  getParameterFormGroup(control: any): FormGroup {
    return control as FormGroup;
  }
  
  loadTemplates(platformId: number): void {
    this.platformService.get_templates(platformId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.templates = response['whatsapp'] || [];
          this.filteredTemplates = [...this.templates];
        },
        error: (error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to load templates'
          });
        }
      });
  }
  
  // Excel Download Methods
  
  /**
   * Download sample Excel file for a template with pre-filled examples
   */
  downloadSampleExcel(template: WhatsAppTemplate): void {
    try {
      this.excelService.generateTemplateExcel(template);
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Sample Excel file downloaded successfully'
      });
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to generate Excel file'
      });
    }
  }
  
  /**
   * Download empty Excel template for manual data entry
   */
  downloadEmptyExcel(template: WhatsAppTemplate): void {
    try {
      this.excelService.generateEmptyTemplateExcel(template, 100);
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Empty Excel template downloaded successfully'
      });
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to generate Excel file'
      });
    }
  }
  
  /**
   * Check if template has parameters
   */
  hasParameters(template: WhatsAppTemplate): boolean {
    const bodyComponent = template.components.find(c => c.type === 'BODY');
    if (!bodyComponent?.text) return false;
    
    const namedParamRegex = /\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g;
    return namedParamRegex.test(bodyComponent.text);
  }
  
  // CRUD Operations
  
  openCreateDialog(): void {
    this.editMode = false;
    this.currentTemplateId = null;
    this.activeTab = 0;
    this.detectedParameters = [];
    this.clearParameterExamples();
    this.templateForm.reset({
      language: 'en_US',
      category: 'UTILITY',
      hasHeader: false,
      hasFooter: false,
      hasButtons: false
    });
    this.clearButtons();
    this.showTemplateDialog = true;
    this.updatePreview();
  }
  
  openEditDialog(template: WhatsAppTemplate): void {
    this.editMode = true;
    this.currentTemplateId = template.id || null;
    this.activeTab = 0;
    
    // Populate form with template data
    const headerComponent = template.components.find(c => c.type === 'HEADER');
    const bodyComponent = template.components.find(c => c.type === 'BODY');
    const footerComponent = template.components.find(c => c.type === 'FOOTER');
    const buttonComponent = template.components.find(c => c.type === 'BUTTONS');
    
    this.templateForm.patchValue({
      name: template.name,
      language: template.language,
      category: template.category,
      hasHeader: !!headerComponent,
      headerFormat: headerComponent?.format || 'TEXT',
      headerText: headerComponent?.text || '',
      bodyText: bodyComponent?.text || '',
      hasFooter: !!footerComponent,
      footerText: footerComponent?.text || '',
      hasButtons: !!buttonComponent
    });
    
    // Detect parameters from body text
    if (bodyComponent?.text) {
      this.detectNamedParameters(bodyComponent.text);
      
      // Populate example values if available
      if (bodyComponent.example?.body_text_named_params) {
        bodyComponent.example.body_text_named_params.forEach((param: NamedParameter, index: number) => {
          if (this.parameterExamples.at(index)) {
            this.parameterExamples.at(index).patchValue({
              example: param.example
            });
          }
        });
      }
    }
    
    // Populate buttons
    this.clearButtons();
    if (buttonComponent?.buttons) {
      buttonComponent.buttons.forEach(button => {
        this.addButton(button);
      });
    }
    
    this.showTemplateDialog = true;
    this.updatePreview();
  }
  
  openQuickPreview(template: WhatsAppTemplate): void {
    this.quickPreviewTemplate = template;
    this.showQuickPreview = true;
  }
  
  saveTemplate(): void {
    if (this.templateForm.invalid) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation Error',
        detail: 'Please fill all required fields'
      });
      return;
    }
    
    // Validate parameter examples if named parameters detected
    if (this.detectedParameters.length > 0 && this.parameterExamples.invalid) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation Error',
        detail: 'Please provide example values for all parameters'
      });
      return;
    }
    
    const templateData = this.buildTemplateData();
    
    if (this.editMode) {
      this.updateTemplate(templateData);
    } else {
      this.createTemplate(templateData);
    }
  }
  
  createTemplate(templateData: WhatsAppTemplate): void {
    this.platformService.createTemplate(this.selectedPlatform?.id, templateData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Template created successfully and submitted for review'
          });
          this.showTemplateDialog = false;
          this.loadTemplates(this.selectedPlatform?.id);
        },
        error: (error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: error.error?.error || error.message || 'Failed to create template'
          });
        }
      });
  }
  
  updateTemplate(templateData: WhatsAppTemplate): void {
    this.messageService.add({
      severity: 'warn',
      summary: 'Not Supported',
      detail: 'WhatsApp does not allow template editing. Please delete and recreate the template.'
    });
  }
  
  deleteTemplate(template: WhatsAppTemplate): void {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete template "${template.name}"?`,
      header: 'Delete Confirmation',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.platformService.deleteTemplate(this.selectedPlatform?.id, template.name)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.messageService.add({
                severity: 'success',
                summary: 'Success',
                detail: 'Template deleted successfully'
              });
              this.loadTemplates(this.selectedPlatform?.id);
            },
            error: (error) => {
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: error.message || 'Failed to delete template'
              });
            }
          });
      }
    });
  }
  
  // Predefined Templates
  
  openPredefinedDialog(): void {
    this.showPredefineDialog = true;
  }
  
  usePredefinedTemplate(template: any): void {
    this.editMode = false;
    this.currentTemplateId = null;
    this.activeTab = 0;
    
    const headerComponent = template.components.find((c: any) => c.type === 'HEADER');
    const bodyComponent = template.components.find((c: any) => c.type === 'BODY');
    const footerComponent = template.components.find((c: any) => c.type === 'FOOTER');
    const buttonComponent = template.components.find((c: any) => c.type === 'BUTTONS');
    
    this.templateForm.patchValue({
      name: template.name,
      language: template.language,
      category: template.category,
      hasHeader: !!headerComponent,
      headerFormat: headerComponent?.format || 'TEXT',
      headerText: headerComponent?.text || '',
      bodyText: bodyComponent?.text || '',
      hasFooter: !!footerComponent,
      footerText: footerComponent?.text || '',
      hasButtons: !!buttonComponent
    });
    
    this.clearButtons();
    if (buttonComponent?.buttons) {
      buttonComponent.buttons.forEach((button: any) => {
        this.addButton(button);
      });
    }
    
    this.showPredefineDialog = false;
    this.showTemplateDialog = true;
    this.updatePreview();
  }
  
  // Button Management
  
  get buttons(): FormArray {
    return this.templateForm.get('buttons') as FormArray;
  }
  
  addButton(buttonData?: TemplateButton): void {
    const buttonGroup = this.fb.group({
      type: [buttonData?.type || 'QUICK_REPLY', Validators.required],
      text: [buttonData?.text || '', Validators.required],
      phone_number: [buttonData?.phone_number || ''],
      url: [buttonData?.url || '']
    });
    
    this.buttons.push(buttonGroup);
  }
  
  removeButton(index: number): void {
    this.buttons.removeAt(index);
  }
  
  clearButtons(): void {
    while (this.buttons.length) {
      this.buttons.removeAt(0);
    }
  }
  
  // Helper Methods
  
  buildTemplateData(): WhatsAppTemplate {
    const formValue = this.templateForm.value;
    const components: TemplateComponent[] = [];
    
    // Add header
    if (formValue.hasHeader) {
      components.push({
        type: 'HEADER',
        format: formValue.headerFormat,
        text: formValue.headerFormat === 'TEXT' ? formValue.headerText : undefined
      });
    }
    
    // Add body (required) with named parameters support
    const bodyComponent: TemplateComponent = {
      type: 'BODY',
      text: formValue.bodyText
    };
    
    // Add example values for named parameters
    if (this.detectedParameters.length > 0) {
      const namedParams: NamedParameter[] = this.parameterExamples.value;
      bodyComponent.example = {
        body_text_named_params: namedParams
      };
    }
    
    components.push(bodyComponent);
    
    // Add footer
    if (formValue.hasFooter) {
      components.push({
        type: 'FOOTER',
        text: formValue.footerText
      });
    }
    
    // Add buttons
    if (formValue.hasButtons && formValue.buttons.length > 0) {
      components.push({
        type: 'BUTTONS',
        buttons: formValue.buttons
      });
    }
    
    const templateData: WhatsAppTemplate = {
      id: this.currentTemplateId || undefined,
      name: formValue.name,
      language: formValue.language,
      category: formValue.category,
      components
    };
    
    // Add parameter_format if named parameters are used
    if (this.detectedParameters.length > 0) {
      templateData.parameter_format = 'named';
    }
    
    return templateData;
  }
  
  updatePreview(): void {
    if (this.templateForm.valid || this.templateForm.get('bodyText')?.value) {
      this.previewTemplate = this.buildTemplateData();
    } else {
      this.previewTemplate = null;
    }
  }
  
  getStatusSeverity(status: string): any {
    const severityMap: { [key: string]: string } = {
      'APPROVED': 'success',
      'PENDING': 'warning',
      'REJECTED': 'danger',
      'DISABLED': 'secondary'
    };
    return severityMap[status] || 'info';
  }
  
  filterTemplates(event: any): void {
    const searchTerm = event.target.value.toLowerCase();
    if (!searchTerm) {
      this.filteredTemplates = [...this.templates];
    } else {
      this.filteredTemplates = this.templates.filter(template =>
        template.name.toLowerCase().includes(searchTerm) ||
        template.category.toLowerCase().includes(searchTerm) ||
        template.status?.toLowerCase().includes(searchTerm)
      );
    }
  }
  
  getVariableCount(text: string): number {
    if (!text) return 0;
    
    // Count both named and numbered parameters
    const namedMatches = text.match(/\{\{[a-zA-Z_][a-zA-Z0-9_]*\}\}/g);
    const numberedMatches = text.match(/\{\{\d+\}\}/g);
    
    return (namedMatches?.length || 0) + (numberedMatches?.length || 0);
  }
  
  getComponentIcon(type: string): string {
    const iconMap: { [key: string]: string } = {
      'HEADER': 'pi-align-justify',
      'BODY': 'pi-file-edit',
      'FOOTER': 'pi-minus',
      'BUTTONS': 'pi-th-large'
    };
    return iconMap[type] || 'pi-file';
  }
  
  getAcceptType(format: string): string {
    const acceptMap: { [key: string]: string } = {
      'IMAGE': 'image/*',
      'VIDEO': 'video/*',
      'DOCUMENT': '.pdf,.doc,.docx'
    };
    return acceptMap[format] || '*/*';
  }
  
  getTemplateBodyText(template: any): string {
    const bodyComponent = template.components.find((c: any) => c.type === 'BODY');
    return bodyComponent?.text || '';
  }
  
  getButtonFormGroup(control: any): FormGroup {
    return control as FormGroup;
  }
}