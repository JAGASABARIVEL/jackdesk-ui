import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, EventEmitter, Input, Output } from '@angular/core';
import { CardModule } from 'primeng/card';
import { SafeUrlPipe } from '../../../shared/pipes/safe-url.pipe';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'app-message-preview',
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    TooltipModule,

    SafeUrlPipe
  ],
  templateUrl: './message-preview.component.html',
  styleUrl: './message-preview.component.scss'
})
export class MessagePreviewComponent implements AfterViewInit {

  _selectedTemplateForPreview;
  _media_url;

  @Output() previewReady: EventEmitter<boolean> = new EventEmitter();

  ngAfterViewInit(): void {
    this.previewReady.emit(true);
  }

  @Input() messageDetails = null;


  @Input()
set selectedTemplateForPreview(value: any) {  
  if (typeof value === 'string') {
    try {
      const onceParsed = JSON.parse(value);
      // Check if it’s still a string (i.e. double-stringified JSON)
      if (typeof onceParsed === 'string') {
        const twiceParsed = JSON.parse(onceParsed);
        this._selectedTemplateForPreview = twiceParsed;
      } else {
        this._selectedTemplateForPreview = onceParsed;
      }
    } catch (e) {
      this._selectedTemplateForPreview = value;
    }
  } else {
    this._selectedTemplateForPreview = value;
    
  }
}

@Input()
set media_url(value: any) {
  this._media_url = value;
}

get mediaPreviewUrl(): string {
  return this._media_url;
}

  
    get selectedTemplateForPreview(): any {
      
      return this._selectedTemplateForPreview;
    }

    getCurrentTime(): string {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

}
