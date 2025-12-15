import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatExpansionModule } from '@angular/material/expansion';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { MatDialog } from '@angular/material/dialog';
import { ExpenseFilterDialog } from '../expense-filter-dialog/expense-filter-dialog';


export interface Expense {
  item: string;
  amount: number;
  purchaseDate: Date;
  status: 'Paid' | 'Due';
}

@Component({
  selector: 'app-expense-list',
  imports: [
    CommonModule,
    MatTableModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatChipsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatExpansionModule,
    ReactiveFormsModule
  ],
  templateUrl: './expense-list.html',
  styleUrl: './expense-list.scss',
})
export class ExpenseList {
  today = new Date();

  private fb = inject(FormBuilder);
  private dialog = inject(MatDialog);


  filterForm = this.fb.group({
    item: [''],
    status: [''],
    purchaseDate: [this.normalizeDate(new Date()) as Date | null],
    fromDate: [null as Date | null],
    toDate: [null as Date | null]
  });


  constructor() {
    const today = this.normalizeDate(new Date());
    this.dateFilter.set(today);
    this.filterForm.valueChanges.subscribe(value => {

      // If range is selected → clear single date
      if (value.fromDate || value.toDate) {
        this.filterForm.patchValue(
          { purchaseDate: null },
          { emitEvent: false }
        );
        this.dateFilter.set(null);
      }

      this.itemFilter.set(value.item ?? '');
      this.statusFilter.set(value.status ?? '');
      this.dateFilter.set(value.purchaseDate ?? null);
      this.fromDate.set(value.fromDate ?? null);
      this.toDate.set(value.toDate ?? null);
    });

  }

  items = ['Noodles', 'Vegetables', 'Paneer', 'Chicken', 'Egg', 'Onion', 'Gas Cylinder', 'Oil', 'Raw Material'];

  // displayedColumns = ['item', 'amount', 'purchaseDate', 'status', 'actions'];
  displayedColumns = ['item', 'amount', 'purchaseDate', 'status'];

  expenses = signal<Expense[]>(JSON.parse(localStorage.getItem('expenses') || '[]'));

  // Filters
  itemFilter = signal('');
  statusFilter = signal('');
  dateFilter = signal<Date | null>(null);
  fromDate = signal<Date | null>(null);
  toDate = signal<Date | null>(null);

  private normalizeDate(d: Date) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  openFilterDialog() {
    this.dialog.open(ExpenseFilterDialog, {
      width: '360px',
      maxWidth: '95vw',
      autoFocus: false,
      panelClass: 'expense-filter-dialog',
      data: {
        form: this.filterForm,
        items: this.items,
        clear: () => this.clearFilters(),
        setToday: () => this.setToday(),
        setThisWeek: () => this.setThisWeek(),
        setThisMonth: () => this.setThisMonth()
      }
    });
  }



  filteredExpenses = computed(() => {
    return this.expenses().filter(e => {

      const matchItem = this.itemFilter()
        ? e.item.toLowerCase().includes(this.itemFilter().toLowerCase())
        : true;

      const matchStatus = this.statusFilter()
        ? e.status === this.statusFilter()
        : true;

      const hasRange = this.fromDate() && this.toDate();

      const matchDate = hasRange
        ? new Date(e.purchaseDate) >= new Date(this.fromDate()!) &&
        new Date(e.purchaseDate) <= new Date(this.toDate()!)
        : this.dateFilter()
          ? new Date(e.purchaseDate).toDateString() ===
          new Date(this.dateFilter()!).toDateString()
          : true;

      return matchItem && matchStatus && matchDate;
    });
  });


  totalAmount = computed(() =>
    this.filteredExpenses().reduce((sum, e) => sum + e.amount, 0)
  );

  paidAmount = computed(() =>
    this.filteredExpenses()
      .filter(e => e.status === 'Paid')
      .reduce((sum, e) => sum + e.amount, 0)
  );

  dueAmount = computed(() =>
    this.filteredExpenses()
      .filter(e => e.status === 'Due')
      .reduce((sum, e) => sum + e.amount, 0)
  );

  setToday() {
    const today = this.normalizeDate(new Date());

    this.filterForm.patchValue({
      purchaseDate: today,
      fromDate: null,
      toDate: null
    });

    this.dateFilter.set(today);
    this.fromDate.set(null);
    this.toDate.set(null);
  }

  setThisWeek() {
    const today = this.normalizeDate(new Date());
    const start = new Date(today);
    start.setDate(today.getDate() - today.getDay()); // Sunday

    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    this.filterForm.patchValue({
      purchaseDate: null,
      fromDate: start,
      toDate: end
    });

    this.dateFilter.set(null);
    this.fromDate.set(start);
    this.toDate.set(end);
  }

  setThisMonth() {
    const today = this.normalizeDate(new Date());
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    this.filterForm.patchValue({
      purchaseDate: null,
      fromDate: start,
      toDate: end
    });

    this.dateFilter.set(null);
    this.fromDate.set(start);
    this.toDate.set(end);
  }

  deleteExpense(index: number) {
    Swal.fire({
      title: 'Delete Expense?',
      text: 'This action cannot be undone',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel'
    }).then(result => {
      if (result.isConfirmed) {
        this.expenses.update(list => {
          const updated = list.filter((_, i) => i !== index);
          localStorage.setItem('expenses', JSON.stringify(updated));
          return updated;
        });

        Swal.fire({
          icon: 'success',
          title: 'Deleted',
          timer: 1200,
          showConfirmButton: false
        });
      }
    });
  }


  clearFilters() {
    const today = this.normalizeDate(new Date());

    this.filterForm.reset({
      item: '',
      status: '',
      purchaseDate: today,
      fromDate: null,
      toDate: null
    });

    this.dateFilter.set(today);
    this.fromDate.set(null);
    this.toDate.set(null);
  }

}
