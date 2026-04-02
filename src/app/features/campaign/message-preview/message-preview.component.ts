import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, EventEmitter, Input, Output } from '@angular/core';
import { CardModule } from 'primeng/card';
import { SafeUrlPipe } from '../../../shared/pipes/safe-url.pipe';
import { TooltipModule } from 'primeng/tooltip';

export interface LocationData {
  name?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
}

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
  _locationData: LocationData | null = null;

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

  /**
   * Optional: pass location data from parent for LOCATION header type.
   * Shape: { name?: string, address?: string, latitude?: number, longitude?: number }
   */
  @Input()
  set location_data(value: LocationData | any) {
    if (typeof value === 'string') {
      try {
        this._locationData = JSON.parse(value);
      } catch {
        this._locationData = null;
      }
    } else {
      this._locationData = value ?? null;
    }
  }

  get locationData(): LocationData | null {
    return this._locationData;
  }

  /** Derive header format from selected template */
  get headerFormat(): string | null {
    if (!this._selectedTemplateForPreview?.components) return null;
    const header = this._selectedTemplateForPreview.components.find(
      (c: any) => c.type === 'HEADER'
    );
    return header?.format ?? null;
  }

  

}
