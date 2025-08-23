import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Email, MailFolder } from '../models/mailbox.model';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class MailboxService {
  private folders: MailFolder[] = [
    { label: 'Inbox', icon: 'pi pi-inbox' },
    { label: 'Sent', icon: 'pi pi-send' },
    { label: 'Drafts', icon: 'pi pi-pencil' },
    { label: 'Spam', icon: 'pi pi-exclamation-triangle' },
    { label: 'Trash', icon: 'pi pi-trash' }
  ];

  private emails = new BehaviorSubject<Email[]>([]);
  private selectedEmail = new BehaviorSubject<Email | null>(null);
  private selectedFolder = new BehaviorSubject<MailFolder>(this.folders[0]);

  constructor(private http: HttpClient) {}

  getFolders() {
    return this.folders;
  }

  getEmails() {
    return this.emails.asObservable();
  }

  getSelectedEmail() {
    return this.selectedEmail.asObservable();
  }

  getSelectedFolder() {
    return this.selectedFolder.asObservable();
  }

  loadEmailsForFolder(folder: MailFolder) {
    this.selectedFolder.next(folder);
    // Replace with real backend call
    this.emails.next([
      { id: '1', sender: 'john@example.com', subject: 'Hi!', email_date: new Date(), body: 'Hello John', replies: [] },
      { id: '2', sender: 'alice@example.com', subject: 'Invoice', email_date: new Date(), body: 'Please check attached.', replies: [

         { id: '2', sender: 'alice@example.com', subject: 'Invoice', email_date: new Date(), body: 'Please check attached.', replies: []},
          { id: '2', sender: 'alice@example.com', subject: 'Invoice', email_date: new Date(), body: 'Please check attached.', replies: []},
           { id: '2', sender: 'alice@example.com', subject: 'Invoice', email_date: new Date(), body: 'Please check attached.', replies: []},
            { id: '2', sender: 'alice@example.com', subject: 'Invoice', email_date: new Date(), body: 'Please check attached.', replies: []},
             { id: '2', sender: 'alice@example.com', subject: 'Invoice', email_date: new Date(), body: 'Please check attached.', replies: []},
              { id: '2', sender: 'alice@example.com', subject: 'Invoice', email_date: new Date(), body: 'Please check attached.', replies: []},
               { id: '2', sender: 'alice@example.com', subject: 'Invoice', email_date: new Date(), body: 'Please check attached.', replies: []},
                { id: '2', sender: 'alice@example.com', subject: 'Invoice', email_date: new Date(), body: 'Please check attached.', replies: []},
                { id: '2', sender: 'alice@example.com', subject: 'Invoice', email_date: new Date(), body: 'Please check attached.', replies: []},
          { id: '2', sender: 'alice@example.com', subject: 'Invoice', email_date: new Date(), body: 'Please check attached.', replies: []},
           { id: '2', sender: 'alice@example.com', subject: 'Invoice', email_date: new Date(), body: 'Please check attached.', replies: []},
            { id: '2', sender: 'alice@example.com', subject: 'Invoice', email_date: new Date(), body: 'Please check attached.', replies: []},
             { id: '2', sender: 'alice@example.com', subject: 'Invoice', email_date: new Date(), body: 'Please check attached.', replies: []},
              { id: '2', sender: 'alice@example.com', subject: 'Invoice', email_date: new Date(), body: 'Please check attached.', replies: []},
               { id: '2', sender: 'alice@example.com', subject: 'Invoice', email_date: new Date(), body: 'Please check attached.', replies: []},
                { id: '2', sender: 'alice@example.com', subject: 'Invoice', email_date: new Date(), body: 'Please check attached.', replies: []}


      ] },
      { id: '1', sender: 'john@example.com', subject: 'Hi!', email_date: new Date(), body: 'Hello John', replies: [] },
      { id: '2', sender: 'alice@example.com', subject: 'Invoice', email_date: new Date(), body: 'Please check attached.', replies: [] },
      { id: '1', sender: 'john@example.com', subject: 'Hi!', email_date: new Date(), body: 'Hello John', replies: [] },
      { id: '2', sender: 'alice@example.com', subject: 'Invoice', email_date: new Date(), body: 'Please check attached.', replies: [] },
      { id: '1', sender: 'john@example.com', subject: 'Hi!', email_date: new Date(), body: 'Hello John', replies: [] },
      { id: '2', sender: 'alice@example.com', subject: 'Invoice', email_date: new Date(), body: 'Please check attached.', replies: [] },
      { id: '1', sender: 'john@example.com', subject: 'Hi!', email_date: new Date(), body: 'Hello John', replies: [] },
      { id: '2', sender: 'alice@example.com', subject: 'Invoice', email_date: new Date(), body: 'Please check attached.', replies: [] }
    ]);
  }

  selectEmail(email: Email) {
    this.selectedEmail.next(email);
  }

  loadEmailsFromBackend(folder: string) {
  return this.http.get(`/api/emails?folder=${folder}`);
}

sendEmail(email: { to: string; subject: string; body: string }) {
  return this.http.post('/api/emails/send', email);
}
}
