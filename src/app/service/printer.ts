import { Injectable } from '@angular/core';
import EscPosEncoder from 'esc-pos-encoder';
import { AdminDashboard } from '../admin-dashboard/admin-dashboard';
declare const bluetoothSerial: any;

@Injectable({ providedIn: 'root' })
export class Printer {

  // --- NEW METHOD ---
  async requestPermissions() {
    return new Promise((resolve, reject) => {
      if (!(window as any).cordova) {
        resolve(true); // running in browser or not Cordova
        return;
      }

      const permissions = (window as any).cordova.plugins.permissions;
      if (!permissions) {
        reject("cordova-plugin-android-permissions not available");
        return;
      }

      const perms = [
        permissions.BLUETOOTH_CONNECT,
        permissions.BLUETOOTH_SCAN
      ];

      permissions.hasPermission(perms, (status: any) => {
        if (status.hasPermission) {
          resolve(true);
        } else {
          permissions.requestPermissions(perms, () => resolve(true), (err: any) => reject(err));
        }
      }, (err: any) => reject(err));
    });
  }


  async testList() {
    return new Promise((resolve, reject) => {
      bluetoothSerial.list(
        (devices: any) => {
          //alert(JSON.stringify(devices));
          resolve(devices);
        },
        (err: any) => {
          console.error("List error:", err);
          alert("Error listing devices: " + JSON.stringify(err));
          reject(err);
        }
      );
    });
  }

  listDevices(): Promise<any[]> {
    return new Promise((resolve, reject) => {
      bluetoothSerial.list(
        (devices: any) => resolve(devices),
        (err: any) => reject(err)
      );
    });
  }

  connect(address: string): Promise<void> {
    return new Promise((resolve, reject) => {
      bluetoothSerial.connect(
        address,
        () => resolve(),
        (err: any) => reject(err)
      );
    });
  }

  disconnect(): Promise<void> {
    return new Promise((resolve, reject) => {
      bluetoothSerial.disconnect(
        () => resolve(),
        (err: any) => reject(err)
      );
    });
  }

  async printSample() {
    const encoder = new EscPosEncoder();
    const result = encoder
      .initialize()
      .text('Welome to Momos Mart!\n')
      .newline()
      .align('center')
      .text('Thank you\n')
      .newline()
      .cut()
      .encode();

    const arrayBuffer = new Uint8Array(result).buffer;

    return new Promise((resolve, reject) => {
      bluetoothSerial.write(
        arrayBuffer,
        () => resolve(null),
        (err: any) => reject(err)
      );
    });
  }

  async printInvoiceV1(order: any) {
    const encoder = new EscPosEncoder();
    encoder.initialize();

    // HEADER
    encoder
      .align('center')
      .bold(true)
      .text('MOMOS MART\n')
      .bold(false)
      .text('------------------------------\n')
      .align('left');

    // INVOICE DETAILS
    encoder.text(`Invoice: ${order.invoiceNumber}\n`);
    encoder.text(`Date: ${order.createdOn.date}\n`);
    encoder.text('------------------------------\n');

    // TABLE HEADER
    encoder.bold(true).text('Item                 Qty  Amt\n').bold(false);
    encoder.text('------------------------------\n');

    // LIST ITEMS
    order.items.forEach((item: any) => {
      const itemName = `${item.name}(${item?.portion})`;

      // Make sure name does not exceed width
      const nameTrimmed = itemName.length > 18 ? itemName.substring(0, 18) : itemName;

      const qty = item.quantity.toString().padStart(3);
      const amt = item.total.toString().padStart(5);

      encoder.text(`${nameTrimmed.padEnd(18)} ${qty} ${amt}\n`);
    });

    encoder.text('------------------------------\n');

    // TOTAL
    encoder
      .align('left')
      .bold(true)
      .text(`TOTAL: ₹${order.total}\n`)
      .bold(false);

    encoder.align('center').text('------------------------------\n');

    // FOOTER
    encoder.align('center').text('Thank you!\n');
    encoder.cut();

    // SEND TO BLUETOOTH PRINTER
    const bytes = encoder.encode();
    const arrayBuffer = new Uint8Array(bytes).buffer;

    return new Promise((resolve, reject) => {
      bluetoothSerial.write(
        arrayBuffer,
        () => resolve(null),
        (err: any) => reject(err)
      );
    });
  }

