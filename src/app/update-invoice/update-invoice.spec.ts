import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UpdateInvoice } from './update-invoice';

describe('UpdateInvoice', () => {
  let component: UpdateInvoice;
  let fixture: ComponentFixture<UpdateInvoice>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UpdateInvoice]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UpdateInvoice);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
