import { Component, inject, signal, computed, effect } from '@angular/core';
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
import { MatDialog } from '@angular/material/dialog';
import { ExpenseFilterDialog } from '../expense-filter-dialog/expense-filter-dialog';
import { ExpenseEditDialog } from '../expense-edit-dialog/expense-edit-dialog';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatDividerModule } from '@angular/material/divider';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AuthService } from '../service/auth-service';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { FirestoreService } from '../service/firestore.service';
import { InvoiceService } from '../service/invoice-service';

export interface Expense {
  id: string;
  item: string;
  amount: number;
  purchaseDate: Date;
  status: 'Paid' | 'Due';
}

interface ExpenseGroup {
  key: string;
  items: Expense[];
  total: number;
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
    ReactiveFormsModule,
    MatPaginatorModule,
    MatDividerModule
  ],
  templateUrl: './expense-list.html',
  styleUrl: './expense-list.scss',
})
export class ExpenseList {
  today = new Date();

  auth = inject(AuthService);
  invoiceService = inject(InvoiceService)
  private fb = inject(FormBuilder);
  private dialog = inject(MatDialog);

  filterForm = this.fb.group({
    item: [''],
    status: [''],
    purchaseDate: [this.normalizeDate(new Date()) as Date | null],
    fromDate: [null as Date | null],
    toDate: [null as Date | null]
  });

