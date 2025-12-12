import { Injectable } from '@angular/core';
import EscPosEncoder from 'esc-pos-encoder';
import { MOMOS_MART_LOGO_BASE64 } from '../../menu-category/logo-text';

declare const bluetoothSerial: any;

@Injectable({ providedIn: 'root' })
export class PrinterService {

  // ==========================
  // PERMISSIONS (Android 12+)
  // ==========================
  async requestPermissions() {
    return new Promise((resolve, reject) => {
      if (!(window as any).cordova) {
        resolve(true);
        return;
      }

      const permissions = (window as any).cordova.plugins.permissions;
      if (!permissions) {
        reject("cordova-plugin-android-permissions not installed");
        return;
      }

      const perms = [
        permissions.BLUETOOTH_CONNECT,
        permissions.BLUETOOTH_SCAN
      ];

      permissions.hasPermission(
        perms,
        (status: any) => {
          if (status.hasPermission) resolve(true);
          else {
            permissions.requestPermissions(
              perms,
              () => resolve(true),
              (err: any) => reject(err)
            );
          }
        },
        (err: any) => reject(err)
      );
    });
  }

  // ==========================
  // BLUETOOTH
  // ==========================
  listDevices(): Promise<any[]> {
    return new Promise((resolve, reject) => {
      bluetoothSerial.list(resolve, reject);
    });
  }

  connect(address: string): Promise<void> {
    return new Promise((resolve, reject) => {
      bluetoothSerial.connect(address, resolve, reject);
    });
  }

  disconnect(): Promise<void> {
    return new Promise((resolve, reject) => {
      bluetoothSerial.disconnect(resolve, reject);
    });
  }

  // ==========================
  // SEND TEXT (chunked)
  // ==========================
  private async _sendTextToPrinter(text: string): Promise<void> {
    const enc = new TextEncoder();
    const data = enc.encode(text);
    const CHUNK = 200;

    for (let i = 0; i < data.length; i += CHUNK) {
      const slice = data.slice(i, i + CHUNK);

      await new Promise((res, rej) => {
        bluetoothSerial.write(slice.buffer, res, rej);
      });

      await new Promise(r => setTimeout(r, 25));
    }
  }

  // ==========================
  // SEND BINARY IMAGE (chunked)
  // ==========================
  private async _sendBinaryToPrinter(bytes: Uint8Array) {
    const CHUNK = 200;

    for (let i = 0; i < bytes.length; i += CHUNK) {
      const part = bytes.slice(i, i + CHUNK);

      await new Promise((res, rej) => {
        bluetoothSerial.write(part.buffer, res, rej);
      });

      await new Promise(r => setTimeout(r, 20));
    }
  }

  // ==========================
  // IMAGE BASE64 → ESC/POS
  // ==========================
  private _imageFromBase64(base64: string): Promise<Uint8Array> {
    return new Promise((resolve, reject) => {
      const encoder = new EscPosEncoder();
      const img = new Image();
      img.src = "data:image/png;base64," + base64;

      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;

        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0);

        const bytes = encoder
          .initialize()
          .align('center')
          .image(canvas, 384, 120)   // ✔ Correct width for 58mm printers
          .encode();

        resolve(bytes);
      };

      img.onerror = reject;
    });
  }

  // ==========================
  // PRINT INVOICE
  // ==========================
  async printInvoice(order: any) {
    const WIDTH = 32;
    const enc = new TextEncoder();
    const byteLen = (s: string) => enc.encode(s).length;

    const padLeft = (s: string, total: number) => {
      while (byteLen(s) < total) s = " " + s;
      return s;
    };

    const padRight = (s: string, total: number) => {
      while (byteLen(s) < total) s = s + " ";
      return s;
    };

    const center = (txt: string) => {
      const spaces = Math.floor((WIDTH - byteLen(txt)) / 2);
      return " ".repeat(spaces) + txt;
    };

    let lines: string[] = [];

    // --------------------------
    // 1) PRINT LOGO
    // --------------------------
    const logoBytes = await this._imageFromBase64(MOMOS_MART_LOGO_BASE64);
    await this._sendBinaryToPrinter(logoBytes);

    // ✔ Reset alignment after image
    //await this._sendTextToPrinter("\x1B\x61\x00");
    await new Promise((resolve, reject) => {
      const cmd = new Uint8Array([0x1B, 0x61, 0x00]); // ESC a 0
      bluetoothSerial.write(cmd.buffer, resolve, reject);
    });

    // --------------------------
    // Store info
    // --------------------------
    //lines.push(center("MOMOS MART"));
    lines.push("\x1B\x45\x01" + center("MOMOS MART") + "\x1B\x45\x00");
    lines.push(center("Ramnagri, Patna-800025"));
    lines.push(center("+91 - 8521323756"));
    lines.push('-'.repeat(WIDTH));

    lines.push(`Invoice: ${order.invoiceNumber}`);
    lines.push(`Date: ${order.createdOn.date}`);
    lines.push('-'.repeat(WIDTH));

    // Header
    lines.push(
      padRight("Item", 18) +
      padLeft("Qty", 4) +
      padLeft("Amt", 10)
    );
    lines.push('-'.repeat(WIDTH));

    // Items with wrapping
    for (const it of order.items) {
      let name = it.portion ? `${it.name}[${it.portion}]` : it.name;

      let current = "";
      const parts: string[] = [];

      for (const c of name) {
        if (byteLen(current + c) > 18) {
          parts.push(current);
          current = c;
        } else {
          current += c;
        }
      }
      if (current) parts.push(current);

      lines.push(
        padRight(parts[0], 18) +
        padLeft(String(it.quantity), 4) +
        padLeft(String(it.total), 10)
      );

      for (let i = 1; i < parts.length; i++) {
        lines.push(padRight(parts[i], 18));
      }
    }

    lines.push('-'.repeat(WIDTH));

    const totalStr = `TOTAL: Rs.${order.total}`;
    //lines.push(padLeft(totalStr, WIDTH));
    lines.push("\x1B\x45\x01" + padLeft(totalStr, WIDTH) + "\x1B\x45\x00");


    lines.push('-'.repeat(WIDTH));
    //lines.push(center("Thank you ! Visit Again"));
    lines.push("\x1B\x45\x01" + center("Thank you ! Visit Again") + "\x1B\x45\x00");

    lines.push("");
    lines.push("");

    // ESC/POS feed (push paper)
    const FEED = '\x1B\x64\x03';

    // ESC/POS cut (some models ignore it, but safe)
    const CUT = '\x1Bi';

    const textToSend = lines.join('\r\n') + FEED + CUT;
    await this._sendTextToPrinter(textToSend);
  }

}
