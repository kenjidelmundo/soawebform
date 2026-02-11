export interface Soa {
  soaNo: string;
  date: string;
  name: string;
  address: string;
  type: 'New' | 'Ren' | 'CO' | 'CV' | 'MOD' | 'ROC' | 'ECO';
  particulars: string;
  periodCovered: string;
  sections: {
    title: string;
    rows: [string, number][];
  }[];
}

export interface AccessSOAPayload {
  id?: number;

  dateIssued?: string | null;
  licensee?: string | null;
  address?: string | null;
  particulars?: string | null;
  periodCovered?: string | null;

  rslRadioStation?: number | null;
  rocOperatorFee?: number | null;
  rslSurcharge?: number | null;
  dst?: number | null;

  orNumber?: string | null;
  datePaid?: string | null;

  remarksNote?: string | null;
  totalAmount?: number | null;
}