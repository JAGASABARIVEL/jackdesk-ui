import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HOST } from '../../../environment'

@Injectable({
  providedIn: 'root'
})
export class ContactManagerService {

  contacts_url = `${HOST}/contacts/`;
  contactCustomFieldsUri = "custom-fields"
  bulkDeleteUri = "bulk-delete";
  bulkImportUri = "import"

  groups_url = `${HOST}/groups/`;


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

  // +++++++++++++++++++++ Contact Service ++++++++++++++

  list_contact_custom_fields(): Observable<any> {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.auth_token}`);
    return this.http.get(`${this.contacts_url}${this.contactCustomFieldsUri}`, { headers });
  }

  deleteField(fieldId): Observable<any> {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.auth_token}`);
    return this.http.delete(`${this.contacts_url}${this.contactCustomFieldsUri}/${fieldId}`, { headers });
  }

  create_contact_custom_field(payload: any): Observable<any> {
    /**
     * {
    name: "GST Number",
    key: "gst_number",
    field_type: "text",          // "text" | "number" | "dropdown" | "checkbox" | "date"
    required: true,
    options: null                // optional, for dropdown/checkbox only
  }
  {
    name: "Customer Tier",
    key: "customer_tier",
    field_type: "dropdown",
    required: false,
    options: ["Gold", "Silver", "Bronze"]
  }
     */
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.auth_token}`);
    return this.http.post(`${this.contacts_url}${this.contactCustomFieldsUri}`, payload, { headers });
  }


  list_contact(): Observable<any> {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.auth_token}`);
    return this.http.get(this.contacts_url, { headers });
  }

  delete_contact(contactId) {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.auth_token}`);
    return this.http.delete(`${this.contacts_url}${contactId}`, { headers });
  }

  delete_contacts(contactIds) {
    let payload = { "contact_ids": contactIds }
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.auth_token}`);
    return this.http.delete(`${this.contacts_url}${this.bulkDeleteUri}`, { headers, body: payload });
  }

  create_contact(payload) {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.auth_token}`);
    return this.http.post(this.contacts_url, payload = payload, { headers });
  }

  update_contact(payload) {
    let contactId = payload["id"]
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.auth_token}`);
    return this.http.patch(`${this.contacts_url}${contactId}`, payload = payload, { headers })
  }

  import_contact(payload: FormData) {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.auth_token}`);
    return this.http.post(`${this.contacts_url}${this.bulkImportUri}`, payload = payload, { headers });
  }


  // +++++++++++++++++ Groups Service +++++++++++++++++++

  list_groups() {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.auth_token}`);
    return this.http.get(this.groups_url, { headers });
  }

  delete_group(groupId) {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.auth_token}`);
    return this.http.delete(`${this.groups_url}${groupId}`, { headers });
  }

  delete_groups(groupIds) {
    let payload = { "group_ids": groupIds }
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.auth_token}`);
    return this.http.delete(`${this.groups_url}${this.bulkDeleteUri}`, { headers, body: payload });
  }

  create_group(payload) {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.auth_token}`);
    return this.http.post(this.groups_url, payload = payload, { headers });
  }

  update_group(payload) {
    let groupId = payload["id"]
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.auth_token}`);
    return this.http.patch(`${this.groups_url}${groupId}`, payload = payload, { headers })
  }
}
