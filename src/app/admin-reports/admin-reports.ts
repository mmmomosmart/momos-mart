import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { BaseChartDirective } from 'ng2-charts';
import { Chart, registerables } from 'chart.js';
import { FirestoreService } from '../service/firestore.service';
import Swal from 'sweetalert2';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

Chart.register(...registerables);

type ViewMode = 'WEEK' | 'MONTH' | 'YEAR';
type FilterType = 'DEFAULT' | 'DATE' | 'RANGE' | 'MONTH_YEAR';

interface SalesRecord {
  id: string;
  total: number;
}

// CONSTANTS
const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];
const MONTHS_FULL = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const MONTH_INDEX_MAP = new Map(MONTHS_FULL.map((m, i) => [m, i]));
const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const WEEKS_OF_MONTH = ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5'];

@Component({
  selector: 'app-admin-reports',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    BaseChartDirective,
  ],
  templateUrl: './admin-reports.html',
  styleUrls: ['./admin-reports.scss'],
})
export class AdminReports {
  firestoreService = inject(FirestoreService);
  salesData = signal<SalesRecord[]>([]);
  loading = signal<boolean>(false);
  private readonly reportDate = new Date();
  private loadRequestId = 0;

  viewMode = signal<ViewMode>('WEEK');
  filterType = signal<FilterType>('DEFAULT');
  selectedDate = signal<Date | null>(null);
  rangeStart = signal<Date | null>(null);
  rangeEnd = signal<Date | null>(null);

  selectedMonth = signal<number>(this.reportDate.getMonth());
  selectedYear = signal<number>(this.reportDate.getFullYear());

  months = MONTHS_SHORT;
  years = Array.from({ length: 11 }, (_, i) => this.reportDate.getFullYear() - 5 + i);

  // Date parsing cache for performance
  private readonly parseDateCache = new Map<string, Date>();

  constructor() {
    // Firestore is called only once
    this.loadSales();
  }

  async loadSales() {
    const requestId = ++this.loadRequestId;

    try {
      this.loading.set(true);
      const range = this.getActiveDateRange();
      if (!range) {
        this.salesData.set([]);
        return;
      }

      const sales = await this.firestoreService.getTotalSalesByRange(range[0], range[1]);
      if (requestId !== this.loadRequestId) return;
      this.salesData.set(sales);
    } catch (error) {
      if (requestId !== this.loadRequestId) return;
      Swal.fire({
        icon: 'error',
        title: 'Try Again!',
        text: 'Failed to load sales report',
        timer: 1500,
        showConfirmButton: false,
      });
    } finally {
      if (requestId === this.loadRequestId) {
        this.loading.set(false);
      }
    }
  }

  // DEFAULT FILTER
  selectDefaultFilter(mode: ViewMode) {
    this.viewMode.set(mode);
    this.filterType.set('DEFAULT');
    void this.loadSales();
  }

  // CUSTOM FILTER
  selectCustomFilter(type: 'DATE' | 'RANGE' | 'MONTH_YEAR') {
    this.filterType.set(type);
    void this.loadSales();
  }

  // CLEAR FILTER
  clearCustomFilter() {
    this.filterType.set('DEFAULT');
    this.viewMode.set('WEEK');
    this.selectedDate.set(null);
    this.rangeStart.set(null);
    this.rangeEnd.set(null);
    this.selectedMonth.set(this.reportDate.getMonth());
    this.selectedYear.set(this.reportDate.getFullYear());
    void this.loadSales();
  }

  private getActiveDateRange(): [Date, Date] | null {
    if (this.filterType() === 'DATE') {
      const date = this.selectedDate();
      return date ? [this.startOfDay(date), this.endOfDay(date)] : null;
    }

    if (this.filterType() === 'RANGE') {
      const start = this.rangeStart();
      const end = this.rangeEnd();
      return start && end ? [this.startOfDay(start), this.endOfDay(end)] : null;
    }

    if (this.filterType() === 'MONTH_YEAR') {
      const year = this.selectedYear();
      const month = this.selectedMonth();
      return [
        new Date(year, month, 1),
        this.endOfDay(new Date(year, month + 1, 0))
      ];
    }

    return this.getDateRange(this.viewMode());
  }

