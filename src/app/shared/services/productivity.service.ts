import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HOST } from '../../../environment'

@Injectable({
  providedIn: 'root'
})
export class ProductivityService {

    employee_productivity_url = `${HOST}/productivity/employee`;
    leaderboard_productivity_url = `${HOST}/productivity/summary`;
    my_summary_url = `${HOST}/productivity/my_summary`;

  profile;
  auth_token;

  constructor(private http: HttpClient) {
    this.profile = JSON.parse(localStorage.getItem("profile"));
    if (this.profile) {
      this.auth_token = this.profile["access"]
    }
  }

  employee_productivity(empId, fromDate, toDate): Observable<any> {
    if (this.profile) {
      this.profile = JSON.parse(localStorage.getItem("profile"));
      this.auth_token = this.profile["access"]
    }
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.auth_token}`);
    return this.http.get(`${this.employee_productivity_url}/${empId}?start=${fromDate}&end=${toDate}`, { headers });
  }
  
  leaderboard_productivity(fromDate, toDate): Observable<any> {
    if (this.profile) {
      this.profile = JSON.parse(localStorage.getItem("profile"));
      this.auth_token = this.profile["access"]
    }
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.auth_token}`);
    return this.http.get(`${this.leaderboard_productivity_url}?start=${fromDate}&end=${toDate}`, { headers });
  }

  my_summary(fromDate, toDate): Observable<any> {
    if (this.profile) {
      this.profile = JSON.parse(localStorage.getItem("profile"));
      this.auth_token = this.profile["access"]
    }
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.auth_token}`);
    return this.http.get(`${this.my_summary_url}?start=${fromDate}&end=${toDate}`, { headers });
  }
}
