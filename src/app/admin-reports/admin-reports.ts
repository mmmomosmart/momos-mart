import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
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

Chart.register(...registerables);

type ViewMode = 'WEEK' | 'MONTH' | 'YEAR';

type FilterType = 'DEFAULT' | 'DATE' | 'RANGE' | 'MONTH_YEAR';

@Component({
  selector: 'app-admin-reports',
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
    BaseChartDirective
  ],
  templateUrl: './admin-reports.html',
  styleUrls: ['./admin-reports.scss']
})

export class AdminReports {
  firestoreService = inject(FirestoreService);
  salesData = signal<any[]>([]);
  loading = signal<boolean>(false);

  viewMode = signal<ViewMode>('WEEK');
  filterType = signal<FilterType>('DEFAULT');
  selectedDate = signal<Date | null>(null);
  rangeStart = signal<Date | null>(null);
  rangeEnd = signal<Date | null>(null);

  selectedMonth = signal<number>(new Date().getMonth());
  selectedYear = signal<number>(new Date().getFullYear());

  months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  years =
    Array.from(
      {
        length: 11
      },
      (_, index) =>
        new Date().getFullYear() -
        5 +
        index
    );

  selectedBucket = signal<string | null>(null);

  constructor() {
    // Firestore is called only once
    this.loadSales();
  }

  async loadSales() {
    try {
      this.loading.set(true);
      const allSales = await this.firestoreService.getTotalSales();
      this.salesData.set(allSales);
    } catch (error) {
      console.error('Error loading TotalSales:',error);
      Swal.fire({
        icon: 'error',
        title: 'Try Again!',
        text: 'Failed to load sales report',
        timer: 1500,
        showConfirmButton: false
      });
    } finally {
      this.loading.set(false);
    }
  }


  // DEFAULT FILTER
  selectDefaultFilter(
    mode: ViewMode
  ) {
    this.viewMode.set(mode);
    this.filterType.set('DEFAULT');
    this.selectedBucket.set(null);
  }


  // CUSTOM FILTER
  selectCustomFilter(
    type:
      'DATE' |
      'RANGE' |
      'MONTH_YEAR'
  ) {
    this.filterType.set(type);
    this.selectedBucket.set(null);
  }


  // CLEAR FILTER
  clearCustomFilter() {
    this.filterType.set('DEFAULT');
    this.viewMode.set('WEEK');
    this.selectedDate.set(null);
    this.rangeStart.set(null);
    this.rangeEnd.set(null);
    this.selectedMonth.set(new Date().getMonth());
    this.selectedYear.set(new Date().getFullYear());
    this.selectedBucket.set(null);
  }


  // PARSE SALES DATE
  parseSalesDate(
    docId: string
  ): Date {
    const parts = docId.split(' ');
    const day = Number(parts[0]);
    const monthName = parts[1];
    const year = Number(parts[2]);
    return new Date(
      year,
      this.monthIndex(monthName),
      day
    );
  }


  // MONTH INDEX
  monthIndex(
    monthName: string
  ): number {
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    return months.indexOf(monthName);
  }


  // START OF DAY
  startOfDay(
    date: Date
  ): Date {
    const d = new Date(date);
    d.setHours(0,0,0,0);
    return d;
  }


  // END OF DAY
  endOfDay(
    date: Date
  ): Date {
    const d = new Date(date);
    d.setHours(23,59,59,999);
    return d;
  }


  // START OF WEEK:MONDAY
  startOfWeek(
    date: Date
  ): Date {
    const d = new Date(date);
    const day = d.getDay() || 7;
    d.setDate(d.getDate() - day + 1);
    d.setHours(0,0,0,0);
    return d;
  }


  // WEEK OF MONTH
  weekOfMonth(
    date: Date
  ): number {
    return Math.ceil(date.getDate() / 7);
  }

