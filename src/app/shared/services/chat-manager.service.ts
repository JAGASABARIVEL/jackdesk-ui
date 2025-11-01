import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HOST } from '../../../environment'

@Injectable({
  providedIn: 'root'
})
export class ChatManagerService {


  conversations_url = `${HOST}/conversations/`;
  non_chat_conversations_uri = `conversation/`;

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

  list_notification(base_url_type='chat') {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.auth_token}`);
    return this.http.get(`${this.conversations_url}${this.notification_uri}`, { headers });
  }

  list_all_conversations(
  base_url_type="chat",
  is_user_specific: boolean = false,
  statusFilter: string = 'all',
  page: number = 1,
  pageSize: number = 10,
  search = "",
  ordering?
): Observable<any> {
  const headers = new HttpHeaders().set('Authorization', `Bearer ${this.auth_token}`);

  const params: any = {
    status: statusFilter,
    page: page,
    page_size: pageSize,
    search: search
  };
  if (ordering) params.ordering = ordering;
  if (is_user_specific) {
    params.is_user_specific = "true";
  }
  
  if (base_url_type !== "chat") {
    return this.http.get(`${this.conversations_url}${this.non_chat_conversations_uri}`, { headers, params });
  }

  return this.http.get(`${this.conversations_url}`, { headers, params });
}


  list_conversation_from_id(base_url_type="chat", conversationId): Observable<any> {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.auth_token}`);
    if (base_url_type !== "chat") {
      return this.http.get(`${this.conversations_url}${this.non_chat_conversations_uri}${conversationId}/`, { headers });      
    
  }
    return this.http.get(`${this.conversations_url}${conversationId}/`, { headers });
  }

  list_new_conversations(base_url_type="chat", page: number = 1,
  pageSize: number = 1000, search='', ordering?): Observable<any> {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.auth_token}`);
    const params: any = {
    page: page,
    page_size: pageSize,
    search: search
  };
  if (ordering) params.ordering = ordering;
  if (base_url_type !== "chat") {
    return this.http.get(`${this.conversations_url}${this.non_chat_conversations_uri}${this.new_conversation_uri}`, { headers, params });
    
  }
    return this.http.get(`${this.conversations_url}${this.new_conversation_uri}`, { headers, params });
  }

  list_active_conversations(base_url_type="chat", is_user_specific:boolean=false,
    page: number = 1,
    pageSize: number = 1000, search='', ordering?): Observable<any> {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.auth_token}`);
    const params: any = {
    page: page,
    page_size: pageSize,
    search: search,
  };
  if (ordering) params.ordering = ordering;
  if (base_url_type !== "chat") {
    return this.http.get(`${this.conversations_url}${this.non_chat_conversations_uri}${this.active_conversation_uri}`, { headers, params });
    
  }
    return this.http.get(`${this.conversations_url}${this.active_conversation_uri}`, { headers, params });
  }

  list_new_active_conversations(base_url_type="chat"): Observable<any> {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.auth_token}`);
    if (base_url_type !== "chat") {
      return this.http.get(`${this.conversations_url}${this.non_chat_conversations_uri}${this.active_conversation_for_org_uri}`, { headers });
    
  }
    return this.http.get(`${this.conversations_url}${this.active_conversation_for_org_uri}`, { headers });
  }

  list_active_coversations_for_user(base_url_type="chat"): Observable<any> {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.auth_token}`);
    if (base_url_type !== "chat") {
      return this.http.get(`${this.conversations_url}${this.non_chat_conversations_uri}${this.active_conversation_for_user_uri}`, { headers });
    
  }
    return this.http.get(`${this.conversations_url}${this.active_conversation_for_user_uri}`, { headers });
  }

  list_all_coversations_for_user(base_url_type="chat"): Observable<any> {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.auth_token}`);
    if (base_url_type !== "chat") {
      return this.http.get(`${this.conversations_url}${this.non_chat_conversations_uri}${this.all_conversation_for_user_uri}`, { headers });
    
  }
    return this.http.get(`${this.conversations_url}${this.all_conversation_for_user_uri}`, { headers });
  }

  list_historical_conversations_for_contact(base_url_type="chat", contactId): Observable<any> {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.auth_token}`);
    if (base_url_type !== "chat") {
      return this.http.get(`${this.conversations_url}${this.non_chat_conversations_uri}${this.history_by_contact_uri}?contact_id=${contactId}`, { headers });
    
  }
    return this.http.get(`${this.conversations_url}${this.history_by_contact_uri}?contact_id=${contactId}`, { headers });
  }

  assign_conversation(base_url_type="chat", conversationId, assigneeId): Observable<any> {
    let payload = {"id": assigneeId}
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.auth_token}`);
    if (base_url_type !== "chat") {
      return this.http.post(`${this.conversations_url}${this.non_chat_conversations_uri}${conversationId}${this.assign_conversation_uri}`, payload=payload, { headers });
    
  }
    return this.http.post(`${this.conversations_url}${conversationId}${this.assign_conversation_uri}`, payload=payload, { headers });
  }

  close_conversation(base_url_type="chat", conversationId, payload): Observable<any> {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.auth_token}`);
    if (base_url_type !== "chat") {
      return this.http.post(`${this.conversations_url}${this.non_chat_conversations_uri}${conversationId}${this.close_conversation_uri}`, payload=payload, { headers });
    
  }
    return this.http.post(`${this.conversations_url}${conversationId}${this.close_conversation_uri}`, payload=payload, { headers });
  }

  respond_to_message(base_url_type="chat", conversationId: number, payload: any): Observable<any> {
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

  start_new_conversation(base_url_type="chat", payload): Observable<any> {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.auth_token}`);
    if (base_url_type !== "chat") {
      return this.http.post(`${this.conversations_url}${this.non_chat_conversations_uri}${this.start_new_conversation_uri}`, payload=payload, { headers });
    
  }
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
