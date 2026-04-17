import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HOST } from '../../../environment'

// ✅ NEW: Interface for updating conversation CC
export interface UpdateConversationCCPayload {
    conversation_id: number;
    agent_cc_recipients: string[];
}

@Injectable({
  providedIn: 'root'
})
export class ChatManagerService {


  conversations_url = `${HOST}/conversations/`;
  calls_url = `${HOST}/calls/`
  non_chat_conversations_uri = `conversation/`;
  chat_uri = `chat/`;

  new_conversation_uri = "?status=new"
  active_conversation_uri = "?statuses=zombie,active"
  active_conversation_for_user_uri = "active_conversation_for_user/"
  all_conversation_for_user_uri = "all_conversation_for_user"
  history_by_contact_uri = "history_by_contact"
  active_conversation_for_org_uri = "active_conversation_for_org/"

  assign_conversation_uri = "/assign_conversation/"
  close_conversation_uri = "/close_conversation/"
  respond_to_message_uri = "/respond_to_message_v2/"
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

  //list_notification(base_url_type='chat') {
  //  const headers = new HttpHeaders().set('Authorization', `Bearer ${this.auth_token}`);
  //  return this.http.get(`${this.conversations_url}${this.notification_uri}`, { headers });
  //}
  list_notification(base_url_type = 'chat', page: number = 1, pageSize: number = 20): Observable<any> {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.auth_token}`);
    const params = { page: page.toString(), page_size: pageSize.toString() };
    return this.http.get(`${this.conversations_url}${this.notification_uri}`, { headers, params });
}

  // ✅ NEW: Update agent's CC recipients for a conversation
    updateConversationCC(payload: UpdateConversationCCPayload): Observable<any> {
        return this.http.patch(
            `${this.conversations_url}${this.non_chat_conversations_uri}${payload.conversation_id}/update_cc/`,
            { agent_cc_recipients: payload.agent_cc_recipients }
        );
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

  return this.http.get(`${this.conversations_url}${this.chat_uri}`, { headers, params });
}


  list_conversation_from_id(base_url_type="chat", conversationId): Observable<any> {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.auth_token}`);
    if (base_url_type !== "chat") {
      return this.http.get(`${this.conversations_url}${this.non_chat_conversations_uri}${conversationId}/`, { headers });      
    
  }
    return this.http.get(`${this.conversations_url}${this.chat_uri}${conversationId}/`, { headers });
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
    return this.http.get(`${this.conversations_url}${this.chat_uri}${this.new_conversation_uri}`, { headers, params });
  }

  list_active_conversations(base_url_type="chat", is_user_specific:boolean=false,
    page: number = 1,
    pageSize: number = 1000, search='', ordering?): Observable<any> {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.auth_token}`);
    let params: any;
    if (is_user_specific === true) {
        params = {
        page: page,
        page_size: pageSize,
        is_user_specific: 'true',
        search: search,
      }
    }
    else {
      params = {
        page: page,
        page_size: pageSize,
        search: search,
      }
    }
  if (ordering) params.ordering = ordering;
  if (base_url_type !== "chat") {
    return this.http.get(`${this.conversations_url}${this.non_chat_conversations_uri}${this.active_conversation_uri}`, { headers, params });
    
  }
    return this.http.get(`${this.conversations_url}${this.chat_uri}${this.active_conversation_uri}`, { headers, params });
  }

  list_new_active_conversations(base_url_type="chat", page: number = 1, pageSize: number = 1000, search='', ordering?): Observable<any> {
    const params: any = {
    page: page,
    page_size: pageSize,
    search: search
  };
  if (ordering) params.ordering = ordering;
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.auth_token}`);
    if (base_url_type !== "chat") {
      return this.http.get(`${this.conversations_url}${this.non_chat_conversations_uri}${this.active_conversation_for_org_uri}`, { headers, params });
    
  }
    return this.http.get(`${this.conversations_url}${this.chat_uri}${this.active_conversation_for_org_uri}`, { headers, params });
  }

  list_active_coversations_for_user(base_url_type="chat", page: number = 1, pageSize: number = 1000, search='', ordering?): Observable<any> {
    const params: any = {
    page: page,
    page_size: pageSize,
    search: search
  };
  if (ordering) params.ordering = ordering;
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.auth_token}`);
    if (base_url_type !== "chat") {
      return this.http.get(`${this.conversations_url}${this.non_chat_conversations_uri}${this.active_conversation_for_user_uri}`, { headers, params });
    
  }
    return this.http.get(`${this.conversations_url}${this.chat_uri}${this.active_conversation_for_user_uri}`, { headers, params });
  }

  list_all_coversations_for_user(base_url_type="chat"): Observable<any> {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.auth_token}`);
    if (base_url_type !== "chat") {
      return this.http.get(`${this.conversations_url}${this.non_chat_conversations_uri}${this.all_conversation_for_user_uri}`, { headers });
    
  }
    return this.http.get(`${this.conversations_url}${this.chat_uri}${this.all_conversation_for_user_uri}`, { headers });
  }

  list_historical_conversations_for_contact(base_url_type="chat", contactId): Observable<any> {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.auth_token}`);
    if (base_url_type !== "chat") {
      return this.http.get(`${this.conversations_url}${this.non_chat_conversations_uri}${this.history_by_contact_uri}?contact_id=${contactId}`, { headers });
    
  }
    return this.http.get(`${this.conversations_url}${this.chat_uri}${this.history_by_contact_uri}?contact_id=${contactId}`, { headers });
  }

  assign_conversation(base_url_type="chat", conversationId, assigneeId): Observable<any> {
    let payload = {"id": assigneeId}
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.auth_token}`);
    if (base_url_type !== "chat") {
      return this.http.post(`${this.conversations_url}${this.non_chat_conversations_uri}${conversationId}${this.assign_conversation_uri}`, payload=payload, { headers });
    
  }
    return this.http.post(`${this.conversations_url}${this.chat_uri}${conversationId}${this.assign_conversation_uri}`, payload=payload, { headers });
  }

  close_conversation(base_url_type="chat", conversationId, payload): Observable<any> {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.auth_token}`);
    if (base_url_type !== "chat") {
      return this.http.post(`${this.conversations_url}${this.non_chat_conversations_uri}${conversationId}${this.close_conversation_uri}`, payload=payload, { headers });
    
  }
    return this.http.post(`${this.conversations_url}${this.chat_uri}${conversationId}${this.close_conversation_uri}`, payload=payload, { headers });
  }

  //respond_to_message(base_url_type="chat", conversationId: number, payload: any): Observable<any> {
  //  const url = `${this.conversations_url}${this.chat_uri}${conversationId}${this.respond_to_message_uri}`;
  //  const headers = new HttpHeaders().set('Authorization', `Bearer ${this.auth_token}`);
  //
  //  if (payload.message_type === 'media') {
  //    const formData = new FormData();
  //    formData.append('message_body', payload.message_body);
  //    formData.append('message_type', payload.message_type);
  //    formData.append('file', payload.file);
  //
  //    // Don't manually set Content-Type for FormData; let the browser handle it
  //    return this.http.post(url, formData, { headers });
  //  } else {
  //    // For JSON requests, add appropriate content type
  //    const jsonHeaders = headers.set('Content-Type', 'application/json');
  //    return this.http.post(url, payload=payload, { headers: jsonHeaders });
  //  }
  //}

  respond_to_message(base_url_type="chat", conversationId: number, payload: any): Observable<any> {
  const url = `${this.conversations_url}${this.chat_uri}${conversationId}${this.respond_to_message_uri}`;
  const headers = new HttpHeaders().set('Authorization', `Bearer ${this.auth_token}`);

  if (payload.message_type === 'media') {
    const formData = new FormData();
    formData.append('message_body', payload.message_body);
    formData.append('message_type', payload.message_type);
    formData.append('file', payload.file);
    return this.http.post(url, formData, { headers });
  }

  // ✅ Detect FormData properly
  else if (payload.message_type !== 'media' && payload instanceof FormData) {
    return this.http.post(url, payload, { headers });
  }

  else {
    // JSON fallback
    const jsonHeaders = headers.set('Content-Type', 'application/json');
    return this.http.post(url, payload, { headers: jsonHeaders });
  }
}

  start_new_conversation(base_url_type="chat", payload): Observable<any> {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.auth_token}`);
    if (base_url_type !== "chat") {
      return this.http.post(`${this.conversations_url}${this.non_chat_conversations_uri}${this.start_new_conversation_uri}`, payload=payload, { headers });
    
  }
    return this.http.post(`${this.conversations_url}${this.chat_uri}${this.start_new_conversation_uri}`, payload=payload, { headers });
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


  // NEW ENDPOINTS
  tickets_url = `${HOST}/conversations/tickets/`;


  // ✅ IMPROVED: Better conversation list with enhanced data
  list_conversations_enhanced(
    base_url_type = "chat",
    filters?: {
      status?: string;
      priority?: string;
      assigned_to_me?: boolean;
      date_range?: string;
      search?: string;
      page?: number;
      page_size?: number;
    }
  ): Observable<any> {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.auth_token}`);
    let params = new HttpParams();
    
    if (filters) {
      if (filters.status) params = params.set('status', filters.status);
      if (filters.priority) params = params.set('priority', filters.priority);
      if (filters.assigned_to_me) params = params.set('assigned_to_me', 'true');
      if (filters.date_range) params = params.set('date_range', filters.date_range);
      if (filters.search) params = params.set('search', filters.search);
      if (filters.page) params = params.set('page', filters.page.toString());
      if (filters.page_size) params = params.set('page_size', filters.page_size.toString());
    }
    
    if (base_url_type !== "chat") {
      return this.http.get(
        `${this.conversations_url}${this.non_chat_conversations_uri}`,
        { headers, params }
      );
    }
    
    return this.http.get(`${this.conversations_url}${this.chat_uri}`, { headers, params });
  }

  /**
   * Enhanced Ticketing Methods
   */
  
  // List tickets with advanced filtering
  list_tickets(params: any = {}): Observable<any> {
    let httpParams = new HttpParams();
    Object.keys(params).forEach(key => {
      if (params[key]) {
        httpParams = httpParams.set(key, params[key]);
      }
    });
    
    return this.http.get<any>(`${this.tickets_url}`, { params: httpParams });
  }

  // Get single ticket detail with messages
  get_ticket_detail(ticketId: number): Observable<any> {
    return this.http.get<any>(`${this.tickets_url}${ticketId}/`);
  }
  
  // Get ticket summary statistics
  get_ticket_summary(): Observable<any> {
    return this.http.get<any>(`${this.tickets_url}ticket_summary/`);
  }
  
  // Update ticket priority
  update_ticket_priority(ticketId: number, priority: string): Observable<any> {
    return this.http.patch<any>(
      `${this.tickets_url}${ticketId}/update_priority/`,
      { priority }
    );
  }
  
  // Add internal note to ticket
  add_internal_note(ticketId: number, note: string): Observable<any> {
    return this.http.post<any>(
      `${this.tickets_url}${ticketId}/add_internal_note/`,
      { note }
    );
  }
  
  // Assign ticket to agent
  assign_ticket(ticketId: number, userId: number): Observable<any> {
    return this.http.patch<any>(
      `${this.tickets_url}${ticketId}/`,
      { assigned_user: userId }
    );
  }
  
  // Update ticket status
  update_ticket_status(ticketId: number, status: string): Observable<any> {
    return this.http.patch<any>(
      `${this.tickets_url}${ticketId}/`,
      { status }
    );
  }
  
  /**
   * Enhanced Metrics Methods
   */
  
  enhanced_metrics_url = `${HOST}/conversations/metrics/enhanced`;
  customer_effort_url = `${HOST}/conversations/metrics/customer-effort`;
  // Get comprehensive enhanced metrics
  getEnhancedMetrics(startDate: string, endDate: string): Observable<any> {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.auth_token}`);
    let params = new HttpParams();
    
    if (startDate) params = params.set('start_date', startDate);
    if (endDate) params = params.set('end_date', endDate);
    
    return this.http.get(this.enhanced_metrics_url, { headers, params });
  }
  
  // Get customer effort score
  getCustomerEffortScore(): Observable<any> {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.auth_token}`);
    return this.http.get(this.customer_effort_url, { headers });
  }

  

  
  // Get real-time dashboard metrics (with caching)
  getDashboardMetrics(dateRange?: string): Observable<any> {
    let params = new HttpParams();
    if (dateRange) {
      params = params.set('date_range', dateRange);
    }
    
    return this.http.get<any>(`${this.conversations_url}${this.non_chat_conversations_uri}dashboard/metrics`, { params });
  }
  
  /**
   * Agent Performance Methods
   */
  
  // Get detailed agent performance
  getAgentPerformance(agentId: number, startDate: string, endDate: string): Observable<any> {
    const params = new HttpParams()
      .set('start_date', startDate)
      .set('end_date', endDate);
    
    return this.http.get<any>(
      `${this.conversations_url}${this.non_chat_conversations_uri}metrics/agent/${agentId}/performance`,
      { params }
    );
  }
  
  // Get agent leaderboard
  getAgentLeaderboard(metric: string = 'close_rate'): Observable<any> {
    const params = new HttpParams().set('metric', metric);
    return this.http.get<any>(`${this.conversations_url}${this.non_chat_conversations_uri}metrics/leaderboard`, { params });
  }
  
  /**
   * Ticket Operations
   */
  
  // Bulk assign tickets
  bulkAssignTickets(ticketIds: number[], userId: number): Observable<any> {
    return this.http.post<any>(`${this.tickets_url}bulk_assign/`, {
      ticket_ids: ticketIds,
      user_id: userId
    });
  }
  
  // Bulk update ticket status
  bulkUpdateStatus(ticketIds: number[], status: string): Observable<any> {
    return this.http.post<any>(`${this.tickets_url}bulk_update_status/`, {
      ticket_ids: ticketIds,
      status: status
    });
  }
  
  // Bulk update ticket priority
  bulkUpdatePriority(ticketIds: number[], priority: string): Observable<any> {
    return this.http.post<any>(`${this.tickets_url}bulk_update_priority/`, {
      ticket_ids: ticketIds,
      priority: priority
    });
  }
  
  /**
   * Export Methods
   */
  
  // Export tickets to CSV
  exportTickets(params: any = {}): Observable<Blob> {
    let httpParams = new HttpParams();
    Object.keys(params).forEach(key => {
      if (params[key]) {
        httpParams = httpParams.set(key, params[key]);
      }
    });
    
    return this.http.get(`${this.tickets_url}export/`, {
      params: httpParams,
      responseType: 'blob'
    });
  }
  
  // Export metrics report
  exportMetricsReport(startDate: string, endDate: string, format: string = 'pdf'): Observable<Blob> {
    const params = new HttpParams()
      .set('start_date', startDate)
      .set('end_date', endDate)
      .set('format', format);
    
    return this.http.get(`${this.conversations_url}${this.non_chat_conversations_uri}metrics/export`, {
      params: params,
      responseType: 'blob'
    });
  }
  
  /**
   * SLA and Compliance Methods
   */
  
  // Get SLA compliance report
  getSLACompliance(startDate: string, endDate: string): Observable<any> {
    const params = new HttpParams()
      .set('start_date', startDate)
      .set('end_date', endDate);
    
    return this.http.get<any>(`${this.conversations_url}${this.non_chat_conversations_uri}metrics/sla-compliance`, { params });
  }
  
  // Get overdue tickets
  getOverdueTickets(): Observable<any> {
    return this.http.get<any>(`${this.tickets_url}overdue/`);
  }
  
  /**
   * Search and Filter Methods
   */
  
  // Advanced ticket search
  searchTickets(query: string, filters: any = {}): Observable<any> {
    let params = new HttpParams().set('q', query);
    Object.keys(filters).forEach(key => {
      if (filters[key]) {
        params = params.set(key, filters[key]);
      }
    });
    
    return this.http.get<any>(`${this.tickets_url}search/`, { params });
  }
  
  // Get ticket tags/categories
  getTicketTags(): Observable<any> {
    return this.http.get<any>(`${this.tickets_url}tags/`);
  }
  
  /**
   * Real-time Updates Methods
   */
  
  // Get recent activity feed
  getActivityFeed(limit: number = 10): Observable<any> {
    const params = new HttpParams().set('limit', limit.toString());
    return this.http.get<any>(`${this.conversations_url}${this.non_chat_conversations_uri}activity/feed`, { params });
  }
  
  // Get unread ticket count
  getUnreadTicketCount(): Observable<any> {
    return this.http.get<any>(`${this.tickets_url}unread-count/`);
  }

  // Add these methods to your existing ChatManagerService class

/**
 * Search conversations across organization
 * This method searches through conversations by contact name, phone, and message content
 */
search_conversations(
  base_url_type = "chat",
  search: string,
  page: number = 1,
  pageSize: number = 20,
  ordering?: string
): Observable<any> {
  const headers = new HttpHeaders().set('Authorization', `Bearer ${this.auth_token}`);
  
  const params: any = {
    search: search,
    page: page,
    page_size: pageSize
  };
  
  if (ordering) {
    params.ordering = ordering;
  }

  if (base_url_type !== "chat") {
    return this.http.get(
      `${this.conversations_url}${this.non_chat_conversations_uri}`,
      { headers, params }
    );
  }

  return this.http.get(
    `${this.conversations_url}${this.chat_uri}`,
    { headers, params }
  );
}

/**
 * Get conversations with enhanced pagination support
 * Consolidates the various list methods into one with better parameter handling
 */
list_conversations_paginated(
  base_url_type = "chat",
  options: {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: string;
    is_user_specific?: boolean;
    ordering?: string;
  } = {}
): Observable<any> {
  const headers = new HttpHeaders().set('Authorization', `Bearer ${this.auth_token}`);
  
  const params: any = {
    page: options.page || 1,
    page_size: options.pageSize || 20
  };

  if (options.search) params.search = options.search;
  if (options.status) params.status = options.status;
  if (options.is_user_specific) params.is_user_specific = 'true';
  if (options.ordering) params.ordering = options.ordering;

  if (base_url_type !== "chat") {
    return this.http.get(
      `${this.conversations_url}${this.non_chat_conversations_uri}`,
      { headers, params }
    );
  }

  return this.http.get(
    `${this.conversations_url}${this.chat_uri}`,
    { headers, params }
  );
}




 

 
/**
 * Fetch call log for a specific conversation.
 */
getCallLogs(conversationId: number) {
  const headers = new HttpHeaders().set('Authorization', `Bearer ${this.auth_token}`);
  return this.http.get(
    `${this.calls_url}?conversation_id=${conversationId}`,
    { headers }
  );
}

requestCallPermission(platformId: string, to: string) {
  const headers = new HttpHeaders().set('Authorization', `Bearer ${this.auth_token}`);
  return this.http.post(
    `${this.calls_url}request-permission/`,
    { platform_id: platformId, sdp_offer: '', to },   // ← was phone_number_id
    { headers }
  );
}

initiateCall(platformId: string, to: string, sdpOffer: string) {
  const headers = new HttpHeaders().set('Authorization', `Bearer ${this.auth_token}`);
  return this.http.post(
    `${this.calls_url}initiate/`,
    { platform_id: platformId, to, sdp_offer: sdpOffer },
    { headers }
  );
}

callAction(callId: string, platformId: string, action: string, sdp?: string) {
  const headers = new HttpHeaders().set('Authorization', `Bearer ${this.auth_token}`);
  const body: any = { platform_id: platformId, action };  // ← was phone_number_id
  if (sdp) body.sdp = sdp;
  return this.http.post(
    `${this.calls_url}${callId}/action/`,
    body,
    { headers }
  );
}

transferCall(callId: string, platformId: string, targetUserId: number) {
  const headers = new HttpHeaders().set('Authorization', `Bearer ${this.auth_token}`);
  return this.http.post(
    `${this.calls_url}${callId}/transfer/`,
    { platform_id: platformId, target_user_id: targetUserId },  // ← was phone_number_id
    { headers }
  );
}

checkCallPermission(platformId: string, to: string) {
  const headers = new HttpHeaders().set('Authorization', `Bearer ${this.auth_token}`);
  return this.http.get(
    `${this.calls_url}check-permission/`,
    { headers, params: { platform_id: platformId, to } }
  );
}

getActiveCall() {
  console.log("Checking active calls");
  const headers = new HttpHeaders().set('Authorization', `Bearer ${this.auth_token}`);
  return this.http.get(`${this.calls_url}active/`, { headers });
}

  forwardMessage(payload: {
  source_message_id      : number;
  source_message_type    : 'incoming' | 'outgoing';
  target_conversation_id : number;
}): Observable<any> {
  const headers = new HttpHeaders().set('Authorization', `Bearer ${this.auth_token}`);
  return this.http.post(
    `${this.conversations_url}forward/`,
    payload,
    { headers }
  );
}

}