  filteredSales =
    computed(() => {
      const sales =
        this.salesData();

      if (this.filterType() === 'DATE') {
        const selected = this.selectedDate();
        if (!selected) {
          return [];
        }
        const start = this.startOfDay(selected);
        const end = this.endOfDay(selected);
        return sales.filter(
          sale => {
            const date = this.parseSalesDate(sale.id);
            return (
              date >= start &&
              date <= end
            );
          }
        );
      }

      if (this.filterType() === 'RANGE') {
        const from =this.rangeStart();
        const to = this.rangeEnd();
        if (!from || !to) {
          return [];
        }
        const start = this.startOfDay(from);
        const end = this.endOfDay(to);
        return sales.filter(
          sale => {
            const date = this.parseSalesDate(sale.id);
            return (
              date >= start &&
              date <= end
            );
          }
        );
      }

      if (this.filterType() === 'MONTH_YEAR') {
        const month = this.selectedMonth();
        const year = this.selectedYear();
        return sales.filter(
          sale => {
            const date = this.parseSalesDate(sale.id);
            return (
              date.getMonth() === month && date.getFullYear() === year
            );
          }
        );
      }

      // DEFAULT FILTERS
      const now = new Date();
      let start: Date;
      let end: Date;

      // WEEK
      if (this.viewMode() === 'WEEK') {
        start = this.startOfWeek(now);
        end = new Date(start);
        end.setDate(end.getDate() + 6);
        end = this.endOfDay(end);
      }

      // MONTH
      else if (this.viewMode() === 'MONTH') {
        start =
          new Date(
            now.getFullYear(),
            now.getMonth(),
            1
          );
        end =
          new Date(
            now.getFullYear(),
            now.getMonth() + 1,
            0
          );
        end =
          this.endOfDay(
            end
          );
      }

      // YEAR
      else {
        start =
          new Date(
            now.getFullYear(),
            0,
            1
          );
        end =
          new Date(
            now.getFullYear(),
            11,
            31
          );
        end =
          this.endOfDay(
            end
          );
      }

      return sales.filter(
        sale => {
          const date = this.parseSalesDate(sale.id);
          return (
            date >= start &&
            date <= end
          );
        }
      );
    });


  // TOTAL SALES
  totalSales =
    computed(() => {
      return this.filteredSales()
        .reduce(
          (
            sum,
            sale
          ) => {
            return (
              sum +
              (
                Number(
                  sale.total
                ) || 0
              )
            );
          },
          0
        );
    });

  // NUMBER OF DAYS
  numberOfDays =
    computed(() => {
      // PARTICULAR DATE
      if (this.filterType() === 'DATE') {
        return this.selectedDate()
          ? 1
          : 0;
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
        return Math.floor(
          (
            end.getTime() -
            start.getTime()
          )
          /
          (
            1000 *
            60 *
            60 *
            24
          )
        ) + 1;
      }

      // MONTH & YEAR
      if (this.filterType() === 'MONTH_YEAR') {
        return new Date(
          this.selectedYear(),
          this.selectedMonth() + 1,
          0
        ).getDate();
      }

      // WEEK
      if (this.viewMode() === 'WEEK') {
        return 7;
      }

      // MONTH
      if (this.viewMode() === 'MONTH') {
        const now = new Date();
        return new Date(
          now.getFullYear(),
          now.getMonth() + 1,
          0
        ).getDate();
      }

      // YEAR
      const year = new Date().getFullYear();
      return (
        new Date(
          year,
          1,
          29
        ).getMonth() === 1
      )
        ? 366
        : 365;
    });

  // AVERAGE SALE
  avgSale =
    computed(() => {
      const days = this.numberOfDays();
      if (!days) {
        return 0;
      }
      return Math.round(
        this.totalSales() /
        days
      );
    });

