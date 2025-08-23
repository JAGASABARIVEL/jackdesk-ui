import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';


@Component({
  selector: 'app-additional-detail-chat-window',
  imports: [
    CommonModule,

    AvatarModule,
    ButtonModule,
  ],
  templateUrl: './additional-detail-chat-window.component.html',
  styleUrl: './additional-detail-chat-window.component.scss'
})
export class AdditionalDetailChatWindowComponent {

  _selectedConversation: any;
  

  @Input() set selectedConversation(value) {
    this._selectedConversation = value;
  }

  @Output() changeContactInSelectedConversationObject: EventEmitter<any> = new EventEmitter();

  get selectedConversation() {
    return this._selectedConversation;
  }

  onEdit() {
    this.changeContactInSelectedConversationObject.emit(this.selectedConversation);
  }

  




}
