import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class InvoiceService {
  private invoiceData: any;
  isInvoiceEdited = new BehaviorSubject<boolean>(false);

  setInvoice(invoiceData: any) {
    //this.invoiceData = data;

    // Get existing invoices or empty array
    const editedInvoices = JSON.parse(localStorage.getItem('editedInvoices') || '[]');

    // Push the new invoice
    //editedInvoices.push(invoiceData);

    // Save back to localStorage
    localStorage.setItem('editedInvoices', JSON.stringify(invoiceData));
  }

  getInvoice() {
    return JSON.parse(localStorage.getItem('editedInvoices') || '[]');
  }
  
}
