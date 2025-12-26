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

Chart.register(...registerables);

type ViewMode = 'WEEK' | 'MONTH' | 'YEAR';

@Component({
  selector: 'app-admin-reports',
  imports: [
    CommonModule,
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
  constructor() {}

  invoices = signal<any[]>(
    this.invoiceService.getInvoicesFromLocalStorage('invoices')
  );

  viewMode = signal<ViewMode>('WEEK');
  selectedBucket = signal<string | null>(null);

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
    return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][i];
  }

  // ---------- AGGREGATION ----------
  aggregated = computed(() => {
    const map = new Map<string, number>();
    const now = new Date();

    for (const inv of this.invoices()) {
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

    return Array.from(map.entries());
  });

  // ---------- CHART ----------
  chartData = computed(() => ({
    labels: this.aggregated().map(x => x[0]),
    datasets: [{
      label: 'Sales ₹',
      data: this.aggregated().map(x => x[1]),
      backgroundColor: '#ff6b6b',
      borderColor:'#FFFFFF',
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

  // ---------- SUMMARY ----------
  totalSales = computed(() =>
    this.aggregated().reduce((s, x) => s + x[1], 0)
  );

  totalInvoices = computed(() => this.invoices().length);

  avgSale = computed(() =>
    this.totalInvoices() ? Math.round(this.totalSales() / this.totalInvoices()) : 0
  );

  // ---------- BAR CLICK → ORDERS ----------
  bucketOrders = computed(() => {
    if (!this.selectedBucket()) return [];
    const bucket = this.selectedBucket()!;
    const now = new Date();

    return this.invoices().filter(inv => {
      const d = this.parseDate(inv);

      if (this.viewMode() === 'WEEK')
        return d.toLocaleDateString('en-US', { weekday: 'short' }) === bucket;

      if (this.viewMode() === 'MONTH')
        return `Week ${this.weekOfMonth(d)}` === bucket;

      if (this.viewMode() === 'YEAR')
        return this.monthName(d.getMonth()) === bucket;

      return false;
    });
  });

  // ---------- EXPORT ----------
  exportPDF() {
    const el = document.getElementById('chartBox')!;
    html2canvas(el).then(canvas => {
      const pdf = new jsPDF();
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 10, 10, 190, 100);
      pdf.save('sales-report.pdf');
    });
  }
}
