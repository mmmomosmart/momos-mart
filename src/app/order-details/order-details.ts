import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIcon } from '@angular/material/icon';
import { Router } from '@angular/router';
import { Product } from '../../menu-category/product-model';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PrinterService } from '../service/printer-service';
import { CartService } from '../service/cart-service';
import Swal from 'sweetalert2';
import { ChangeDetectorRef } from '@angular/core';
import { InvoiceService } from '../service/invoice-service';
import { FirestoreService } from '../service/firestore.service';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-order-details',
  imports: [CommonModule, MatIcon, MatExpansionModule, MatTableModule, MatCardModule, MatButtonModule, MatProgressSpinnerModule],
  templateUrl: './order-details.html',
  styleUrl: './order-details.scss',
})
export class OrderDetails {
  constructor(private cdr: ChangeDetectorRef,
    private router: Router,
    private printer: PrinterService,
    private cartService: CartService,
    private invoiceService: InvoiceService,
    private firestoreService: FirestoreService
  ) { }

  todaysInvoices: any;
  invoices: any;
  totalOrders: any;
  totalSales: any;
  readonly panelOpenState = signal(false);
  displayedColumns: string[] = ['name', 'portion', 'quantity', 'price'];
  invoices_details = signal<any[]>([]);
  loading = signal<boolean>(false);
  private unsubscribe?: () => void;


  ngOnInit() {
    //this.loadInvoices();

    this.loading.set(true);

    this.unsubscribe = this.firestoreService.listenByDate(
      'invoices',
      this.getCurrentDate(),
      (data) => {
        this.invoices_details.set(data);
        this.loading.set(false);
        this.totalOrders = data.length;

        this.totalSales = data.reduce((sum: number, invoice: any) => {
          const invoiceTotal = invoice.items.reduce((t: number, item: any) => t + item.total, 0);
          return sum + invoiceTotal;
        }, 0);
      }
    );
  }

  async loadInvoices() {
    this.loading.set(true);
    try {
      const snap = await this.firestoreService.getByDate('invoices', this.getCurrentDate());
      //const data = await this.firestoreService.getByDateCached<any>('invoices', this.getCurrentDate());
      const data = snap.docs.map(d => d.data() as any);
      console.log("data", data);
      this.invoices_details.set(data);
      this.totalOrders = data.length;

      this.totalSales = data.reduce((sum: number, invoice: any) => {
        const invoiceTotal = invoice.items.reduce((t: number, item: any) => t + item.total, 0);
        return sum + invoiceTotal;
      }, 0);
    } catch (err) {
      console.error('Failed to load invoices', err);
    } finally {
      this.loading.set(false);
    }
  }

  ngOnDestroy() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }


  getCurrentDate() {
    const today = new Date();
    return today.getDate() + '/' + (today.getMonth() + 1) + '/' + today.getFullYear();
  }

  goToHome() {
    this.router.navigate(['/']);
  }

  editInvoice(invoice: any) {
    this.invoiceService.setEditedInvoice(invoice);
    this.invoiceService.isInvoiceEdited.next(true);
    this.router.navigate(['/edit-invoice']);
  }

  printInvoice(invoiceData: any) {
    console.log(invoiceData);
    //print the invoice
    this.onPrintInvoice(invoiceData);
  }

  async onPrintInvoice(invoiceData: any) {
    try {
      await this.printer.requestPermissions();

      const devices = await this.printer.listDevices();
      const ezo = devices.find(d => d.name && d.name.includes("EZO"));

      if (!ezo) {
        //alert("EZO Printer not found!");
        Swal.fire("EZO Printer not found!", "", "error");
        return;
      }

      await this.printer.connect(ezo.id || ezo.address);

      await this.printer.printInvoice(invoiceData);
      await this.printer.disconnect();

      //alert('Invoice printed successfully!');
      Swal.fire({
        icon: "success",
        text: "Invoice saved & printed.",
        showConfirmButton: false,
        timer: 1500
      });
    } catch (err: any) {
      //alert('Print failed: ' + (err?.message || JSON.stringify(err)));
      Swal.fire({
        icon: "error",
        title: "Print Failed",
        text: err?.message || JSON.stringify(err),
        showConfirmButton: false,
        timer: 1500
      });
      //Swal.fire('Print failed: ' + (err?.message || JSON.stringify(err)), "", "error");
    }
  }

  deleteInvoices(invoiceData: any) {

    // await this.firestoreService.deleteWithId('invoices', invoice.invoiceNumber);
    // this.firestoreService.clearDateCache('invoices', this.getCurrentDate());

    const invoiceNumberToDelete = invoiceData.invoiceNumber;

    Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!"
    }).then((result) => {
      if (result.isConfirmed) {
        //Remove from component state instantly
        this.todaysInvoices = this.todaysInvoices.filter(
          (inv: any) => inv.invoiceNumber !== invoiceNumberToDelete
        );

        this.cdr.detectChanges();

        //Update localStorage
        let invoices = this.invoiceService.getInvoicesFromLocalStorage('invoices');
        invoices = invoices.filter((inv: any) => inv.invoiceNumber !== invoiceNumberToDelete);
        this.invoiceService.setInvoicesToLocalStorage(invoices);

        console.log("Invoice deleted successfully");

        //Show success alert
        Swal.fire({
          text: "Invoice has been deleted!",
          icon: "success",
          timer: 1500,
          showConfirmButton: false
        });
      }
    });
  }

  async deleteInvoice(invoiceData: any) {
    const invoiceNumber = invoiceData.invoiceNumber;

    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'This invoice will be permanently deleted',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: 'Yes, delete it',
      cancelButtonText: 'Cancel'
    });

    if (!result.isConfirmed) return;

    try {
      await this.firestoreService.deleteWithId('invoices', invoiceNumber);

      Swal.fire({
        icon: 'success',
        text: 'Invoice deleted',
        timer: 1200,
        showConfirmButton: false
      });

    } catch (err) {
      Swal.fire('Delete failed', 'Please try again', 'error');
    }
  }

}
