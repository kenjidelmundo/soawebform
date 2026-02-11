import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type Payee = {
  id: number | string;
  name: string;
};

@Injectable({ providedIn: 'root' })
export class PayeeService {
  // ✅ change this to your real endpoint
  private readonly baseUrl = 'https://localhost:5001/api/payees';

  constructor(private http: HttpClient) {}

  getPayees(): Observable<Payee[]> {
    return this.http.get<Payee[]>(this.baseUrl);
  }

  // Optional: if you want to fetch only one by id
  getPayeeById(id: number | string): Observable<Payee> {
    return this.http.get<Payee>(`${this.baseUrl}/${id}`);
  }
}
