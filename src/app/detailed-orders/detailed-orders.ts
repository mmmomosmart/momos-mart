import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatExpansionModule, MatExpansionPanel } from '@angular/material/expansion';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { PageEvent } from '@angular/material/paginator';
import { MatPaginatorModule } from '@angular/material/paginator';
import { InvoiceService } from '../service/invoice-service';
import { FirestoreService } from '../service/firestore.service';
import Swal from 'sweetalert2';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-detailed-orders',
  standalone: true,
  imports: [
    CommonModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatButtonModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatFormFieldModule,
    MatInputModule,
    MatExpansionModule,
    ReactiveFormsModule,
    MatDividerModule,
    MatPaginatorModule
  ],
  templateUrl: './detailed-orders.html',
  styleUrls: ['./detailed-orders.scss']
})
export class DetailedOrders {
  invoiceService = inject(InvoiceService);
  firestoreService = inject(FirestoreService);

  constructor() {
    effect(() => {
      this.filteredOrders();
      this.pageIndex.set(0);
    });
  }


  // ===== RAW ORDERS =====
  //orders = signal<any[]>(this.invoiceService.getInvoicesFromLocalStorage('invoices'));
  orders = signal<any[]>([]);
  loading = signal<boolean>(false);


  // ===== DATE FILTERS =====
  selectedDate = signal<Date | null>(new Date()); // default today
  fromDate = signal<Date | null>(null);
  toDate = signal<Date | null>(null);

  pageIndex = signal(0);
  pageSize = signal(5);

  viewMode = signal<string>('');

  async ngOnInit() {
    await this.loadOrders();
  }

  async loadOrders() {
    try {
      this.loading.set(true);
      const from = this.fromDate();
      const to = this.toDate();
      const data = from && to
        ? await this.firestoreService.getInvoicesByRange(from, this.endOfDay(to))
        : await this.firestoreService.getInvoicesByDate(
          this.formatDate(this.selectedDate() ?? new Date())
        );
      console.log('Total invoices loaded:', data.length);
      this.orders.set(data);
    } catch (err) {
      Swal.fire({
        icon: "warning",
        text: "Invalid quantity.",
        showConfirmButton: false,
        timer: 1000
      });
    } finally {
      this.loading.set(false);
    }
  }

  onPageChange(e: PageEvent) {
    this.pageIndex.set(e.pageIndex);
    this.pageSize.set(e.pageSize);
  }

  paginatedGroupedOrders = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    const end = start + this.pageSize();
    const pageEntries = this.filteredOrderEntries().slice(start, end);
    const map = new Map<string, any[]>();

    for (const { order, parsedDate } of pageEntries) {
      const key = parsedDate.toDateString();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(order);
    }

    return Array.from(map.entries()).map(([date, orders]) => ({
      date,
      orders,
      total: orders.reduce((sum, order) => sum + order.total, 0)
    }));
  });

  onSelectedDate(date: Date | null, panel: MatExpansionPanel) {
    this.viewMode.set('');
    if (!date) return;

    this.selectedDate.set(date);
    this.fromDate.set(null);
    this.toDate.set(null);

    panel.close();
    void this.loadOrders();
  }

  onFromDateChange(date: Date | null, panel: MatExpansionPanel) {
    this.viewMode.set('');
    this.fromDate.set(date);

    // clear single date
    //this.selectedDate.set(null);

    // only close when BOTH dates are selected
    if (this.fromDate() && this.toDate()) {
      panel.close();
    }
  }

  onToDateChange(date: Date | null, panel: MatExpansionPanel) {
    this.viewMode.set('');
    this.toDate.set(date);

    // clear single date
    //this.selectedDate.set(null);

    // only close when BOTH dates are selected
    if (this.fromDate() && this.toDate()) {
      this.selectedDate.set(null);
      panel.close();
      void this.loadOrders();
    }
  }

  resetFilters(panel: MatExpansionPanel) {
    this.viewMode.set('');
    // reset to today
    this.selectedDate.set(new Date());

    // clear range
    this.fromDate.set(null);
    this.toDate.set(null);
    panel.close();
    void this.loadOrders();
  }


  // ===== DATE PARSER =====
  parseOrderDate(order: any): Date {
    const [dd, mm, yyyy] = order.createdOn.date.split('/').map(Number);
    return new Date(yyyy, mm - 1, dd);
  }

  endOfDay(d: Date) {
    const x = new Date(d);
    x.setHours(23, 59, 59, 999);
    return x;
  }

  ordersWithParsedDate = computed(() =>
    this.orders().map(order => ({
      order,
      parsedDate: this.parseOrderDate(order)
    }))
  );

  // ===== FILTERED ORDERS =====
  filteredOrderEntries = computed(() => {
    const list = this.ordersWithParsedDate();
    const from = this.fromDate();
    const to = this.toDate();

    if (from && to) {
      const end = this.endOfDay(to);
      return list.filter(({ parsedDate }) => parsedDate >= from && parsedDate <= end);
    } else if (this.selectedDate()) {
      const selectedDate = this.selectedDate()!;
      return list.filter(({ parsedDate }) => parsedDate.toDateString() === selectedDate.toDateString());
    }

    return list;
  });

  filteredOrders = computed(() =>
    this.filteredOrderEntries().map(({ order }) => order)
  );

  grandTotal = computed(() =>
    this.filteredOrders().reduce((s, o) => s + o.total, 0)
  );

  saveTotal() {
    if (this.selectedDate()) {
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
          //const salesDate = new Date().getDate() + " " + new Date().toLocaleString('en-US', { month: 'long' }) + " " + (new Date().getFullYear());
          const salesDate = this.selectedDate()!.getDate() + " " + this.selectedDate()!.toLocaleString('en-US', { month: 'long' }) + " " + (this.selectedDate()!.getFullYear());
          console.log(salesDate);
          const totalSalesValue = {
            total: this.grandTotal(),
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
  
    }}

  trackByInvoice(_: number, o: any) {
    return o.invoiceNumber;
  }

  private startOfDay(d: Date) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  private startOfWeek(d: Date) {
    const day = d.getDay(); // 0 = Sunday
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday start
    return new Date(d.getFullYear(), d.getMonth(), diff);
  }

  setYesterday(panel: MatExpansionPanel) {
    this.viewMode.set('Yesterday');
    const y = new Date();
    y.setDate(y.getDate() - 1);

    this.selectedDate.set(this.startOfDay(y));
    this.fromDate.set(null);
    this.toDate.set(null);

    panel.close();
    void this.loadOrders();
  }

  setThisWeek(panel: MatExpansionPanel) {
    this.viewMode.set('Week');
    const today = this.startOfDay(new Date());

    this.selectedDate.set(null); // IMPORTANT
    this.fromDate.set(this.startOfWeek(today));
    this.toDate.set(today);

    panel.close();
    void this.loadOrders();
  }

  private startOfMonth(d: Date) {
    return new Date(d.getFullYear(), d.getMonth(), 1);
  }

  setThisMonth(panel: MatExpansionPanel) {
    this.viewMode.set('Month');
    const today = this.startOfDay(new Date());

    this.selectedDate.set(null);
    this.fromDate.set(this.startOfMonth(today));
    this.toDate.set(today);

    panel.close();
    void this.loadOrders();
  }

  private formatDate(date: Date) {
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
  }


}
