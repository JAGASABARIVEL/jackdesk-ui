import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HOST } from '../../../environment'

@Injectable({
  providedIn: 'root'
})
export class KeyloggerManagerService {

  keylogger_url = `${HOST}/keylogger/`;

  profile;
  auth_token;

  constructor(private http: HttpClient) {
    this.profile = JSON.parse(localStorage.getItem("profile"));
    if (this.profile) {
      this.auth_token = this.profile["access"]
    }
    else {
      console.error("Profile is empty - contact service");
    }
  }

  list_logged_data(emp_id: number, selected_date: any) {
    let params = new HttpParams().set('emp_id', emp_id).set('date', selected_date)
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.auth_token}`);
    return this.http.get(this.keylogger_url, { params, headers });
  }
}