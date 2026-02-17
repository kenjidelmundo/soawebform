import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type TechSOAUpsertDto = {
  periodFrom: string | null;
  periodTo: string | null;
  periodYears: number | null;

  dateIssued: string | null;
  licensee: string | null;
  address: string | null;
  particulars: string | null;

  // ✅ YEAR NUMBER only, OPTIONAL to avoid TS2741 payload error
  periodCovered?: number | null;
};

// ✅ keep old name so your page import still works
export type TechSOAHeaderCreateDto = TechSOAUpsertDto;

@Injectable({ providedIn: 'root' })
export class SoaService {
  private baseUrl = '/api/TechSOA';

  constructor(private http: HttpClient) {}

  getPayeeNames(): Observable<string[]> {
    return this.http.get<string[]>(`${this.baseUrl}/payees`);
  }

  getByLicensee(name: string): Observable<TechSOAUpsertDto> {
    return this.http.get<TechSOAUpsertDto>(`${this.baseUrl}/by-licensee`, {
      params: { name },
    });
  }

  // keep this if your page calls createHeader()
  createHeader(dto: TechSOAHeaderCreateDto): Observable<any> {
    return this.http.post(`${this.baseUrl}/upsert`, dto);
  }

  ping(): Observable<string> {
    return this.http.get(`${this.baseUrl}/ping`, { responseType: 'text' });
  }
}
