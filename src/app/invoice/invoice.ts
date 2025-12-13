import { Component } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { ActivatedRoute, Router } from '@angular/router';
import { CartService } from '../service/cart-service';
import { Product } from '../../menu-category/product-model';
import { MatIcon } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-invoice',
  imports: [CommonModule, MatTableModule, MatIcon, MatButtonModule],
  templateUrl: './invoice.html',
  styleUrl: './invoice.scss',
})

export class Invoice {
  constructor(private router: Router, private cartService: CartService) { }

  displayedColumns: string[] = ['name', 'quantity', 'price', 'total'];
  dataSource: Product[] = [];
  itemCount: number = 0;
  total: number = 0;
  hideActionBtns: boolean = false;
  billNo: string = '';
  dateAndTime: string = '';

  ngOnInit() {
    this.billNo = this.generateBillNo();
    this.dateAndTime = this.getCurrentDateTime();
    this.getOrderDetails();
  }

  getOrderDetails() {
    if (this.cartService.getInvoice()) {
      console.log(this.cartService.getInvoice())
      this.mapDataSource(this.cartService.getInvoice()?.items);
    } else {
      this.cartService.cart$.subscribe(items => {
        // Modify each item before setting to dataSource
        console.log(items);
        this.mapDataSource(items);
      });
    }
  }

  mapDataSource(items: Product[]) {
    this.dataSource = items.map(item => ({
      ...item,
      displayName: item.portion
        ? `${item.name} [${item.portion}]`
        : item.name
    }));
    this.itemCount = items.reduce((sum, item) => sum + (item.quantity ?? 1), 0);
    this.total = items.reduce((sum, item) => sum + (item.total || 0), 0);
    if (items.length === 0) this.hideActionBtns = true;
  }

  goToHome() {
    this.cartService.setInvoice(null);
    this.router.navigate(['/']);
  }

  editInvoice() {
    this.hideActionBtns = true;
    if (!this.displayedColumns.includes('action')) {
      this.displayedColumns.push('action');
    }
  }

  deleteInvoice() {
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
        Swal.fire({
          text: "Invoice has been deleted !",
          icon: "success",
          timer: 1500,
          showConfirmButton: false
        });
        this.cartService.clearCart();
        this.goToHome();
      }
    });
  }

  generateBillNo() {
    if (this.cartService.getInvoice()?.invoiceNumber) {
      return this.cartService.getInvoice()?.invoiceNumber;
    }
    else {
      const currentDate = new Date();

      const yyyy = currentDate.getFullYear();
      const mm = String(currentDate.getMonth() + 1).padStart(2, '0');
      const dd = String(currentDate.getDate()).padStart(2, '0');

      const hh = String(currentDate.getHours()).padStart(2, '0');
      const min = String(currentDate.getMinutes()).padStart(2, '0');
      const ss = String(currentDate.getSeconds()).padStart(2, '0');

      const invoiceNumber = `INV-${yyyy}${mm}${dd}-${hh}${min}${ss}`

      localStorage.setItem('invoiceNumber', invoiceNumber);

      return invoiceNumber;
    }
  }

  getCurrentDateTime() {
    if (this.cartService.getInvoice()?.createdOn) {
      return this.cartService.getInvoice()?.createdOn?.date + ' ' + this.cartService.getInvoice()?.createdOn?.time;
    }
    else {
      const today = new Date();
      const formattedDate = today.getDate() + '/' + (today.getMonth() + 1) + '/' + today.getFullYear();

      const time = today.toLocaleTimeString();

      return (formattedDate + ' ' + time);
    }
  }

  deleteItem(item: any) {
    console.log(item);
    this.cartService.removeItem(item);
  }

}

