import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { HOST } from '../../../environment'

@Injectable({
  providedIn: 'root',
})
export class PlatformManagerService {
  list_platforms_url = `${HOST}/platforms/`;
  templates_uri = "/templates"
  notification_uri = "notification"
  blockedcontact_uri = "blocked_contacts";

  profile;
  auth_token;

  constructor(private http: HttpClient) {
    this.profile = JSON.parse(localStorage.getItem("profile"));
    if (this.profile) {
      this.auth_token = this.profile["access"]
    }
  }

  list_notification() {
    if (this.profile) {
      this.profile = JSON.parse(localStorage.getItem("profile"));
      this.auth_token = this.profile["access"]
    }
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.auth_token}`);
    return this.http.get(`${this.list_platforms_url}${this.notification_uri}`, { headers });
  }

  get_templates(platformId): Observable<any> {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.auth_token}`);
    return this.http.get(`${this.list_platforms_url}${platformId}${this.templates_uri}`, { headers });
  }

  list_platforms(): Observable<any> {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.auth_token}`);
    return this.http.get(this.list_platforms_url, { headers });
  }

  list_platforms_by_type(platform_type): Observable<any> {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.auth_token}`);
    return this.http.get(`${this.list_platforms_url}?platform_type=${platform_type}`, { headers });
  }

  create_platform(payload) {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.auth_token}`);
    return this.http.post(this.list_platforms_url, payload=payload, { headers })
  }

  update_platform(platform_id, payload) {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.auth_token}`);
    return this.http.put(`${this.list_platforms_url}${platform_id}`, payload=payload, { headers })
  }

  getBlockedContacts(platformId: number) {
    return this.http.get(`${this.list_platforms_url}${platformId}/${this.blockedcontact_uri}`);
  }

  blockContact(platformId: number, body: any) {
    return this.http.post(`${this.list_platforms_url}${platformId}/${this.blockedcontact_uri}`, body);
  }

  blockContactBulk(body: any) {
  return this.http.post(`${this.list_platforms_url}${this.blockedcontact_uri}/bulk/`, body);
}


  unblockContact(platformId: number, contactValue: string) {
    return this.http.delete(
      `${this.list_platforms_url}${platformId}/${this.blockedcontact_uri}?contact_value=${encodeURIComponent(contactValue)}`
    );
  }

  // Gmessages service
  getGMessageQR(platformId: number) {
  return this.http.post(`${this.list_platforms_url}${platformId}/gmessages/qr/`, {});
}

getGMessageStatus(platformId: number) {
  return this.http.get(`${this.list_platforms_url}${platformId}/gmessages/status/`);
}

syncGMessage(platformId: number) {
  return this.http.post(`${this.list_platforms_url}${platformId}/gmessages/sync/`, {});
}

disconnectGMessage(platformId: number) {
  return this.http.post(`${this.list_platforms_url}${platformId}/gmessages/disconnect/`, {});
}


}