  // Put this in your PrinterService
async printInvoiceV3(order:any) {
  // Build a diagnostic block to test exact spacing
  const WIDTH = 32;
  const lines: string[] = [];

  // Ruler: numbers 1..32 (single digits will be visible)
  let ruler = '';
  for (let i = 1; i <= WIDTH; i++) {
    // show last digit so it fits (e.g., 123456789012345...)
    ruler += (i % 10).toString();
  }
  lines.push(ruler);

  // Marker line with | at start, middle, end
  const mid = Math.floor(WIDTH / 2);
  let marker = ''.padEnd(WIDTH, ' ');
  marker = marker.substring(0, 0) + '|' + marker.substring(1);
  marker = marker.substring(0, mid) + '|' + marker.substring(mid + 1);
  marker = marker.substring(0, WIDTH - 1) + '|' ;
  // simpler - build exact:
  marker = '';
  for (let i = 1; i <= WIDTH; i++) marker += (i === 1 || i === mid+1 || i === WIDTH) ? '|' : ' ';
  lines.push(marker);

  // Sample centered text using byte-aware padding
  const centerByBytes = (t: string) => {
    const tb = new TextEncoder().encode(t).length;
    const pad = Math.floor((WIDTH - tb) / 2);
    return ' '.repeat(Math.max(0, pad)) + t;
  };
  lines.push(centerByBytes('MOMOS MART'));
  lines.push(centerByBytes('Thank you!'));
  lines.push('-'.repeat(WIDTH));

  // join using CRLF
  const text = lines.join('\r\n') + '\r\n\r\n';

  await this._sendTextToPrinter(text);
}

// Add this to PrinterService
private async _sendTextToPrinter(text: string): Promise<void> {
  // Convert to Uint8Array (UTF-8). We stick to ASCII (no ₹).
  const encoder = new TextEncoder(); // UTF-8 encoder
  const uint8 = encoder.encode(text);

  // First try ArrayBuffer form (some bluetoothSerial implementations accept it)
  try {
    await new Promise((resolve, reject) => {
      bluetoothSerial.write(uint8.buffer, () => resolve(null), (err: any) => reject(err));
    });
    return;
  } catch (err) {
    // fallback to base64 if arrayBuffer path fails
    // convert uint8 -> binary string -> base64
    const chunkSize = 0x8000;
    let binary = '';
    for (let i = 0; i < uint8.length; i += chunkSize) {
      const slice = uint8.subarray(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, Array.from(slice));
    }
    const base64 = btoa(binary);
    await new Promise((resolve, reject) => {
      bluetoothSerial.write(base64, () => resolve(null), (e: any) => reject(e));
    });
  }
}

async printInvoiceRaw(order: any) {
  const WIDTH = 32;
  const byteLen = (s: string) => new TextEncoder().encode(s).length;

  const padRightBytes = (s: string, targetBytes: number) => {
    // Add spaces until encoded length == targetBytes
    let out = s;
    while (byteLen(out) < targetBytes) out += ' ';
    if (byteLen(out) > targetBytes) {
      // trim chars until bytes fit
      while (byteLen(out) > targetBytes) out = out.slice(0, -1);
    }
    return out;
  };

  const padLeftBytes = (s: string, targetBytes: number) => {
    let out = s;
    while (byteLen(out) < targetBytes) out = ' ' + out;
    if (byteLen(out) > targetBytes) {
      while (byteLen(out) > targetBytes) out = out.substring(1);
    }
    return out;
  };

  const centerByBytes = (s: string) => {
    const b = byteLen(s);
    if (b >= WIDTH) return s.slice(0, WIDTH);
    const left = Math.floor((WIDTH - b) / 2);
    return ' '.repeat(left) + s;
  };

  // Build lines
  const lines: string[] = [];
  lines.push(centerByBytes('MOMOS MART'));
  lines.push('-'.repeat(WIDTH));

  lines.push(`Invoice: ${order.invoiceNumber}`);
  lines.push(`Date: ${order.createdOn.date}`);
  lines.push(`Time: ${order.createdOn.time}`);
  lines.push('-'.repeat(WIDTH));

  // header: Item(18) + space + Qty(3) + space + Amt(6) = 18+1+3+1+6 = 29 -> fits
  lines.push(padRightBytes('Item', 18) + ' ' + padLeftBytes('Qty', 3) + ' ' + padLeftBytes('Amt', 6));
  lines.push('-'.repeat(WIDTH));

  for (const it of order.items) {
    let name = `${it.name}(${it.portion})`;
    // trim to 18 bytes if needed
    while (byteLen(name) > 18) name = name.slice(0, -1);
    name = padRightBytes(name, 18);

    const qty = padLeftBytes(String(it.quantity), 3);
    const amt = padLeftBytes(String(it.total), 6);

    lines.push(`${name} ${qty} ${amt}`);
  }

  lines.push('-'.repeat(WIDTH));

  const totalText = `TOTAL: Rs.${order.total}`;
  lines.push(padLeftBytes(totalText, WIDTH));

  lines.push('-'.repeat(WIDTH));
  lines.push(centerByBytes('Thank you!'));
  lines.push('\r\n'); // space at end

  const finalText = lines.join('\r\n');

  // Send using helper that tries ArrayBuffer -> Base64
  await this._sendTextToPrinter(finalText);
}


