import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExpenseEditDialog } from './expense-edit-dialog';

describe('ExpenseEditDialog', () => {
  let component: ExpenseEditDialog;
  let fixture: ComponentFixture<ExpenseEditDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExpenseEditDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExpenseEditDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
