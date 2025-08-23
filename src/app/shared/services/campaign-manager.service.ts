import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HOST } from '../../../environment'

@Injectable({
  providedIn: 'root'
})
export class CampaignManagerService {

  campaign_url = `${HOST}/campaign/`;
  bulk_delete_uri = "bulk-delete"
  list_history_uri = "history"

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

  // +++++++++++++++++++++ Campaign Service ++++++++++++++

  private convertToFormData(schedule: any): FormData {
    const formData = new FormData();
    formData.append('name', schedule.name);
    formData.append('uploaded_excel', schedule.uploaded_excel); // File object
    formData.append('frequency', schedule.frequency);
    //formData.append('organization_id', schedule.organization_id.toString());
    formData.append('platform', schedule.platform.toString());
    //formData.append('user_id', schedule.user_id.toString());
    formData.append('recipient_type', schedule.recipient_type);
    formData.append('recipient_id', schedule.recipient_id.toString());
    formData.append('message_body', schedule.message_body);
    formData.append('scheduled_time', schedule.scheduled_time);
    formData.append('template', schedule.template);

    // Handle nested object (datasource)
    formData.append('datasource', JSON.stringify(schedule.datasource));
    return formData;
  }

  list_campaign(): Observable<any> {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.auth_token}`);
    return this.http.get(this.campaign_url, { headers });
  }

  list_history() {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.auth_token}`);
    return this.http.get(`${this.campaign_url}${this.list_history_uri}`, { headers });
  }

  create_campaign(payload) {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.auth_token}`);
    const formData = this.convertToFormData(payload);
    return this.http.post(this.campaign_url, formData, { headers });
  }

  update_campaign(id: number, payload: any) {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.auth_token}`);
    return this.http.put(`${this.campaign_url}${id}`, payload=payload, { headers });
  }

  delete_campaign(id: number) {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.auth_token}`);
    return this.http.delete(`${this.campaign_url}${id}`, { headers });
  }

  bulk_delete_campaign(payload: any) {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.auth_token}`);
    return this.http.post(`${this.campaign_url}${this.bulk_delete_uri}`, payload=payload, { headers });
  }
}
