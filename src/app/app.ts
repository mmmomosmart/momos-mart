import { Component, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { CartService } from './service/cart-service';
import { Product } from '../menu-category/product-model';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { PrinterService } from './service/printer-service';
import Swal from 'sweetalert2';
import { Capacitor } from '@capacitor/core';
import { InvoiceService } from './service/invoice-service';
import { FirestoreService } from './service/firestore.service';
import { Timestamp } from 'firebase/firestore';


@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet, MatButtonModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  constructor(
    private router: Router,
    private CartService: CartService,
    private printer: PrinterService,
    private invoiceService: InvoiceService,
    private fs: FirestoreService
  ) {
    // Detect route change
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.isAdminPage = event.url === ('/admin') || event.url.startsWith('/admin/');
        this.isMenuPage = event.url.startsWith('/menu-items/');
        this.isInvoicePage = event.url === '/invoice';
        this.isEditInvoicePage = event.url === '/edit-invoice';
      }
    });
  }
  protected readonly title = signal('momos-mart');

  orderdetails: Product[] = [];
  isAdminPage = false;
  disableBtn = true;
  isMenuPage = false;
  isInvoicePage = false;
  isEditInvoicePage = false;
  isInvoiceEdited = false;
  cartCount = 0;

  ngOnInit() {
    if (Capacitor.isNativePlatform()) {
      document.body.classList.add('native-app');
    }
    this.invoiceService.isInvoiceEdited.subscribe((edited) => {
      this.isInvoiceEdited = edited;
    });
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
    if (this.isInvoiceEdited) {
      this.router.navigate(['/edit-invoice']);
    }
    else {
      this.router.navigate(['/invoice']);
    }
  }

  getCurrentDateTime() {
    const today = new Date();

    const date_time = {
      date: today.getDate() + '/' + (today.getMonth() + 1) + '/' + today.getFullYear(),
      time: today.toLocaleTimeString()
    }

    return date_time;
  }

  saveInvoice(printAfterSave: boolean = false) {
    const invoice_number = this.invoiceService.getInvoiceNumber();

    const invoiceData = {
      invoiceNumber: invoice_number,
      createdOn: {
        date: this.getCurrentDateTime().date,
        time: this.getCurrentDateTime().time
      },
      createdAt: Timestamp.now(),
      items: this.orderdetails,
      total: this.CartService.getTotal()
    };

    // Get existing invoices or empty array
    this.invoiceService.getSetInvoicesToLocalStorage(invoiceData);

    //this.fs.add('invoices', invoiceData);
    this.fs.addWithId('invoices', invoiceData.invoiceNumber, invoiceData);

    // await this.firestoreService.addWithId('invoices', invoice.invoiceNumber, invoice);
    // this.firestoreService.clearDateCache('invoices', invoice.createdOn.date);



    //print the invoice
    if (printAfterSave)
      this.onPrintInvoice(invoiceData);

    this.CartService.clearCart();
    this.cartCount = 0;
    this.disableBtn = true;
    this.router.navigate(['/']);
  }

  showDialog() {
    Swal.fire({
      title: "Choose an option",
      icon: "question",

      showCancelButton: true,
      cancelButtonText: "Cancel",
      cancelButtonColor: "#e53935", // Material red

      showDenyButton: true,
      denyButtonText: "Save",
      denyButtonColor: "#1976d2", // Material blue

      showConfirmButton: true,
      confirmButtonText: "Save & Print",
      confirmButtonColor: "#43a047", // Material green

      reverseButtons: false
    }).then((result) => {

      if (result.isConfirmed) {
        // Save & Print selected
        this.saveInvoice(true);

        //Swal.fire("Done!", "Invoice saved & printed.", "success");
        Swal.fire({
          icon: "success",
          text: "Invoice saved & printed.",
          showConfirmButton: false,
          timer: 1000
        });
      }

      else if (result.isDenied) {
        // Save only selected
        this.saveInvoice(false);

        //Swal.fire("Saved!", "Invoice has been saved.", "success");
        Swal.fire({
          icon: "success",
          text: "Invoice saved.",
          showConfirmButton: false,
          timer: 1000
        });
      }

      else if (result.dismiss === Swal.DismissReason.cancel) {
        console.log("Cancelled");
      }

    });

  }

  async onPrintInvoice(invoiceData: any) {
    try {
      await this.printer.requestPermissions();

      const devices = await this.printer.listDevices();
      const ezo = devices.find(d => d.name && d.name.includes("EZO"));

      if (!ezo) {
        //alert("EZO Printer not found!");
        //Swal.fire("EZO Printer not found!", "", "error");
        Swal.fire({
          icon: "error",
          text: "EZO Printer not found!",
          showConfirmButton: false,
          timer: 1000
        });
        return;
      }

      await this.printer.connect(ezo.id || ezo.address);

      await this.printer.printInvoice(invoiceData);
      await this.printer.disconnect();

      //alert('Invoice printed successfully!');
    } catch (err: any) {
      //alert('Print failed: ' + (err?.message || JSON.stringify(err)));
      //Swal.fire('Print failed: ' + (err?.message || JSON.stringify(err)), "", "error");
      Swal.fire({
        icon: "error",
        title: "Print Failed",
        text: err?.message || JSON.stringify(err),
        showConfirmButton: false,
        timer: 1000
      });
    }
  }

  updateInvoiceV1() {
    const currentDate = this.getCurrentDateTime().date;

    const invoices = this.invoiceService.getInvoicesFromLocalStorage('invoices');
    const editedInvoice = this.invoiceService.getEditedInvoiceFromLocalStorage('editedInvoice');

    const updatedInvoices = invoices.map((invoice: any) =>
      invoice.createdOn.date === currentDate &&
        invoice.invoiceNumber === editedInvoice.invoiceNumber
        ? editedInvoice
        : invoice
    );

    const hasInvalidQuantity = editedInvoice.items.some((item: any) => !item.quantity || item.quantity < 1);
    if (hasInvalidQuantity) {
      //Swal.fire('Invalid quantity', 'Quantity must be at least 1', 'warning');
      Swal.fire({
          icon: "warning",
          text: "Invalid quantity.",
          showConfirmButton: false,
          timer: 1000
        });
      return;
    }

    this.fs.addWithId('invoices', editedInvoice.invoiceNumber, editedInvoice)

    // Save back to localStorage
    this.invoiceService.setInvoicesToLocalStorage(updatedInvoices);

    Swal.fire({
      icon: "success",
      text: "Invoice updated & saved.",
      showConfirmButton: false,
      timer: 1000
    });
    this.CartService.clearCart();
    this.cartCount = 0;
    this.invoiceService.isInvoiceEdited.next(false);
    this.invoiceService.setEditedInvoice({});
    this.disableBtn = true;
    this.router.navigate(['/']);
  }

  updateInvoiceV2() {
    const currentDate = this.getCurrentDateTime().date;

    const invoices = this.invoiceService.getInvoicesFromLocalStorage('invoices');
    const editedInvoice = this.invoiceService.getEditedInvoiceFromLocalStorage('editedInvoice');

    // Extract today's invoices
    const todaysInvoices = invoices.filter(
      (inv: any) => inv.createdOn.date === currentDate
    );

    // Update the edited one
    const updatedTodaysInvoices = todaysInvoices.map((inv: any) =>
      inv.invoiceNumber === editedInvoice.invoiceNumber
        ? editedInvoice
        : inv
    );

    // Merge back with non-today invoices
    const nonTodaysInvoices = invoices.filter(
      (inv: any) => inv.createdOn.date !== currentDate
    );

    const finalInvoices = [...nonTodaysInvoices, ...updatedTodaysInvoices];

    // Save
    this.invoiceService.setInvoicesToLocalStorage(finalInvoices);
    this.invoiceService.isInvoiceEdited.next(false);
    this.CartService.clearCart();
    this.cartCount = 0;
    this.invoiceService.setEditedInvoice({});
    this.disableBtn = true;
    this.router.navigate(['/']);
  }

}
