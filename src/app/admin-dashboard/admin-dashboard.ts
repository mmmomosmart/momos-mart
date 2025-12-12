import { Component } from '@angular/core';
import { PrinterService } from '../service/printer-service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.html',
  styleUrls: ['./admin-dashboard.scss'],
})
export class AdminDashboard {

  constructor(private printer: PrinterService, private router: Router) { }

  goToHome() {
    this.router.navigate(['/']);
  }

  async onTestList() {
    try {
      await this.printer.requestPermissions();
      //await this.printer.testList();
    } catch (err: any) {
      alert("Error: " + (err?.message || JSON.stringify(err)));
    }
  }

  async onPrintInvoice() {
    try {
      await this.printer.requestPermissions();

      const devices = await this.printer.listDevices();
      const ezo = devices.find(d => d.name && d.name.includes("EZO"));

      if (!ezo) {
        alert("EZO Printer not found!");
        return;
      }

      await this.printer.connect(ezo.id || ezo.address);

      const sampleInvoice = {
        "invoiceNumber": "INV-20251127-195957",
        "createdOn": {
          "date": "27/11/2025",
          "time": "8:00:00 PM"
        },
        "items": [
          {
            "name": "Veg Momos Steam",
            "portion": "Full",
            "price": 50,
            "quantity": 1,
            "total": 50
          },
          {
            "name": "Veg Momos Steam",
            "portion": "Half",
            "price": 30,
            "quantity": 1,
            "total": 30
          },
          {
            "name": "Veg Momos Crispy",
            "portion": "Full",
            "price": 100,
            "quantity": 1,
            "total": 100
          }
        ],
        "total": 180
      }

      await this.printer.printInvoice(sampleInvoice);
      await this.printer.disconnect();

      alert('Invoice printed successfully!');
    } catch (err: any) {
      alert('Print failed: ' + (err?.message || JSON.stringify(err)));
    }
  }

}