  constructor(private fs: FirestoreService) {
    const today = this.normalizeDate(new Date());
    this.dateFilter.set(today);
    this.filterForm.valueChanges.subscribe(value => {
      this.pageIndex.set(0);
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

  displayedColumns = this.auth.isAdmin()
    ? ['item', 'amount', 'purchaseDate', 'status', 'actions']
    : ['item', 'amount', 'purchaseDate', 'status'];

  expenses = signal<Expense[]>(
    (this.invoiceService.getExpensesFromLocalStorage('expenses') as Expense[])
      .map(e => ({
        ...e,
        id: e.id ?? crypto.randomUUID()
      }))
  );

  sortBy = signal<'date_desc' | 'date_asc' | 'paid_first' | 'due_first'>('date_desc');

  pageIndex = signal(0);
  pageSize = signal(10);

  pageSizeOptions = [10, 20, 30];

  groupBy = signal<'' | 'date' | 'item' | 'status'>('');


  // Filters
  itemFilter = signal('');
  statusFilter = signal('');
  dateFilter = signal<Date | null>(null);
  fromDate = signal<Date | null>(null);
  toDate = signal<Date | null>(null);

  private normalizeDate(d: Date) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  isRangeFilterActive = computed(() => {
    return !!(this.fromDate() && this.toDate());
  });

  onPageChange(event: any) {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
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

  openEditDialog(expense: Expense) {
    const dialogRef = this.dialog.open(ExpenseEditDialog, {
      width: '360px',
      maxWidth: '95vw',
      autoFocus: false,
      panelClass: 'expense-filter-dialog',
      data: expense
    });

    dialogRef.afterClosed().subscribe(updated => {
      if (!updated) return;

      this.expenses.update(list =>
        list.map(e => e.id === updated.id ? updated : e)
      );

      this.invoiceService.setExpensesToLocalStorage('expenses');
      this.fs.addWithId('expenses', updated.id, updated);

      Swal.fire({
        title: 'Saved',
        icon: 'success',
        timer: 1200,
        showConfirmButton: false
      });
    });
  }

  endOfDay(date: Date): Date {
    return new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      23, 59, 59, 999
    );
  }

  groupedExpenses = computed<ExpenseGroup[]>(() => {
    const list = this.filteredExpenses();
    const group = this.groupBy();

    if (!group) {
      return [{
        key: '',
        items: list,
        total: list.reduce((s, e) => s + e.amount, 0)
      }];
    }

    const map = new Map<string, Expense[]>();

    for (const e of list) {
      let key = '';

      switch (group) {
        case 'date':
          key = new Date(e.purchaseDate).toDateString();
          break;
        case 'item':
          key = e.item;
          break;
        case 'status':
          key = e.status;
          break;
      }

      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(e);
    }

    return Array.from(map.entries()).map(([key, items]) => ({
      key,
      items,
      total: items.reduce((s, e) => s + e.amount, 0)
    }));
  });

  filteredExpenses = computed(() => {
    const list = this.expenses().filter(e => {

      const matchItem = this.itemFilter()
        ? e.item.toLowerCase().includes(this.itemFilter().toLowerCase())
        : true;

      const matchStatus = this.statusFilter()
        ? e.status === this.statusFilter()
        : true;

      const hasRange = this.fromDate() && this.toDate();

      const matchDate = hasRange
        ? new Date(e.purchaseDate) >= this.fromDate()! &&
        new Date(e.purchaseDate) <= this.endOfDay(this.toDate()!)
        : this.dateFilter()
          ? new Date(e.purchaseDate).toDateString() ===
          new Date(this.dateFilter()!).toDateString()
          : true;

      return matchItem && matchStatus && matchDate;
    });

    // Apply sorting ONLY when range filter is active
    if (!this.isRangeFilterActive()) {
      return list;
    }

    // SORTING
    return [...list].sort((a, b) => {
      switch (this.sortBy()) {
        case 'date_desc':
          return +new Date(b.purchaseDate) - +new Date(a.purchaseDate);
        case 'date_asc':
          return +new Date(a.purchaseDate) - +new Date(b.purchaseDate);
        case 'paid_first':
          return a.status === 'Paid' ? -1 : 1;
        case 'due_first':
          return a.status === 'Due' ? -1 : 1;
        default:
          return 0;
      }
    });
  });

  paginatedExpenses = computed(() => {
    const data = this.filteredExpenses();

    const start = this.pageIndex() * this.pageSize();
    const end = start + this.pageSize();

    return data.slice(start, end);
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

  toggleStatus(expense: Expense) {
    this.expenses.update(list =>
      list.map(e =>
        e.id === expense.id
          ? { ...e, status: e.status === 'Paid' ? 'Due' : 'Paid' }
          : e
      )
    );
    this.invoiceService.setExpensesToLocalStorage('expenses');
  }

  deleteExpense(expense: Expense) {
    Swal.fire({
      title: 'Delete Expense?',
      text: 'This action cannot be undone',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33"
    }).then(result => {
      if (!result.isConfirmed) return;

      this.expenses.update(list =>
        list.filter(e => e.id !== expense.id)
      );

      this.invoiceService.setExpensesToLocalStorage('expenses');

      Swal.fire({
        icon: 'success',
        title: 'Deleted',
        timer: 1200,
        showConfirmButton: false
      });

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

  exportExcel() {
    if (Capacitor.isNativePlatform()) {
      this.exportExcelCapacitor();
    } else {
      this.exportExcelWeb();
    }
  }

  exportExcelWeb() {
    const data = this.filteredExpenses().map(e => ({
      Item: e.item,
      Amount: e.amount,
      Date: new Date(e.purchaseDate).toLocaleDateString(),
      Status: e.status
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Expenses');

    const buffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array'
    });

    saveAs(
      new Blob([buffer], { type: 'application/octet-stream' }),
      `expenses_${Date.now()}.xlsx`
    );
  }

  async exportExcelCapacitor() {
    try {
      const worksheet = XLSX.utils.json_to_sheet(
        this.filteredExpenses().map(e => ({
          Item: e.item,
          Amount: e.amount,
          Date: new Date(e.purchaseDate).toLocaleDateString(),
          Status: e.status
        }))
      );

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Expenses');

      // Generate base64 Excel
      const base64 = XLSX.write(workbook, {
        bookType: 'xlsx',
        type: 'base64'
      });

      const fileName = `expenses_${Date.now()}.xlsx`;

      // Write file
      await Filesystem.writeFile({
        path: fileName,
        data: base64,
        directory: Directory.Documents
      });

      // Get URI
      const fileUri = await Filesystem.getUri({
        directory: Directory.Documents,
        path: fileName
      });

      // Share
      await Share.share({
        title: 'Expense Excel',
        files: [fileUri.uri]
      });

    } catch (err: any) {
      const msg = err?.message || '';

      // User cancelled share → do nothing
      if (msg.toLowerCase().includes('cancel')) {
        return;
      }
      Swal.fire({
        title: 'Export Failed',
        titleText: msg || JSON.stringify(err),
        icon: 'error',
        timer: 700,
        showConfirmButton: false
      });
    }
  }

  exportPDF() {
    if (Capacitor.isNativePlatform()) {
      this.exportPdfCapacitor();
    } else {
      this.exportPdfWeb();
    }
  }

  exportPdfWeb() {
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text('Expense Report', 14, 15);

    const rows = this.filteredExpenses().map(e => [
      e.item,
      `₹ ${e.amount}`,
      new Date(e.purchaseDate).toLocaleDateString(),
      e.status
    ]);

    autoTable(doc, {
      head: [['Item', 'Amount', 'Date', 'Status']],
      body: rows,
      startY: 25,
      styles: { fontSize: 10 }
    });

    doc.save(`expenses_${Date.now()}.pdf`);
  }

  async exportPdfCapacitor() {
    try {
      const doc = new jsPDF();

      // Title
      doc.setFontSize(16);
      doc.text('Expense Report', 14, 15);

      // Table data
      const rows = this.filteredExpenses().map(e => [
        e.item,
        `₹ ${e.amount}`,
        new Date(e.purchaseDate).toLocaleDateString(),
        e.status
      ]);

      autoTable(doc, {
        head: [['Item', 'Amount', 'Date', 'Status']],
        body: rows,
        startY: 25,
        styles: { fontSize: 10 }
      });

      // Convert to base64
      const base64 = doc.output('datauristring').split(',')[1];
      const fileName = `expenses_${Date.now()}.pdf`;

      // Write file
      await Filesystem.writeFile({
        path: fileName,
        data: base64,
        directory: Directory.Documents
      });

      // Get file URI
      const fileUri = await Filesystem.getUri({
        directory: Directory.Documents,
        path: fileName
      });

      await Share.share({
        title: 'Expense PDF',
        files: [fileUri.uri]
      });

    } catch (err: any) {
      const msg = err?.message || '';

      // User cancelled share → do nothing
      if (msg.toLowerCase().includes('cancel')) {
        return;
      }
      Swal.fire({
        title: 'Export Failed',
        titleText: msg || JSON.stringify(err),
        icon: 'error',
        timer: 700,
        showConfirmButton: false
      });
    }
  }

}
