import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HOST } from '../../../environment'

@Injectable({
  providedIn: 'root'
})
export class UserManagerService {
  manage_users_url = `${HOST}/users/`;
  list_users_uri = "list";
  register_individual_uri = "register/individual/";
  register_owner_uri = "register/owner/";
  register_employee_uri = "register/employee/";
  ping_user_uri = "ping";
  list_all_users_uri = "list_all_users";
  employee_user_uri = "employees/";
  remove_employee_user_uri = "remove";
  list_my_agents_uri = "list_agents";
  list_global_agents_uri = "list_all_agents";
  add_agent_uri = "register/agent/";
  agent_user_uri = "agents/";
  remove_agent_user_uri = "remove";
  guest_user_uri = "guest";
  zoho_login_uri = "login/zoho";

  constructor(private http: HttpClient) { }

  list_users(): Observable<any> {
    return this.http.get(`${this.manage_users_url}${this.list_users_uri}`);
  }

  register_individual_user(payload): Observable<any> {
    return this.http.post(`${this.manage_users_url}${this.register_individual_uri}`, payload);
  }

  register_owner_user(payload): Observable<any> {
    return this.http.post(`${this.manage_users_url}${this.register_owner_uri}`, payload);
  }

  ping_user_token(): Observable<any> {
    return this.http.get(`${this.manage_users_url}${this.ping_user_uri}`);
  }

  list_all_users(): Observable<any> {
    return this.http.get(`${this.manage_users_url}${this.list_all_users_uri}`);
  }

  remove_employee_user_from_org(employee_id): Observable<any> {
    return this.http.delete(`${this.manage_users_url}${this.employee_user_uri}${employee_id}/${this.remove_employee_user_uri}`);
  }

  add_employee_user_to_org(payload): Observable<any> {
    return this.http.post(`${this.manage_users_url}${this.register_employee_uri}`, payload);
  }

  list_global_agents(): Observable<any> {
    return this.http.get(`${this.manage_users_url}${this.list_global_agents_uri}`);
  }

  list_my_agents(): Observable<any> {
    return this.http.get(`${this.manage_users_url}${this.list_my_agents_uri}`);
  }

  add_agent(payload): Observable<any> {
    return this.http.post(`${this.manage_users_url}${this.add_agent_uri}`, payload);
  }

  remove_agent_from_org(agent_id): Observable<any> {
    return this.http.delete(`${this.manage_users_url}${this.agent_user_uri}${agent_id}/${this.remove_agent_user_uri}`);
  }

  guest_token(payload = {}): Observable<any> {
    return this.http.post(`${this.manage_users_url}${this.guest_user_uri}`, payload);
  }

  // Zoho OAuth methods
  initiate_zoho_login(): Observable<any> {
    return this.http.get(`${this.manage_users_url}${this.zoho_login_uri}`);
  }
}