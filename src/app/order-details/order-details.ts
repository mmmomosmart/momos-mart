import { CommonModule } from '@angular/common';
import { Component, computed, effect, signal } from '@angular/core';
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
  readonly panelOpenState = signal(false);
  displayedColumns: string[] = ['name', 'portion', 'quantity', 'price', 'total'];

  loading = signal<boolean>(false);
  invoices_details = computed(() => this.firestoreService.invoicesByDate$());

  totalOrders = computed(() => this.invoices_details().length);

  totalSales = computed(() =>
    this.invoices_details().reduce((sum: number, invoice: any) => {
      const invoiceTotal = invoice.items?.reduce(
        (t: number, item: any) => t + (item.total ?? 0),
        0
      ) ?? 0;
      return sum + invoiceTotal;
    }, 0)
  );

  saveTotal() {
    Swal.fire({
      title: "Save Total Sales",
      icon: "question",

      showCancelButton: true,
      cancelButtonText: "Cancel",
      cancelButtonColor: "#e53935", // Material red

      showConfirmButton: true,
      confirmButtonText: "Save",
      confirmButtonColor: "#43a047", // Material green

      reverseButtons: false
    }).then((result) => {

      if (result.isConfirmed) {
        // Save selected
        const salesDate = new Date().getDate() + " " + new Date().toLocaleString('en-US', { month: 'long' }) + " " + (new Date().getFullYear());
        console.log(salesDate);
        const totalSalesValue = {
          total: this.totalSales(),
        }
        this.firestoreService.addWithId('TotalSales', salesDate, totalSalesValue).then(() => {
          Swal.fire({
            icon: "success",
            text: "Saved Total Sales.",
            showConfirmButton: false,
            timer: 1000
          });
        }).catch(() => {
          Swal.fire({
            title: "Try Again!",
            text: "Something went wrong",
            icon: "error",
            timer: 1000,
            showConfirmButton: false
          });
        })
      }

      else if (result.dismiss === Swal.DismissReason.cancel) {
        console.log("Cancelled");
      }
    });

    //this.firestoreService.initializeDailySales(new Date(2026, 7, 19));
    //this.firestoreService.initializeMonthlySales(2026,1);
    // this.firestoreService.getMonthlySales(2026, 7).then((monthlySales) => {
    //   console.log('Monthly Sales:', monthlySales);
    // })
    // this.firestoreService.getSalesByDate(new Date(2026, 6, 1)).then((totalSales) => {
    //   console.log('Total Sales for 2026-07-01:', totalSales);
    // })

  }

  stopLoadingEffect = effect(() => {
    const invoices = this.invoices_details();
    if (invoices) {
      this.loading.set(false);
    }
  });

  ngOnInit() {
    this.loading.set(true);
    this.firestoreService.startInvoicesByDateListener(this.getCurrentDate());
  }

  ngOnDestroy() {
    this.firestoreService.stopInvoicesByDateListener();
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

      Swal.fire({
        icon: "success",
        text: "Invoice saved & printed.",
        showConfirmButton: false,
        timer: 1000
      });
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "Print Failed",
        text: err?.message || JSON.stringify(err),
        showConfirmButton: false,
        timer: 1000
      });
    }
  }

  deleteInvoices(invoiceData: any) {
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

        //Show success alert
        Swal.fire({
          text: "Invoice has been deleted!",
          icon: "success",
          timer: 1000,
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
