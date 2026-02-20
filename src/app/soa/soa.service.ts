import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SoaService {

  // ✅ correct because Swagger is on https://localhost:7172
  private baseUrl = 'https://localhost:7172/api/TechSOA';

  constructor(private http: HttpClient) {}

  getAll(): Observable<any[]> {
    return this.http.get<any[]>(this.baseUrl);
  }

  getById(id: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/${id}`);
  }

  create(dto: any): Observable<any> {
    return this.http.post<any>(this.baseUrl, dto);
  }

  update(id: number, dto: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/${id}`, dto);
  }

  delete(id: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/${id}`);
  }

  dbInfo(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/dbinfo`);
  }
}