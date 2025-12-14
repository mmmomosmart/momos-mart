import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatCardModule } from '@angular/material/card';
import { MatIcon, MatIconModule } from '@angular/material/icon';
import Swal from 'sweetalert2';

export interface Expense {
  item: string;
  amount: number;
  purchaseDate: Date;
  status: 'PAID' | 'DUE';
}

@Component({
  selector: 'app-add-expense',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatCardModule,
    MatIcon,
    MatIconModule
  ],
  templateUrl: './add-expense.html',
  styleUrl: './add-expense.scss',
})
export class AddExpense {
  items = ['Noodles', 'Vegetables', 'Paneer', 'Chicken', 'Egg', 'Onion', 'Gas Cylinder', 'Oil', 'Raw Material'];

  expenses = signal<Expense[]>([]);

  expenseForm!: ReturnType<FormBuilder['group']>;

  constructor(private fb: FormBuilder) {
    this.expenseForm = this.fb.group({
      item: ['', Validators.required],
      amount: [null, [Validators.required, Validators.min(1)]],
      purchaseDate: [new Date(), Validators.required],
      status: ['PAID', Validators.required]
    });
  }

  addExpense() {
    if (this.expenseForm.invalid) return;

    const expense = this.expenseForm.value as Expense;

    this.expenses.update(list => [...list, expense]);

    console.log("Current Expenses:", this.expenses());

    console.log("Expense Added:", expense);

    Swal.fire({
      title: "Preview Expense",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, save it!"
    }).then((result) => {
      if (result.isConfirmed) {
        this.saveExpense(expense)
        Swal.fire({
          title: "Saved!",
          text: "Your expense has been saved.",
          icon: "success",
          timer: 1500,
          showConfirmButton: false
        });
        this.resetForm();
      }
      else {
        this.resetForm();
      }
    });
  }

  resetForm() {
    this.expenseForm.reset({
      item: '',
      amount: null,
      purchaseDate: new Date(),
      status: 'PAID'
    });
  }

  saveExpense(expense: Expense) {
    // Get existing expenses or empty array
    const existingInvoices = JSON.parse(localStorage.getItem('expenses') || '[]');

    // Push the new invoice
    existingInvoices.push(expense);

    // Save back to localStorage
    localStorage.setItem('expenses', JSON.stringify(existingInvoices));
  }
}

