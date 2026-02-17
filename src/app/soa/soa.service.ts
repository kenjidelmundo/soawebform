import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type TechSOAUpsertDto = {
  dateIssued?: string | null;
  licensee?: string | null;
  address?: string | null;
  particulars?: string | null;

  periodFrom?: string | null;
  periodTo?: string | null;
  periodYears?: number | null;

  // DB stores "YYYY-YYYY"
  periodCovered?: string | null;

  // keep everything else optional for now
  [key: string]: any;
};

// keep old name so your imports won't break
export type TechSOAHeaderCreateDto = TechSOAUpsertDto;

@Injectable({ providedIn: 'root' })
export class SoaService {
  private baseUrl = '/api/TechSOA'; // via proxy

  constructor(private http: HttpClient) {}

  // ✅ dropdown licensee list
  getPayeeNames(): Observable<string[]> {
    return this.http.get<string[]>(`${this.baseUrl}/payees`);
  }

  // ✅ fetch latest record by selected licensee (if you have this endpoint)
  getByLicensee(name: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/by-licensee`, {
      params: { name },
    });
  }

  // ✅ fetch by ID (Swagger confirmed GET /api/TechSOA/{id} works)
  getById(id: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/${id}`);
  }

  // ✅ CREATE (POST)
  createHeader(dto: TechSOAHeaderCreateDto): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}`, dto);
  }

  // ✅ UPDATE (PUT) — THIS FIXES YOUR ERROR
  update(id: number, dto: TechSOAUpsertDto): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/${id}`, dto);
  }

  // ✅ optional: if you want PATCH instead of PUT
  patch(id: number, dto: Partial<TechSOAUpsertDto>): Observable<any> {
    return this.http.patch<any>(`${this.baseUrl}/${id}`, dto);
  }

  // ✅ debug
  dbInfo(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/dbinfo`);
  }
}
