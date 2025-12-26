import { Component, Inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { CartService } from '../service/cart-service';
import { Product } from '../../menu-category/product-model';
import { MatChipsModule } from '@angular/material/chips';
import { InvoiceService } from '../service/invoice-service';


@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, MatButtonModule, MatCardModule, MatIcon, MatChipsModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
  constructor(private router: Router, private cartService: CartService, private invoiceService: InvoiceService) { }
  currentDate: string = '';
  totalOrders: any;
  totalSales: any;
  clicked = false;
  cartItems: Product[] = [];

  ngOnInit() {
    this.currentDate = this.getCurrentDate();
    this.totalOrders = this.getOrderStats().totalOrders;
    this.totalSales = this.getOrderStats().totalSales;
  }

  getCurrentDate() {
    const today = new Date();
    return today.getDate() + '/' + (today.getMonth() + 1) + '/' + today.getFullYear();
  }

  getOrderStats() {
    const invoices = this.invoiceService.getInvoicesFromLocalStorage('invoices');

    const todaysInvoices = invoices.filter((inv: any) =>
      inv.createdOn.date === this.currentDate
    );

    const totalOrders = todaysInvoices.length;

    const totalSales = todaysInvoices.reduce((sum: number, invoice: any) => {
      const invoiceTotal = invoice.items.reduce((t: number, item: any) => t + item.total, 0);
      return sum + invoiceTotal;
    }, 0);

    return { totalOrders, totalSales };
  }

  selectCategory(category: string) {
    const route = '/' + category;
    if (route) {
      this.router.navigate(['/menu-items', category])
    }
  }

  goToOrderDetails() {
    this.router.navigate(['order-details'])
  }

  goToAdmin() {
    console.log('Admin clicked');
    this.router.navigate(['admin'])
  }
}
