import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { HOST } from '../../../environment'

@Injectable({
  providedIn: 'root'
})
export class FileManagerService {
  
  // 1234
  //auth_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzQyNTM3NjIzLCJpYXQiOjE3NDE5MzI4MjMsImp0aSI6IjA0MzQ2NTdlNjllNDRjZjZhNjI0MDRjYjYwNTQxZjQ3IiwidXNlcl9pZCI6MX0.cH7sjf8YdxC5Q_KqiPQ_9HFNKAL0PX2BV9IS2nzLK8E"

  // 123
  profile;
  auth_token; //= "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzQyNTU3MjY4LCJpYXQiOjE3NDE5NTI0NjgsImp0aSI6IjY0YjYwNWY2MDYzMzRjMmY4MzAyZDZkOWY1NmZjYmQxIiwidXNlcl9pZCI6Mn0.XuhGMZFdSnqZEoAme4G3qjMM2HavDmvMV8jdB2rJqLQ"
  list_files_url = `${HOST}/files/list`
  list_organize_url = `${HOST}/files/list/organize`
  create_folder_url = `${HOST}/files/folder`
  upload_file_url = `${HOST}/files/file`
  download_file_url = `${HOST}/files/download/`
  delete_file_url = `${HOST}/files/delete`
  share_file_url = `${HOST}/files/grant`
  revoke_file_url = `${HOST}/files/revoke`
  permission_list_url = `${HOST}/files/permission/list/`
  permission_update_url = `${HOST}/files/permission/update`
  usage_cost_url = `${HOST}/files/cost-report`

  constructor(private http: HttpClient) {
  }

  list_files(): Observable<any> {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.auth_token}`);
    return this.http.get(this.list_files_url, { headers });
  }

  list_file_from_id(fileId) {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.auth_token}`);
    return this.http.get(`${this.list_files_url}/${fileId}`, { headers });
  }

  list_files_with_qparameter(param: any): Observable<any> {
    let httpParams = new HttpParams();
    Object.keys(param).forEach(key => {
      if (param[key] !== null && param[key] !== null) { 
        httpParams = httpParams.append(key, param[key].toString());
      }
    });
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.auth_token}`);
    return this.http.get(this.list_files_url, { headers, params: httpParams });
  }

  list_organize() {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.auth_token}`);
    return this.http.get(this.list_organize_url, { headers });
  }

  create_folder(payload) {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.auth_token}`);
    return this.http.post(this.create_folder_url, payload=payload, { headers });
  }

  upload_file(formData: FormData) {
    const headers = new HttpHeaders({
        'Authorization': `Bearer ${this.auth_token}`
    });
    return this.http.post(this.upload_file_url, formData, { headers });
  }

  download_file(file_id) {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${this.auth_token}`
    });
    return this.http.get(`${this.download_file_url}${file_id}`, { 
      headers
       // Important! This tells Angular to treat it as a file, not JSON
    });
  }

  delete_file(payload) {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${this.auth_token}`
    });
    return this.http.delete(this.delete_file_url, {headers, body: payload});
  }

  share_file(payload) {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${this.auth_token}`
    });
    return this.http.post(this.share_file_url, payload, { headers });
  }

  revoke_share_file(payload) {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${this.auth_token}`
    });
    return this.http.delete(this.revoke_file_url, { headers, body: payload });
  }

  permission_list(file_id) {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${this.auth_token}`
    });
    return this.http.get(`${this.permission_list_url}${file_id}`, { 
      headers
    });
  }

  permission_update(payload) {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${this.auth_token}`
    });
    return this.http.patch(this.permission_update_url, payload, { headers });
  }

  usage_cost(month: any, year: any) {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${this.auth_token}`
    });
    const params: any = {};
    if (month) params.month = month;
    if (year) params.year = year;
    return this.http.get(`${this.usage_cost_url}`, { 
      headers, params
    });
  }

}
