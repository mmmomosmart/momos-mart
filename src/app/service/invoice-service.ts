import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class InvoiceService {
  private invoiceData: any;
  isInvoiceEdited = new BehaviorSubject<boolean>(false);

  generateBillNo(billType : string) {
    const currentDate = new Date();

    const yyyy = currentDate.getFullYear();
    const mm = String(currentDate.getMonth() + 1).padStart(2, '0');
    const dd = String(currentDate.getDate()).padStart(2, '0');

    const hh = String(currentDate.getHours()).padStart(2, '0');
    const min = String(currentDate.getMinutes()).padStart(2, '0');
    const ss = String(currentDate.getSeconds()).padStart(2, '0');

    const billNumber = `${billType}-${yyyy}${mm}${dd}-${hh}${min}${ss}`

    if(billType== 'INV') this.setInvoiceNumber(billNumber);

    return billNumber;
  }

  setEditedInvoice(invoiceData: any) {
    localStorage.setItem('editedInvoice', JSON.stringify(invoiceData));
  }

  getEditedInvoice() {
    return JSON.parse(localStorage.getItem('editedInvoice') || '{}');
  }

  setInvoiceNumber(invoiceNumber: string) {
    localStorage.setItem('invoiceNumber', invoiceNumber);
  }

  getInvoiceNumber() {
    return localStorage.getItem('invoiceNumber') ?? '';
  }

  getSetInvoicesToLocalStorage(invoiceData: any) {
    // Get existing invoices or empty array
    const existingInvoices = this.getInvoicesFromLocalStorage('invoices');

    // Push the new invoice
    existingInvoices.push(invoiceData);

    // Save back to localStorage
    this.setInvoicesToLocalStorage(existingInvoices);
  }

  setInvoicesToLocalStorage(invoices: any) {
    localStorage.setItem('invoices', JSON.stringify(invoices));
  }

  getInvoicesFromLocalStorage(key: string) {
    return JSON.parse(localStorage.getItem(key) || '[]');
  }

  getEditedInvoiceFromLocalStorage(key: string) {
    return JSON.parse(localStorage.getItem(key) || '{}');
  }

  getSetExpensesToLocalStorage(expenseData: any) {
    // Get existing expenses or empty array
    const existingExpenses = this.getExpensesFromLocalStorage('expenses');

    // Push the new expense
    existingExpenses.push(expenseData);

    // Save back to localStorage
    this.setExpensesToLocalStorage(existingExpenses)
  }

  getExpensesFromLocalStorage(key: string) {
    return JSON.parse(localStorage.getItem(key) || '[]');
  }

  setExpensesToLocalStorage(expenses: any) {
    localStorage.setItem('expenses', JSON.stringify(expenses));
  }
  
}
