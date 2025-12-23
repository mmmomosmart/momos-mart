import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatExpansionModule, MatExpansionPanel } from '@angular/material/expansion';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';

@Component({
  selector: 'app-detailed-orders',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatFormFieldModule,
    MatInputModule,
    MatExpansionModule,
    ReactiveFormsModule,
    MatDividerModule
  ],
  templateUrl: './detailed-orders.html',
  styleUrls: ['./detailed-orders.scss']
})
export class DetailedOrders {

  // ===== RAW ORDERS =====
  orders = signal<any[]>(JSON.parse(localStorage.getItem('invoices') || '[]'));

  // ===== DATE FILTERS =====
  selectedDate = signal<Date | null>(new Date()); // default today
  fromDate = signal<Date | null>(null);
  toDate = signal<Date | null>(null);

 onSelectedDate(date: Date | null, panel: MatExpansionPanel) {
  if (!date) return;

  this.selectedDate.set(date);
  this.fromDate.set(null);
  this.toDate.set(null);

  panel.close();
}

onFromDateChange(date: Date | null, panel: MatExpansionPanel) {
  this.fromDate.set(date);

  // clear single date
  //this.selectedDate.set(null);

  // only close when BOTH dates are selected
  if (this.fromDate() && this.toDate()) {
    panel.close();
  }
}

onToDateChange(date: Date | null, panel: MatExpansionPanel) {
  this.toDate.set(date);

  // clear single date
  //this.selectedDate.set(null);

  // only close when BOTH dates are selected
  if (this.fromDate() && this.toDate()) {
    this.selectedDate.set(null);
    panel.close();
  }
}

resetFilters(panel: MatExpansionPanel) {
  // reset to today
  this.selectedDate.set(new Date());

  // clear range
  this.fromDate.set(null);
  this.toDate.set(null);
  panel.close();
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

  // ===== FILTERED ORDERS =====
  filteredOrders = computed(() => {
    const list = this.orders();

    if (this.fromDate() && this.toDate()) {
      return list.filter(o => {
        const d = this.parseOrderDate(o);
        return d >= this.fromDate()! && d <= this.endOfDay(this.toDate()!);
      });
    } else if (this.selectedDate()) {
      const sel = this.selectedDate()!;
      return list.filter(o => this.parseOrderDate(o).toDateString() === sel.toDateString());
    }

    return list;
  });

  // ===== GROUP BY DATE =====
  groupedOrders = computed(() => {
    const map = new Map<string, any[]>();
    for (const o of this.filteredOrders()) {
      const key = this.parseOrderDate(o).toDateString();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(o);
    }

    return Array.from(map.entries()).map(([date, orders]) => ({
      date,
      orders,
      total: orders.reduce((s, o) => s + o.total, 0)
    }));
  });

  grandTotal = computed(() =>
    this.filteredOrders().reduce((s, o) => s + o.total, 0)
  );

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
  const y = new Date();
  y.setDate(y.getDate() - 1);

  this.selectedDate.set(this.startOfDay(y));
  this.fromDate.set(null);
  this.toDate.set(null);

  panel.close();
}

setThisWeek(panel: MatExpansionPanel) {
  const today = this.startOfDay(new Date());

  this.selectedDate.set(null); // IMPORTANT
  this.fromDate.set(this.startOfWeek(today));
  this.toDate.set(today);

  panel.close();
}

private startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

setThisMonth(panel: MatExpansionPanel) {
  const today = this.startOfDay(new Date());

  this.selectedDate.set(null);
  this.fromDate.set(this.startOfMonth(today));
  this.toDate.set(today);

  panel.close();
}


}
