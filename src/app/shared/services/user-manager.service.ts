import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HOST } from '../../../environment'

@Injectable({
  providedIn: 'root'
})
export class UserManagerService {

  // 1234
  //auth_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzQyNTM3NjIzLCJpYXQiOjE3NDE5MzI4MjMsImp0aSI6IjA0MzQ2NTdlNjllNDRjZjZhNjI0MDRjYjYwNTQxZjQ3IiwidXNlcl9pZCI6MX0.cH7sjf8YdxC5Q_KqiPQ_9HFNKAL0PX2BV9IS2nzLK8E"

  // 123
  //auth_token; //= "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzQyNTU3MjY4LCJpYXQiOjE3NDE5NTI0NjgsImp0aSI6IjY0YjYwNWY2MDYzMzRjMmY4MzAyZDZkOWY1NmZjYmQxIiwidXNlcl9pZCI6Mn0.XuhGMZFdSnqZEoAme4G3qjMM2HavDmvMV8jdB2rJqLQ"
  


  manage_users_url = `${HOST}/users/`
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
  agent_user_uri = "agents/"
  remove_agent_user_uri = "remove";
  guest_user_uri = "guest"

  constructor(private http: HttpClient) { }

  list_users(): Observable<any> {
    return this.http.get(`${this.manage_users_url}${this.list_users_uri}`);
  }

  register_individual_user(payload) {
    return this.http.post(`${this.manage_users_url}${this.register_individual_uri}`, payload=payload);
  }

  register_owner_user(payload) {
    return this.http.post(`${this.manage_users_url}${this.register_owner_uri}`, payload=payload);
  }

  ping_user_token() {
    return this.http.get(`${this.manage_users_url}${this.ping_user_uri}`);
  }

  list_all_users() {
    return this.http.get(`${this.manage_users_url}${this.list_all_users_uri}`);
  }

  remove_employee_user_from_org(employee_id) {
    return this.http.delete(`${this.manage_users_url}${this.employee_user_uri}${employee_id}/${this.remove_employee_user_uri}`);
  }

  add_employee_user_to_org(payload) {
    return this.http.post(`${this.manage_users_url}${this.register_employee_uri}`, payload=payload);
  }

  list_global_agents() {
    return this.http.get(`${this.manage_users_url}${this.list_global_agents_uri}`);
  }

  list_my_agents() {
    return this.http.get(`${this.manage_users_url}${this.list_my_agents_uri}`);
  }

  add_agent(payload) {
    return this.http.post(`${this.manage_users_url}${this.add_agent_uri}`, payload=payload);
  }

  remove_agent_from_org(agent_id) {
    return this.http.delete(`${this.manage_users_url}${this.agent_user_uri}${agent_id}/${this.remove_agent_user_uri}`);
  }

  guest_token(payload={}) {
    return this.http.post(`${this.manage_users_url}${this.guest_user_uri}`, payload=payload);
  }
}
