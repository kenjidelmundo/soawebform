import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { shareReplay } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class SoaService {
  // ✅ correct because Swagger is on https://localhost:7172
  private baseUrl = 'https://localhost:7172/api/TechSOA';

  constructor(private http: HttpClient) {}

  // -------- CRUD ----------
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

  // ✅ NEW: Base fees lookup by codes
  // GET: /api/TechSOA/basefees?codes=AT_RSL_A&codes=AM_APP_FEE
  // returns: { "AT_RSL_A": 1234, "AM_APP_FEE": 50 }
  getBaseFeesByCodes(codes: string[]): Observable<Record<string, number>> {
    let params = new HttpParams();
    for (const c of codes) params = params.append('codes', c);

    return this.http
      .get<Record<string, number>>(`${this.baseUrl}/basefees`, { params })
      .pipe(shareReplay(1));
  }
}