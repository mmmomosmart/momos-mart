import { Component } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { ActivatedRoute, Router } from '@angular/router';
import { CartService } from '../service/cart-service';
import { Product } from '../../menu-category/product-model';
import { MatIcon } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import Swal from 'sweetalert2';
import { InvoiceService } from '../service/invoice-service';

@Component({
  selector: 'app-update-invoice',
  imports: [CommonModule, MatTableModule, MatIcon, MatButtonModule],
  templateUrl: './update-invoice.html',
  styleUrl: './update-invoice.scss',
})

export class UpdateInvoice {
  constructor(
    private router: Router,
    private cartService: CartService,
    private invoiceService: InvoiceService) { }

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
    const invoice = this.invoiceService.getInvoice();
    const invoiceItems: any = this.invoiceService.getInvoice()?.items || [];
    this.cartService.cart$.subscribe(cartItems => {
      if (!cartItems || !cartItems.length) return;

      cartItems.forEach(cartItem => {
        const existing = invoiceItems.find((item:any) =>
          item.name === cartItem.name &&
          item.portion === cartItem.portion
        );

        if (existing) {
          existing.quantity = (existing.quantity ?? 0) + (cartItem.quantity ?? 0);
          existing.total = existing.quantity * existing.price;
        } else {
          invoiceItems.push({
            ...cartItem,
            quantity: cartItem.quantity ?? 1,
            total: (cartItem.quantity ?? 1) * cartItem.price
          });
        }
      });
    });

      invoice.items = invoiceItems;
      invoice.total = invoice.items.reduce((sum: number, i: any) => sum + i.total, 0);
      this.invoiceService.setInvoice(invoice);
      this.mapDataSource(invoiceItems);
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
      if(items.length === 0) this.hideActionBtns = true;
  }

  goToHome() {
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
    if (this.invoiceService.getInvoice()?.invoiceNumber) {
      return this.invoiceService.getInvoice()?.invoiceNumber;
    }
  }

  getCurrentDateTime() {
    if (this.invoiceService.getInvoice()?.createdOn) {
      return this.invoiceService.getInvoice().createdOn.date + ' ' + this.invoiceService.getInvoice().createdOn.time;
    } else {
      return '';
    }
  }

  deleteItem(item: any) {
    console.log(item);
    console.log(this.dataSource);
    const invoice = this.invoiceService.getInvoice();
    const invoiceItems = this.invoiceService.getInvoice().items;
    const updated = invoiceItems.filter((i: any) =>
      !(i.name === item.name && i.portion === item.portion)
    );
    invoice.items = updated;
    invoice.total = invoice.items.reduce((sum: number, i: any) => sum + i.total, 0);
    console.log(invoice);
    this.invoiceService.setInvoice(invoice)
    this.mapDataSource(updated);
  }

}

