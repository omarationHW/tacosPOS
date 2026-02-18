// ============================================================
// ESC/POS Printer Utilities
// ============================================================
// Provides low-level thermal printer commands and connection.
//
// TODO: Adjust VENDOR_ID and PRODUCT_ID for your specific printer.
// Common values:
//   Epson:   VENDOR_ID=0x04b8, PRODUCT_ID=0x0202
//   Star:    VENDOR_ID=0x0519, PRODUCT_ID=0x0003
//   Custom:  Check `lsusb` (Linux) or Device Manager (Windows)
//
// TODO: Install:
//   npm install escpos escpos-usb
// ============================================================

// import escpos from 'escpos';
// import USB from 'escpos-usb';

// const VENDOR_ID = parseInt(process.env.PRINTER_VENDOR_ID || '0x04b8', 16);
// const PRODUCT_ID = parseInt(process.env.PRINTER_PRODUCT_ID || '0x0202', 16);

// ESC/POS command constants
export const ESC = '\x1B';
export const GS = '\x1D';

// Common commands
export const COMMANDS = {
  INIT: `${ESC}@`,                    // Initialize printer
  BOLD_ON: `${ESC}E\x01`,            // Bold on
  BOLD_OFF: `${ESC}E\x00`,           // Bold off
  ALIGN_CENTER: `${ESC}a\x01`,       // Center align
  ALIGN_LEFT: `${ESC}a\x00`,         // Left align
  ALIGN_RIGHT: `${ESC}a\x02`,        // Right align
  DOUBLE_HEIGHT: `${ESC}!\x10`,      // Double height
  NORMAL_SIZE: `${ESC}!\x00`,        // Normal size
  CUT: `${GS}V\x00`,                 // Full cut
  PARTIAL_CUT: `${GS}V\x01`,         // Partial cut
  FEED_LINES: (n: number) => `${ESC}d${String.fromCharCode(n)}`, // Feed n lines
  LINE: '-'.repeat(32),              // Separator line (32 chars for 58mm paper)
  DOUBLE_LINE: '='.repeat(32),       // Double separator
} as const;

// /**
//  * Print raw text to thermal printer via USB
//  */
// export async function printTicket(content: string): Promise<void> {
//   return new Promise((resolve, reject) => {
//     try {
//       const device = new USB(VENDOR_ID, PRODUCT_ID);
//       const printer = new escpos.Printer(device);
//
//       device.open((err: Error | null) => {
//         if (err) {
//           reject(new Error(`Could not open printer: ${err.message}`));
//           return;
//         }
//
//         printer
//           .raw(Buffer.from(COMMANDS.INIT, 'binary'))
//           .raw(Buffer.from(content, 'binary'))
//           .raw(Buffer.from(COMMANDS.FEED_LINES(3), 'binary'))
//           .raw(Buffer.from(COMMANDS.PARTIAL_CUT, 'binary'))
//           .close(() => resolve());
//       });
//     } catch (err) {
//       reject(err);
//     }
//   });
// }

// /**
//  * Pad/truncate text to fixed width for receipt formatting
//  */
export function padText(text: string, width: number, align: 'left' | 'right' = 'left'): string {
  const truncated = text.slice(0, width);
  if (align === 'right') {
    return truncated.padStart(width);
  }
  return truncated.padEnd(width);
}

// /**
//  * Format a two-column row (left-aligned label, right-aligned value)
//  */
export function formatRow(label: string, value: string, width = 32): string {
  const labelWidth = width - value.length - 1;
  return `${padText(label, labelWidth)} ${padText(value, value.length, 'right')}`;
}