  // CHART AGGREGATION
  aggregated =
    computed(() => {
      const sales = this.filteredSales();
      const map =
        new Map<
          string,
          number
        >();

      // PARTICULAR DATE
      if (this.filterType() === 'DATE') {
        const total =
          sales.reduce(
            (
              sum,
              sale
            ) =>
              sum +
              (
                Number(
                  sale.total
                ) || 0
              ),
            0
          );

        const selected = this.selectedDate();
        const label =
          selected
            ? selected.toLocaleDateString(
              'en-GB'
            )
            : 'Select Date';
        return [
          [
            label,
            total
          ]
        ] as [string, number][];
      }

      // DATE RANGE
      if (this.filterType() === 'RANGE') {
        const from = this.rangeStart();
        const to = this.rangeEnd();
        if ( !from || !to ) {
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
        const salesMap =
          new Map<
            string,
            number
          >();

        // First aggregate actual sales
        for (const sale of sales) {
          const date = this.parseSalesDate(sale.id);
          const key = this.dateKey(date);
          const total = Number(sale.total) || 0;
          salesMap.set(
            key,
            (
              salesMap.get(key) ||
              0
            ) + total
          );
        }

        // Then create chronological dates
        while (current <= end) {
          const key = this.dateKey(current);
          result.push([
            this.formatDate(
              current
            ),
            salesMap.get(key) || 0
          ]);
          current.setDate(
            current.getDate() + 1
          );
        }
        return result;
      }

      // MONTH & YEAR
      if (this.filterType() === 'MONTH_YEAR') {
        for (const sale of sales){
          const date = this.parseSalesDate(sale.id);
          const key = `Week ${this.weekOfMonth(date)}`;
          const total = Number(sale.total) || 0;
          map.set(
            key,
            (
              map.get(key) ||
              0
            ) + total
          );
        }
        const weeks = [
          'Week 1',
          'Week 2',
          'Week 3',
          'Week 4',
          'Week 5'
        ];
        return weeks.map(
          week => [
            week,
            map.get(week) || 0
          ] as [string, number]
        );
      }

      //  DEFAULT WEEK / MONTH / YEAR
      for (const sale of sales) {
        const date = this.parseSalesDate(sale.id);
        const total = Number(sale.total) || 0;

        // WEEK
        if (this.viewMode() === 'WEEK') {
          const key =
            date.toLocaleDateString(
              'en-US',
              {
                weekday: 'short'
              }
            );
          map.set(
            key,
            (
              map.get(key) ||
              0
            ) + total
          );
        }

        // MONTH
        if (this.viewMode() === 'MONTH') {
          const key = `Week ${this.weekOfMonth(date)}`;
          map.set(
            key,
            (
              map.get(key) ||
              0
            ) + total
          );
        }

        // YEAR
        if (this.viewMode() === 'YEAR') {
          const key = this.monthName(date.getMonth());
          map.set(
            key,
            (
              map.get(key) ||
              0
            ) + total
          );
        }
      }

      // YEAR → JAN TO DEC
      if (this.viewMode() === 'YEAR') {
        return this.months.map(
          month => [
            month,
            map.get(month) || 0
          ] as [string, number]
        );
      }

      //  WEEK → MON TO SUN
      if (this.viewMode() === 'WEEK') {
        const days = [
          'Mon',
          'Tue',
          'Wed',
          'Thu',
          'Fri',
          'Sat',
          'Sun'
        ];
        return days.map(
          day => [
            day,
            map.get(day) || 0
          ] as [string, number]
        );
      }

      // MONTH → WEEK 1 TO WEEK 5
      const weeks = [
        'Week 1',
        'Week 2',
        'Week 3',
        'Week 4',
        'Week 5'
      ];
      return weeks.map(
        week => [
          week,
          map.get(week) || 0
        ] as [string, number]
      );
    });

  // MONTH NAME
  monthName(index: number): string {
    return this.months[index];
  }

  // DATE KEY
  dateKey(date: Date): string {
    return [
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    ].join('-');
  }

  // FORMAT DATE
  formatDate(date: Date): string {
    return date.toLocaleDateString(
      'en-GB'
    );
  }

  // CHART DATA
  chartData =
    computed(() => ({
      labels:
        this.aggregated()
          .map(
            item => item[0]
          ),
      datasets: [
        {
          label: 'Sales ₹',
          data:
            this.aggregated()
              .map(
                item => item[1]
              ),
          backgroundColor:
            '#ff6b6b',
          borderColor:
            '#FFFFFF',
          borderWidth: 1,
          borderRadius: 6
        }
      ]
    }));

  // CHART OPTIONS
  chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    onClick: (
      _: any,
      elements: any[]
    ) => {
      if (!elements.length) {
        return;
      }
      const index = elements[0].index;
      this.selectedBucket.set(
        this.chartData()
          .labels[index]
      );
    }
  };
}