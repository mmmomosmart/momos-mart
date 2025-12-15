import { Component, inject, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogActions, MatDialogContent } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { Expense } from '../expense-list/expense-list';
import { MatNativeDateModule, MatOptionModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';

import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import Swal from 'sweetalert2';
import { MatDividerModule } from '@angular/material/divider';

@Component({
  selector: 'app-expense-edit-dialog',
  imports: [CommonModule, MatFormFieldModule, MatOptionModule, MatSelectModule, MatDatepickerModule, MatNativeDateModule,
    ReactiveFormsModule, MatInputModule, MatButtonModule, MatCardModule, MatIconModule, MatDividerModule, MatDialogActions, MatDialogContent],
  templateUrl: './expense-edit-dialog.html',
  styleUrl: './expense-edit-dialog.scss'
})
export class ExpenseEditDialog {
  items = ['Noodles', 'Vegetables', 'Paneer', 'Chicken', 'Egg', 'Onion', 'Gas Cylinder', 'Oil', 'Raw Material'];
  private fb = inject(FormBuilder);
  form = this.fb.group({
    item: ['', Validators.required],
    amount: [0, [Validators.required, Validators.min(1)]],
    purchaseDate: [new Date(), Validators.required],
    status: ['Paid' as 'Paid' | 'Due']
  });

  constructor(
    private dialogRef: MatDialogRef<ExpenseEditDialog>,
    @Inject(MAT_DIALOG_DATA) public expense: Expense
  ) {
    this.form.patchValue(expense);
  }

  save() {
    if (this.form.invalid) return;

    this.dialogRef.close({
      ...this.expense,
      ...this.form.value
    });
  }

  cancel() {
    this.dialogRef.close();
  }
}

