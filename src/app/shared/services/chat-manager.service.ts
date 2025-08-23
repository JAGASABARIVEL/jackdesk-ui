import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HOST } from '../../../environment'

@Injectable({
  providedIn: 'root'
})
export class ChatManagerService {

  conversations_url = `${HOST}/conversations/`;
  new_conversation_uri = "?status=new"
  active_conversation_uri = "?status=active"
  active_conversation_for_user_uri = "active_conversation_for_user/"
  all_conversation_for_user_uri = "all_conversation_for_user"
  history_by_contact_uri = "history_by_contact"
  active_conversation_for_org_uri = "active_conversation_for_org/"

  assign_conversation_uri = "/assign_conversation/"
  close_conversation_uri = "/close_conversation/"
  respond_to_message_uri = "/respond_to_message/"
  start_new_conversation_uri = "new_conversation/"
  notification_uri = "notification"

  profile;
  auth_token;

  constructor(private http: HttpClient) {
    this.profile = JSON.parse(localStorage.getItem("profile"));
    if (this.profile) {
      this.auth_token = this.profile["access"]
    }
    else {
      console.error("Profile is empty - chat service");
    }
  }

  list_notification() {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.auth_token}`);
    return this.http.get(`${this.conversations_url}${this.notification_uri}`, { headers });
  }

  list_all_conversations(is_user_specific=false): Observable<any> {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.auth_token}`);
    return this.http.get(`${this.conversations_url}?is_user_specific=${is_user_specific}`, { headers });
  }

  list_conversation_from_id(conversationId): Observable<any> {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.auth_token}`);
    return this.http.get(`${this.conversations_url}${conversationId}/`, { headers });
  }

  list_new_conversations(): Observable<any> {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.auth_token}`);
    return this.http.get(`${this.conversations_url}${this.new_conversation_uri}`, { headers });
  }

  list_active_conversations(is_user_specific=false): Observable<any> {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.auth_token}`);
    return this.http.get(`${this.conversations_url}${this.active_conversation_uri}&is_user_specific=${is_user_specific}`, { headers });
  }

  list_new_active_conversations(): Observable<any> {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.auth_token}`);
    return this.http.get(`${this.conversations_url}${this.active_conversation_for_org_uri}`, { headers });
  }

  list_active_coversations_for_user(): Observable<any> {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.auth_token}`);
    return this.http.get(`${this.conversations_url}${this.active_conversation_for_user_uri}`, { headers });
  }

  list_all_coversations_for_user(): Observable<any> {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.auth_token}`);
    return this.http.get(`${this.conversations_url}${this.all_conversation_for_user_uri}`, { headers });
  }

  list_historical_conversations_for_contact(contactId): Observable<any> {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.auth_token}`);
    return this.http.get(`${this.conversations_url}${this.history_by_contact_uri}?contact_id=${contactId}`, { headers });
  }

  assign_conversation(conversationId, assigneeId): Observable<any> {
    let payload = {"id": assigneeId}
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.auth_token}`);
    return this.http.post(`${this.conversations_url}${conversationId}${this.assign_conversation_uri}`, payload=payload, { headers });
  }

  close_conversation(conversationId, payload): Observable<any> {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.auth_token}`);
    return this.http.post(`${this.conversations_url}${conversationId}${this.close_conversation_uri}`, payload=payload, { headers });
  }

  respond_to_message(conversationId: number, payload: any): Observable<any> {
    const url = `${this.conversations_url}${conversationId}${this.respond_to_message_uri}`;
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.auth_token}`);
  
    if (payload.message_type === 'media') {
      const formData = new FormData();
      formData.append('message_body', payload.message_body);
      formData.append('message_type', payload.message_type);
      formData.append('file', payload.file);
  
      // Don't manually set Content-Type for FormData; let the browser handle it
      return this.http.post(url, formData, { headers });
    } else {
      // For JSON requests, add appropriate content type
      const jsonHeaders = headers.set('Content-Type', 'application/json');
      return this.http.post(url, payload=payload, { headers: jsonHeaders });
    }
  }

  start_new_conversation(payload): Observable<any> {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.auth_token}`);
    return this.http.post(`${this.conversations_url}${this.start_new_conversation_uri}`, payload=payload, { headers });
  }

  // +++++++++++++++ Metrics +++++++++++++++++
  stats_uri = 'stats';
  employee_metrics_uri = 'metrics/employee'
  org_metrics_uri = 'metrics/org'

  stats(period: any, startDate: any, endDate: any) {
    let params = new HttpParams().set('filter', period).set('start_date', startDate).set('end_date', endDate);
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.auth_token}`);
    return this.http.get(`${this.conversations_url}${this.stats_uri}`, { params, headers });
  }

  employee_metrics(period: any, startDate: any, endDate: any, userId: any=null) {
    let params = new HttpParams().set('period', period).set('start_date', startDate).set('end_date', endDate);
    if (userId !== null) {
      params = params.set('user_id', userId);
    }
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.auth_token}`);
    return this.http.get(`${this.conversations_url}${this.employee_metrics_uri}`, { params, headers });
  }

  org_metrics(period: any, startDate: any, endDate: any) {
    let params = new HttpParams().set('period', period).set('start_date', startDate).set('end_date', endDate);
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.auth_token}`);
    return this.http.get(`${this.conversations_url}${this.org_metrics_uri}`, { params, headers });
  }

  // ++++++ Cost Report  ++
  usage_cost_uri = 'cost-report';
  usage_cost(from_date: any, to_date: any) {
    const headers = new HttpHeaders({'Authorization': `Bearer ${this.auth_token}`});
    const params = new HttpParams().set('from_date', from_date).set('to_date', to_date);
    return this.http.get(`${this.conversations_url}${this.usage_cost_uri}`, { headers, params });
  }
}
