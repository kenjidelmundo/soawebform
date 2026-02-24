import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { shareReplay } from 'rxjs/operators';
import { AddressProvince } from './soa-left/address-dialog.component'; // ✅ adjust path to your dialog file

@Injectable({ providedIn: 'root' })
export class SoaService {
  // ✅ Swagger on https://localhost:7172
  private readonly apiRoot = 'https://localhost:7172/api';

  // ✅ separate endpoints
  private readonly techSoaUrl = `${this.apiRoot}/TechSOA`;
  private readonly addressUrl = `${this.apiRoot}/Address`;

  constructor(private http: HttpClient) {}

  // -------- CRUD ----------
  getAll(): Observable<any[]> {
    return this.http.get<any[]>(this.techSoaUrl);
  }

  getById(id: number): Observable<any> {
    return this.http.get<any>(`${this.techSoaUrl}/${id}`);
  }

  create(dto: any): Observable<any> {
    return this.http.post<any>(this.techSoaUrl, dto);
  }

  update(id: number, dto: any): Observable<any> {
    return this.http.put<any>(`${this.techSoaUrl}/${id}`, dto);
  }

  delete(id: number): Observable<any> {
    return this.http.delete<any>(`${this.techSoaUrl}/${id}`);
  }

  dbInfo(): Observable<any> {
    return this.http.get<any>(`${this.techSoaUrl}/dbinfo`);
  }

  // ✅ Base fees lookup by codes
  // GET: /api/TechSOA/basefees?codes=AT_RSL_A&codes=AM_APP_FEE
  getBaseFeesByCodes(codes: string[]): Observable<Record<string, number>> {
    let params = new HttpParams();
    for (const c of codes) params = params.append('codes', c);

    return this.http
      .get<Record<string, number>>(`${this.techSoaUrl}/basefees`, { params })
      .pipe(shareReplay(1));
  }

  // ✅ NEW: Address dataset (NO HARDCODE)
  // GET: /api/Address/provinces
  getAddressProvinces(): Observable<AddressProvince[]> {
    return this.http.get<AddressProvince[]>(`${this.addressUrl}/provinces`);
  }
}