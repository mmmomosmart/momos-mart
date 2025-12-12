import { Component, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { CartService } from './service/cart-service';
import { Product } from '../menu-category/product-model';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { PrinterService } from './service/printer-service';

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet, MatButtonModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  constructor(private router: Router, private CartService: CartService, private printer: PrinterService) {
    // Detect route change
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.isInvoicePage = event.url === '/invoice';
        this.isAdminPage = event.url === '/admin';
      }
    });
  }
  protected readonly title = signal('momos-mart');

  orderdetails: Product[] = [];
  isAdminPage = false;
  disableBtn = true;
  isInvoicePage = false;
  cartCount = 0;

  ngOnInit() {
    this.getCartItems();
  }

  getCartItems() {
    this.CartService.cart$.subscribe((items: Product[]) => {
      if (items.length > 0) {
        this.orderdetails = items;
        this.cartCount = items.reduce((sum, item) => sum + (item.quantity ?? 1), 0);
        this.disableBtn = false;
      } else {
        this.cartCount = 0;
        this.orderdetails = [];
        this.disableBtn = true;
      }
    });
  }

  goToInvoice() {
    this.router.navigate(['/invoice']);
  }

  getCurrentDateTime() {
    const today = new Date();

    const date_time = {
      date: today.getDate() + '/' + (today.getMonth() + 1) + '/' + today.getFullYear(),
      time: today.toLocaleTimeString()
    }

    return date_time;
  }

  saveInvoice() {
    const billNumber = localStorage.getItem('invoiceNumber');

    const invoiceData = {
      invoiceNumber: billNumber,
      createdOn: {
        date: this.getCurrentDateTime().date,
        time: this.getCurrentDateTime().time
      },
      items: this.orderdetails,
      total: this.CartService.getTotal()
    };


    console.log("Created", invoiceData.createdOn.date);

    // Get existing invoices or empty array
    const existingInvoices = JSON.parse(localStorage.getItem('invoices') || '[]');

    // Push the new invoice
    existingInvoices.push(invoiceData);

    // Save back to localStorage
    localStorage.setItem('invoices', JSON.stringify(existingInvoices));

    //print the invoice
    this.onPrintInvoice(invoiceData);

    this.CartService.clearCart();
    this.cartCount = 0;
    this.disableBtn = true;
    this.router.navigate(['/']);
  }

  async onPrintInvoice(invoiceData: any) {
    try {
      await this.printer.requestPermissions();

      const devices = await this.printer.listDevices();
      const ezo = devices.find(d => d.name && d.name.includes("EZO"));

      if (!ezo) {
        alert("EZO Printer not found!");
        return;
      }

      await this.printer.connect(ezo.id || ezo.address);

      await this.printer.printInvoice(invoiceData);
      await this.printer.disconnect();

      alert('Invoice printed successfully!');
    } catch (err: any) {
      alert('Print failed: ' + (err?.message || JSON.stringify(err)));
    }
  }
}