  onSelectedDateChange(date: Date | null) {
    this.selectedDate.set(date);
    void this.loadSales();
  }

  onRangeStartChange(date: Date | null) {
    this.rangeStart.set(date);
    if (this.rangeEnd()) void this.loadSales();
  }

  onRangeEndChange(date: Date | null) {
    this.rangeEnd.set(date);
    if (this.rangeStart()) void this.loadSales();
  }

  onMonthChange(month: number) {
    this.selectedMonth.set(month);
    void this.loadSales();
  }

  onYearChange(year: number) {
    this.selectedYear.set(year);
    void this.loadSales();
  }

  // PARSE SALES DATE (cached)
  parseSalesDate(docId: string): Date {
    if (this.parseDateCache.has(docId)) {
      return this.parseDateCache.get(docId)!;
    }
    const parts = docId.split(' ');
    const day = Number(parts[0]);
    const monthName = parts[1];
    const year = Number(parts[2]);
    const date = new Date(year, MONTH_INDEX_MAP.get(monthName) ?? 0, day);
    this.parseDateCache.set(docId, date);
    return date;
  }

  // START OF DAY
  startOfDay(date: Date): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  // END OF DAY
  endOfDay(date: Date): Date {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
  }

  // START OF WEEK:MONDAY
  startOfWeek(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay() || 7;
    d.setDate(d.getDate() - day + 1);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  // WEEK OF MONTH
  weekOfMonth(date: Date): number {
    return Math.ceil(date.getDate() / 7);
  }

  // GET DATE RANGE helper
  private getDateRange(viewMode: ViewMode): [Date, Date] {
    const now = this.reportDate;
    let start: Date, end: Date;

    if (viewMode === 'WEEK') {
      start = this.startOfWeek(now);
      end = new Date(start);
      end.setDate(end.getDate() + 6);
      end = this.endOfDay(end);
    } else if (viewMode === 'MONTH') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      end = this.endOfDay(end);
    } else {
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now.getFullYear(), 11, 31);
      end = this.endOfDay(end);
    }
    return [start, end];
  }

  // SAFE SALE TOTAL helper
  private getSaleTotal(sale: SalesRecord): number {
    return Number(sale.total) || 0;
  }

  filteredSales = computed(() => {
    const sales = this.salesData();
    const filterType = this.filterType();

    if (filterType === 'DATE') {
      const selected = this.selectedDate();
      if (!selected) return [];
      const start = this.startOfDay(selected);
      const end = this.endOfDay(selected);
      return sales.filter((sale) => {
        const date = this.parseSalesDate(sale.id);
        return date >= start && date <= end;
      });
    }

    if (filterType === 'RANGE') {
      const from = this.rangeStart();
      const to = this.rangeEnd();
      if (!from || !to) return [];
      const start = this.startOfDay(from);
      const end = this.endOfDay(to);
      return sales.filter((sale) => {
        const date = this.parseSalesDate(sale.id);
        return date >= start && date <= end;
      });
    }

    if (filterType === 'MONTH_YEAR') {
      const month = this.selectedMonth();
      const year = this.selectedYear();
      return sales.filter((sale) => {
        const date = this.parseSalesDate(sale.id);
        return date.getMonth() === month && date.getFullYear() === year;
      });
    }

    // DEFAULT FILTERS
    const [start, end] = this.getDateRange(this.viewMode());
    return sales.filter((sale) => {
      const date = this.parseSalesDate(sale.id);
      return date >= start && date <= end;
    });
  });

  // TOTAL SALES
  totalSales = computed(() =>
    this.aggregated().reduce((sum, [, total]) => sum + total, 0)
  );

  // NUMBER OF DAYS
  numberOfDays = computed(() => {
    // PARTICULAR DATE
    if (this.filterType() === 'DATE') {
      return this.selectedDate() ? 1 : 0;
    }

    // DATE RANGE
    if (this.filterType() === 'RANGE') {
      const from = this.rangeStart();
      const to = this.rangeEnd();
      if (!from || !to) {
        return 0;
      }
      const start = this.startOfDay(from);
      const end = this.startOfDay(to);
      return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    }

    // MONTH & YEAR
    if (this.filterType() === 'MONTH_YEAR') {
      return new Date(this.selectedYear(), this.selectedMonth() + 1, 0).getDate();
    }

    // WEEK
    if (this.viewMode() === 'WEEK') {
      return 7;
    }

    // MONTH
    if (this.viewMode() === 'MONTH') {
      const now = this.reportDate;
      return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    }

    // YEAR
    const year = this.reportDate.getFullYear();
    return new Date(year, 1, 29).getMonth() === 1 ? 366 : 365;
  });

  // AVERAGE SALE
  avgSale = computed(() => {
    const days = this.numberOfDays();
    if (!days) {
      return 0;
    }
    return Math.round(this.totalSales() / days);
  });

  // CHART AGGREGATION
  aggregated = computed(() => {
    const sales = this.filteredSales();
    const map = new Map<string, number>();

    // PARTICULAR DATE
    if (this.filterType() === 'DATE') {
      const total = sales.reduce((sum, sale) => sum + this.getSaleTotal(sale), 0);

      const selected = this.selectedDate();
      const label = selected ? selected.toLocaleDateString('en-GB') : 'Select Date';
      return [[label, total]] as [string, number][];
    }

    // DATE RANGE
    if (this.filterType() === 'RANGE') {
      const from = this.rangeStart();
      const to = this.rangeEnd();
      if (!from || !to) {
        return [];
      }

      /*
       * Create every date in the range.
       * This means dates with zero sales
       * are also shown.
       */
      const result: [string, number][] = [];
      const current = this.startOfDay(from);
      const end = this.startOfDay(to);
      const salesMap = new Map<string, number>();

      // First aggregate actual sales
      for (const sale of sales) {
        const date = this.parseSalesDate(sale.id);
        const key = this.dateKey(date);
        const total = this.getSaleTotal(sale);
        salesMap.set(key, (salesMap.get(key) || 0) + total);
      }

      // Then create chronological dates
      while (current <= end) {
        const key = this.dateKey(current);
        result.push([this.formatDate(current), salesMap.get(key) || 0]);
        current.setDate(current.getDate() + 1);
      }
      return result;
    }

    // MONTH & YEAR
    if (this.filterType() === 'MONTH_YEAR') {
      for (const sale of sales) {
        const date = this.parseSalesDate(sale.id);
        const key = `Week ${this.weekOfMonth(date)}`;
        const total = this.getSaleTotal(sale);
        map.set(key, (map.get(key) || 0) + total);
      }
      return WEEKS_OF_MONTH.map((week) => [week, map.get(week) || 0] as [string, number]);
    }

    //  DEFAULT WEEK / MONTH / YEAR
    for (const sale of sales) {
      const date = this.parseSalesDate(sale.id);
      const total = this.getSaleTotal(sale);

      // WEEK
      if (this.viewMode() === 'WEEK') {
        const key = date.toLocaleDateString('en-US', {
          weekday: 'short',
        });
        map.set(key, (map.get(key) || 0) + total);
      }

      // MONTH
      if (this.viewMode() === 'MONTH') {
        const key = `Week ${this.weekOfMonth(date)}`;
        map.set(key, (map.get(key) || 0) + total);
      }

      // YEAR
      if (this.viewMode() === 'YEAR') {
        const key = this.monthName(date.getMonth());
        map.set(key, (map.get(key) || 0) + total);
      }
    }

    // YEAR → JAN TO DEC
    if (this.viewMode() === 'YEAR') {
      return MONTHS_SHORT.map((month) => [month, map.get(month) || 0] as [string, number]);
    }

    // WEEK → MON TO SUN
    if (this.viewMode() === 'WEEK') {
      return DAYS_OF_WEEK.map((day) => [day, map.get(day) || 0] as [string, number]);
    }

    // MONTH → WEEK 1 TO WEEK 5
    return WEEKS_OF_MONTH.map((week) => [week, map.get(week) || 0] as [string, number]);
  });

  // MONTH NAME
  monthName(index: number): string {
    return MONTHS_SHORT[index];
  }

  // DATE KEY
  dateKey(date: Date): string {
    return [date.getFullYear(), date.getMonth(), date.getDate()].join('-');
  }

  // FORMAT DATE
  formatDate(date: Date): string {
    return date.toLocaleDateString('en-GB');
  }

  // CHART DATA
  chartData = computed(() => {
    const aggregated = this.aggregated();
    return {
      labels: aggregated.map((item) => item[0]),
      datasets: [
        {
          label: 'Sales ₹',
          data: aggregated.map((item) => item[1]),
          backgroundColor: '#ff6b6b',
          borderColor: '#FFFFFF',
          borderWidth: 1,
          borderRadius: 6,
        },
      ],
    };
  });

  // CHART OPTIONS
  chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
  };

  getFilterLabel(): string {
    const range = this.getActiveDateRange();
    if (!range) return 'No date selected';

    const [start, end] = range;
    return start.toDateString() === end.toDateString()
      ? this.formatDate(start)
      : `${this.formatDate(start)} - ${this.formatDate(end)}`;
  }

  async exportPdf() {
    try {
      const doc = new jsPDF();
      const rows = this.getPdfRows();
      const logo = await this.loadLogo();
      const contentX = logo ? 44 : 14;

      if (logo) {
        doc.addImage(logo, 'PNG', 14, 8, 24, 24);
      }

      doc.setFontSize(16);
      doc.text('Momos Mart - Sales Report', contentX, 15);
      doc.setFontSize(11);
      doc.text(`Period: ${this.getFilterLabel()}`, contentX, 24);
      doc.text(`Total Sales: Rs ${this.totalSales()}`, contentX, 32);

      autoTable(doc, {
        head: [['Period', 'Sales']],
        body: rows,
        startY: 40,
        styles: { fontSize: 10 },
      });

      const fileName = `Momos Mart - Sales Report.pdf`;
      if (Capacitor.isNativePlatform()) {
        const base64 = doc.output('datauristring').split(',')[1];
        await Filesystem.writeFile({
          path: fileName,
          data: base64,
          directory: Directory.Documents,
        });

        const fileUri = await Filesystem.getUri({
          directory: Directory.Documents,
          path: fileName,
        });

        await Share.share({
          title: 'Momos Mart Sales Report',
          files: [fileUri.uri],
        });
      } else {
        doc.save(fileName);
      }
    } catch (error: any) {
      if (error?.message?.toLowerCase().includes('cancel')) return;

      Swal.fire({
        title: 'Export Failed',
        text: error?.message || 'Unable to export sales report',
        icon: 'error',
        timer: 1200,
        showConfirmButton: false,
      });
    }
  }

  private async loadLogo(): Promise<string | null> {
    try {
      const response = await fetch('assets/icons/icon_512x512.png');
      const blob = await response.blob();

      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  }

  private getPdfRows(): string[][] {
    const totalsByDate = new Map(
      this.filteredSales().map(sale => [
        this.dateKey(this.parseSalesDate(sale.id)),
        this.getSaleTotal(sale)
      ])
    );
    const range = this.getActiveDateRange();

    if (!range) return [];

    const rows: string[][] = [];
    const current = this.startOfDay(range[0]);
    const end = this.startOfDay(range[1]);

    while (current <= end) {
      const key = this.dateKey(current);
      const total = totalsByDate.get(key) || 0;
      rows.push([
        `${current.toLocaleDateString('en-US', { weekday: 'short' })} - ${this.formatDate(current)}`,
        `Rs ${total}`
      ]);
      current.setDate(current.getDate() + 1);
    }

    return rows;
  }
}
