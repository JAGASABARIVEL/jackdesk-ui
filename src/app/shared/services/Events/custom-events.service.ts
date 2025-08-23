import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CUstomEventService {
    private eventSubject = new Subject<any>();
    private eventAssignmentSubject = new Subject<any>();
    private eventNewConversationSubject = new Subject<any>();
    private eventCloseConversationSubject = new Subject<any>();
    private eventSentMessageConversationSubject = new Subject<any>();
    private eventNewConversationCountSubject = new Subject<any>();
    private eventLoginSuccessSubject = new Subject<any>();


    event$ = this.eventSubject.asObservable();
    assignmentEvent$ = this.eventAssignmentSubject.asObservable();
    newConversationEvent$ = this.eventNewConversationSubject.asObservable();
    closeConversationEvent$ = this.eventCloseConversationSubject.asObservable();
    sentMessageConversation$ = this.eventSentMessageConversationSubject.asObservable();
    newConversationCount$ = this.eventNewConversationCountSubject.asObservable();
    loginSuccessNotification$ = this.eventLoginSuccessSubject.asObservable();



    emitEvent(message: any) {
        this.eventSubject.next(message);
    }

    emitAssignmentChange(message: any) {
      this.eventAssignmentSubject.next(message);
    }

    emitNewConversation(message: any) {
      this.eventNewConversationSubject.next(message);
    }

    emitCloseConversation(message: any) {
      this.eventCloseConversationSubject.next(message);
    }

    emitSentMessageConversation(message: any) {
      this.eventSentMessageConversationSubject.next(message);
    }

    emitNewConversationCount(message: any) {
      this.eventNewConversationCountSubject.next(message);
    }

    emitLoginSuccessNotification(message: any) {
      this.eventLoginSuccessSubject.next(message);
    }
}