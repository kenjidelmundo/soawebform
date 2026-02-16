import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type TechSOAHeaderCreateDto = {
  dateIssued: string | null;
  licensee: string | null;
  address: string | null;
  particulars: string | null;
  periodFrom: string | null;
  periodTo: string | null;
  periodYears: number | null;
};

@Injectable({ providedIn: 'root' })
export class SoaService {
  // ✅ use proxy, so Angular will call /api/... and proxy will forward to your backend
  private baseUrl = '/api/TechSOA';

  constructor(private http: HttpClient) {}

  // ✅ DROPDOWN PAYEES (from accessSOA.LICENSEE)
  getPayeeNames(): Observable<string[]> {
    return this.http.get<string[]>(`${this.baseUrl}/payees`);
  }

  // ✅ save header (your controller has POST /api/TechSOA/header)
  createHeader(dto: TechSOAHeaderCreateDto): Observable<any> {
    return this.http.post(`${this.baseUrl}/header`, dto);
  }

  // optional test
  ping(): Observable<string> {
    return this.http.get(`${this.baseUrl}/ping`, { responseType: 'text' });
  }
}