  async printInvoiceV2(order: any) {
  const encoder = new EscPosEncoder();
  encoder.initialize();

  const WIDTH = 32; // EZO chhota exact width

  const center = (t: string) => {
    const pad = Math.floor((WIDTH - t.length) / 2);
    return ' '.repeat(Math.max(0, pad)) + t;
  };

  const right = (t: string) => {
    const pad = WIDTH - t.length;
    return ' '.repeat(Math.max(0, pad)) + t;
  };

  // --- HEADER (EZO only manual centering works) ---
  encoder.text(center("MOMOS MART") + "\n");
  encoder.text("-".repeat(WIDTH) + "\n");

  // --- INVOICE DETAILS ---
  encoder.text(`Invoice: ${order.invoiceNumber}\n`);
  encoder.text(`Date: ${order.createdOn.date}\n`);
  encoder.text("-".repeat(WIDTH) + "\n");

  // --- TABLE HEADER ---
  encoder.text("Item                 Qty  Amt\n");
  encoder.text("-".repeat(WIDTH) + "\n");

  // --- ITEMS ---
  order.items.forEach((i: any) => {
    let name = `${i.name}(${i.portion})`;

    if (name.length > 18) name = name.substring(0, 18);

    name = name.padEnd(18, " ");

    const qty = i.quantity.toString().padStart(3, " ");
    const amt = i.total.toString().padStart(5, " ");

    encoder.text(`${name} ${qty} ${amt}\n`);
  });

  encoder.text("-".repeat(WIDTH) + "\n");

  // --- TOTAL (Right-align with spaces) ---
  encoder.text(right(`TOTAL: Rs.${order.total}`) + "\n");

  encoder.text("-".repeat(WIDTH) + "\n");

  // --- FOOTER ---
  encoder.text(center("Thank you!") + "\n");
  encoder.cut();

  // SEND TO PRINTER
  const bytes = encoder.encode();
  const buffer = new Uint8Array(bytes).buffer;

  return new Promise((resolve, reject) => {
    bluetoothSerial.write(buffer, resolve, reject);
  });
}

async printInvoice(order: any) {
  const WIDTH = 32;

  const byteLen = (s: string) => new TextEncoder().encode(s).length;

  const padLeftBytes = (s: string, target: number) => {
    while (byteLen(s) < target) s = ' ' + s;
    return s;
  };

  const padRightBytes = (s: string, target: number) => {
    while (byteLen(s) < target) s = s + ' ';
    return s;
  };

  const center = (text: string) => {
    const b = byteLen(text);
    const left = Math.floor((WIDTH - b) / 2);
    return ' '.repeat(left) + text;
  };

  // Build invoice
  const lines: string[] = [];

  lines.push(center('MOMOS MART'));
  lines.push('-'.repeat(WIDTH));

  lines.push(`Invoice: ${order.invoiceNumber}`);
  lines.push(`Date: ${order.createdOn.date}`);
  lines.push('-'.repeat(WIDTH));

  // Header
  lines.push(
    padRightBytes('Item', 18) +
    padLeftBytes('Qty', 4) +
    padLeftBytes('Amt', 10)
  );
  lines.push('-'.repeat(WIDTH));

  // Items
  for (const it of order.items) {
    let name = it.portion ? `${it.name}[${it.portion.substring(0,1)}]` : it.name;

    // limit name to 18 bytes
    while (byteLen(name) > 18) {
      name = name.slice(0, -1);
    }

    name = padRightBytes(name, 18);

    const qty = padLeftBytes(String(it.quantity), 4);
    const amt = padLeftBytes(String(it.total), 10);

    lines.push(name + qty + amt);
  }

  lines.push('-'.repeat(WIDTH));

  // TOTAL aligned to right
  const totalStr = `TOTAL: Rs.${order.total}`;
  lines.push(padLeftBytes(totalStr, WIDTH));

  lines.push('-'.repeat(WIDTH));
  lines.push(center('Thank you!'));
  lines.push('\r\n');

  const textToSend = lines.join('\r\n');

  // Send to printer
  await this._sendTextToPrinter(textToSend);
}



}


