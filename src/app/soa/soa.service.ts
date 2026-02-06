import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface TechSOAHeaderCreateDto {
  dateIssued: string | null;
  licensee: string | null;
  address: string | null;
  particulars: string | null;
  periodFrom: string | null;
  periodTo: string | null;
  periodYears: number | null;
}

@Injectable({ providedIn: 'root' })
export class SoaService {
  // ✅ CHANGE to your IIS base (where swagger opens)
  // Example: http://localhost/LicensingAPI
  private iisBase = 'http://localhost:8080';

  private baseUrl = `${this.iisBase}/api/TechSOA`;

  constructor(private http: HttpClient) {}

  createHeader(payload: TechSOAHeaderCreateDto): Observable<any> {
    return this.http.post(`${this.baseUrl}/header`, payload);
  }

  getHeaderById(id: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/header/${id}`);
  }
}
