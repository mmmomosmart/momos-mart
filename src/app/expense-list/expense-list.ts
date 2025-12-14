import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';

export interface Expense {
  item: string;
  amount: number;
  purchaseDate: Date;
  status: 'PAID' | 'DUE';
}

@Component({
  selector: 'app-expense-list',
  imports: [
    CommonModule,
    MatTableModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatChipsModule
  ],
  templateUrl: './expense-list.html',
  styleUrl: './expense-list.scss', 
})
export class ExpenseList {

  // displayedColumns = ['item', 'amount', 'purchaseDate', 'status', 'actions'];
  displayedColumns = ['item', 'amount', 'purchaseDate', 'status'];

  expenses = signal<Expense[]>(JSON.parse(localStorage.getItem('expenses') || '[]'));

  deleteExpense(index: number) {
    this.expenses.update(list => list.filter((_, i) => i !== index));
  }
}
