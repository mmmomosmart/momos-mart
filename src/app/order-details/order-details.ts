import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIcon } from '@angular/material/icon';
import { Router } from '@angular/router';
import { Product } from '../../menu-category/product-model';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-order-details',
  imports: [CommonModule, MatIcon, MatExpansionModule, MatTableModule, MatButtonModule],
  templateUrl: './order-details.html',
  styleUrl: './order-details.scss',
})
export class OrderDetails {
  todaysInvoices: any;
  invoices: any;
  constructor(private router: Router) { }
  readonly panelOpenState = signal(false);
  displayedColumns: string[] = ['name', 'portion', 'quantity', 'price'];

  ngOnInit() {
    this.getOrderStats();
  }

  getCurrentDate() {
    const today = new Date();
    return today.getDate() + '/' + (today.getMonth() + 1) + '/' + today.getFullYear();
  }

  getOrderStats() {
    const currentDate = this.getCurrentDate();
    this.invoices = JSON.parse(localStorage.getItem('invoices') || '[]');

    this.todaysInvoices = this.invoices.filter((inv: any) =>
      inv.createdOn.date === currentDate
    );

    const totalOrders = this.todaysInvoices.length;
  }

  goToHome() {
    this.router.navigate(['/']);
  }

  editInvoice(p:any) {
    console.log(p)
  }
}