//Initial AdminDashboard ts
  // async onTestList() {
  //   try {
  //     await this.printer.requestPermissions();
  //     //await this.printer.testList();
  //   } catch (err: any) {
  //     alert("Error: " + (err?.message || JSON.stringify(err)));
  //   }
  // }

  // async onPrintInvoice() {
  //   try {
  //     await this.printer.requestPermissions();

  //     const devices = await this.printer.listDevices();
  //     const ezo = devices.find(d => d.name && d.name.includes("EZO"));

  //     if (!ezo) {
  //       alert("EZO Printer not found!");
  //       return;
  //     }

  //     await this.printer.connect(ezo.id || ezo.address);

  //     const sampleInvoice = {
  //       "invoiceNumber": "INV-20251127-195957",
  //       "createdOn": {
  //         "date": "27/11/2025",
  //         "time": "8:00:00 PM"
  //       },
  //       "items": [
  //         {
  //           "name": "Veg Momos Steam",
  //           "portion": "Full",
  //           "price": 50,
  //           "quantity": 1,
  //           "total": 50
  //         },
  //         {
  //           "name": "Veg Momos Steam",
  //           "portion": "Half",
  //           "price": 30,
  //           "quantity": 1,
  //           "total": 30
  //         },
  //         {
  //           "name": "Veg Momos Crispy",
  //           "portion": "Full",
  //           "price": 100,
  //           "quantity": 1,
  //           "total": 100
  //         }
  //       ],
  //       "total": 180
  //     }

  //     await this.printer.printInvoice(sampleInvoice);
  //     await this.printer.disconnect();

  //     alert('Invoice printed successfully!');
  //   } catch (err: any) {
  //     alert('Print failed: ' + (err?.message || JSON.stringify(err)));
  //   }
  // }