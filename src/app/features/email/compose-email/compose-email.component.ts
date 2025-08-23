import { Component, EventEmitter, Output } from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { EditorModule } from 'primeng/editor';

@Component({
  selector: 'app-compose-email',
  standalone: true,
  imports: [DialogModule, FormsModule, InputTextModule, ButtonModule, EditorModule],
  templateUrl: './compose-email.component.html',
})
export class ComposeEmailComponent {
  visible = false;
  to = '';
  subject = '';
  body = '';
  @Output() emailSent = new EventEmitter<any>();

  show() {
    this.visible = true;
  }

  onClose() {
    this.visible = false;
    this.to = '';
    this.subject = '';
    this.body = '';
  }

  sendEmail() {
    const email = { to: this.to, subject: this.subject, body: this.body };
    this.emailSent.emit(email);
    this.onClose();
  }
}
