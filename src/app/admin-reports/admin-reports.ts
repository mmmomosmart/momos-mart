import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { BaseChartDirective } from 'ng2-charts';
import { Chart, registerables } from 'chart.js';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { InvoiceService } from '../service/invoice-service';
import { FirestoreService } from '../service/firestore.service';
import Swal from 'sweetalert2';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import * as XLSX from 'xlsx';

Chart.register(...registerables);

type ViewMode = 'WEEK' | 'MONTH' | 'YEAR';

@Component({
  selector: 'app-admin-reports',
  imports: [
    CommonModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatButtonModule,
    MatExpansionModule,
    BaseChartDirective
  ],
  templateUrl: './admin-reports.html',
  styleUrls: ['./admin-reports.scss']
})
export class AdminReports {
  invoiceService = inject(InvoiceService);
  firestoreService = inject(FirestoreService);

  constructor() { }

  invoice_details = signal<any[]>(
    this.invoiceService.getInvoicesFromLocalStorage('invoices')
  );

  invoices = signal<any[]>([]);
  loading = signal<boolean>(false);

  viewMode = signal<ViewMode>('WEEK');
  selectedBucket = signal<string | null>(null);

  async ngOnInit() {
    await this.loadOrders();
  }

  async loadOrders() {
    try {
      this.loading.set(true);
      const data = await this.firestoreService.getCollection<any>('invoices');
      console.log(data)
      this.invoices.set(data);
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

  // ---------- DATE HELPERS ----------
  parseDate(o: any): Date {
    const [d, m, y] = o.createdOn.date.split('/').map(Number);
    return new Date(y, m - 1, d);
  }

  startOfWeek(d: Date) {
    const x = new Date(d);
    const day = x.getDay() || 7;
    x.setDate(x.getDate() - day + 1);
    x.setHours(0, 0, 0, 0);
    return x;
  }

  weekOfMonth(d: Date) {
    const first = new Date(d.getFullYear(), d.getMonth(), 1).getDay();
    return Math.ceil((d.getDate() + first) / 7);
  }

  monthName(i: number) {
    return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i];
  }

  // ---------- AGGREGATION ----------
  aggregated = computed(() => {
    const map = new Map<string, number>();
    const now = new Date();

    for (const inv of this.filteredInvoices()) {
      const d = this.parseDate(inv);

      if (this.viewMode() === 'WEEK') {
        const s = this.startOfWeek(now);
        const e = new Date(s); e.setDate(s.getDate() + 6);
        if (d < s || d > e) continue;
        const k = d.toLocaleDateString('en-US', { weekday: 'short' });
        map.set(k, (map.get(k) || 0) + inv.total);
      }

      if (this.viewMode() === 'MONTH') {
        if (d.getMonth() !== now.getMonth()) continue;
        const k = `Week ${this.weekOfMonth(d)}`;
        map.set(k, (map.get(k) || 0) + inv.total);
      }

      if (this.viewMode() === 'YEAR') {
        if (d.getFullYear() !== now.getFullYear()) continue;
        const k = this.monthName(d.getMonth());
        map.set(k, (map.get(k) || 0) + inv.total);
      }
    }

    console.log(Array.from(map.entries()))
    return Array.from(map.entries());
  });

  // ---------- CHART ----------
  chartData = computed(() => ({
    labels: this.aggregated().map(x => x[0]),
    datasets: [{
      label: 'Sales ₹',
      data: this.aggregated().map(x => x[1]),
      backgroundColor: '#ff6b6b',
      borderColor: '#FFFFFF',
      borderWidth: 1,
      borderRadius: 6
    }]
  }));

  chartOptions = {
    responsive: true,
    onClick: (_: any, elements: any[]) => {
      if (!elements.length) return;
      const index = elements[0].index;
      this.selectedBucket.set(this.chartData().labels[index]);
    }
  };

  filteredInvoices = computed(() => {
    const now = new Date();

    return this.invoices().filter(inv => {
      const d = this.parseDate(inv);

      if (this.viewMode() === 'WEEK') {
        const s = this.startOfWeek(now);
        const e = new Date(s); e.setDate(s.getDate() + 6);
        return d >= s && d <= e;
      }

      if (this.viewMode() === 'MONTH') {
        return (
          d.getMonth() === now.getMonth() &&
          d.getFullYear() === now.getFullYear()
        );
      }

      if (this.viewMode() === 'YEAR') {
        return d.getFullYear() === now.getFullYear();
      }

      return true;
    });
  });


  // ---------- SUMMARY ----------
  totalSales = computed(() =>
    this.filteredInvoices().reduce((s, inv) => s + inv.total, 0)
  );

  totalInvoices = computed(() => this.filteredInvoices().length);

  avgSale = computed(() =>
    this.totalInvoices()
      ? Math.round(this.totalSales() / this.totalInvoices())
      : 0
  );


  // ---------- EXPORT ----------
  exportPDF() {
    const el = document.getElementById('chartBox')!;
    html2canvas(el).then(canvas => {
      const pdf = new jsPDF();
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 10, 10, 190, 100);
      pdf.save('sales-report.pdf');
    });
  }

  exportInvoicesPDF() {
    const pdf = new jsPDF();
    let y = 10;

    pdf.setFontSize(14);
    pdf.text('Sales Report', 10, y);
    y += 10;

    pdf.setFontSize(10);

    this.filteredInvoices().forEach((inv, i) => {
      pdf.text(
        `${i + 1}. ${inv.invoiceNumber} | ${inv.createdOn.date} | ₹${inv.total}`,
        10,
        y
      );
      y += 7;

      y += 4;
    });

    y += 5;
    pdf.setFontSize(12);
    pdf.text(`Total Sales: ₹${this.totalSales()}`, 10, y);

    pdf.save('filtered-invoices.pdf');
  }

  exportInvoicesExcel() {
    const rows = this.filteredInvoices().map(inv => ({
      Invoice: inv.invoiceNumber,
      Date: inv.createdOn.date,
      Items: inv.items.length,
      Total: inv.total
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Invoices');

    XLSX.writeFile(wb, 'filtered-invoices.xlsx');
  }

}
