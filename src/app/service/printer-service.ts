import { Injectable } from '@angular/core';
import EscPosEncoder from 'esc-pos-encoder';
declare const bluetoothSerial: any;

@Injectable({ providedIn: 'root' })
export class PrinterService {

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
          //console.log("Devices:", devices);
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

  private async _sendTextToPrinter(text: string): Promise<void> {
    const encoder = new TextEncoder();
    const uint8 = encoder.encode(text);

    const CHUNK = 256; // safe size for EZO printer

    for (let i = 0; i < uint8.length; i += CHUNK) {
      const slice = uint8.slice(i, i + CHUNK);

      await new Promise((resolve, reject) => {
        bluetoothSerial.write(slice.buffer, () => resolve(null), reject);
      });

      // small delay so printer doesn't overflow
      await new Promise(res => setTimeout(res, 30));
    }
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
    // Items with word-wrap
    for (const it of order.items) {
      let name = it.portion ? `${it.name}[${it.portion.substring(0, 1)}]` : it.name;

      // wrap name into multiple lines of max 18 bytes
      const wrappedLines: string[] = [];
      let current = "";

      for (const ch of name) {
        if (byteLen(current + ch) > 18) {
          wrappedLines.push(current);
          current = ch;
        } else {
          current += ch;
        }
      }
      if (current.length > 0) wrappedLines.push(current);

      // print the first line with qty + amount
      const line1 =
        padRightBytes(wrappedLines[0], 18) +
        padLeftBytes(String(it.quantity), 4) +
        padLeftBytes(String(it.total), 10);

      lines.push(line1);

      // print remaining wrapped lines (name only)
      for (let i = 1; i < wrappedLines.length; i++) {
        lines.push(padRightBytes(wrappedLines[i], 18));
      }
    }


    lines.push('-'.repeat(WIDTH));

    // TOTAL aligned to right
    const totalStr = `TOTAL: Rs.${order.total}`;
    lines.push(padLeftBytes(totalStr, WIDTH));

    lines.push('-'.repeat(WIDTH));
    lines.push(center('Thank you!'));

    // add extra empty lines so printer pushes paper
    lines.push('');
    lines.push('');

    // ESC/POS feed (push paper)
    const FEED = '\x1B\x64\x03';

    // ESC/POS cut (some models ignore it, but safe)
    const CUT = '\x1Bi';

    const textToSend = lines.join('\r\n') + FEED + CUT;

    // Send to printer
    await this._sendTextToPrinter(textToSend);
  }

}
