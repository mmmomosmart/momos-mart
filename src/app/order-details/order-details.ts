import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIcon } from '@angular/material/icon';
import { Router } from '@angular/router';
import { Product } from '../../menu-category/product-model';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { PrinterService } from '../service/printer-service';
import { CartService } from '../service/cart-service';
import Swal from 'sweetalert2';
import { ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-order-details',
  imports: [CommonModule, MatIcon, MatExpansionModule, MatTableModule, MatButtonModule],
  templateUrl: './order-details.html',
  styleUrl: './order-details.scss',
})
export class OrderDetails {
  constructor(private cdr: ChangeDetectorRef, private router: Router, private printer: PrinterService, private cartService: CartService) { }

  todaysInvoices: any;
  invoices: any;
  readonly panelOpenState = signal(false);
  displayedColumns: string[] = ['name', 'portion', 'quantity', 'price'];

  ngOnInit() {
    this.getInvoiceDetails();
  }

  getCurrentDate() {
    const today = new Date();
    return today.getDate() + '/' + (today.getMonth() + 1) + '/' + today.getFullYear();
  }

  getInvoiceDetails() {
    const currentDate = this.getCurrentDate();
    this.invoices = JSON.parse(localStorage.getItem('invoices') || '[]');

    this.todaysInvoices = this.invoices.filter((inv: any) =>
      inv.createdOn.date === currentDate
    ).reverse();
  }

  goToHome() {
    this.router.navigate(['/']);
  }

  editInvoice(invoice: any) {
    this.cartService.setInvoice(invoice);
    this.router.navigate(['/invoice']);
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

  deleteInvoice(invoiceData: any) {
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
        // 1️⃣ Remove from component state instantly
        this.todaysInvoices = this.todaysInvoices.filter(
          (inv: any) => inv.invoiceNumber !== invoiceNumberToDelete
        );

        this.cdr.detectChanges();

        // 2️⃣ Update localStorage
        let invoices = JSON.parse(localStorage.getItem("invoices") || "[]");
        invoices = invoices.filter((inv: any) => inv.invoiceNumber !== invoiceNumberToDelete);
        localStorage.setItem("invoices", JSON.stringify(invoices));

        console.log("Invoice deleted successfully");

        // 3️⃣ Show success alert
        Swal.fire({
          text: "Invoice has been deleted!",
          icon: "success",
          timer: 1500,
          showConfirmButton: false
        });
      }
    });
  }

}
