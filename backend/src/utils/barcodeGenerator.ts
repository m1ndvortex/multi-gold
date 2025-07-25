import bwipjs from 'bwip-js';
import qrcode from 'qrcode-generator';

/**
 * Generate barcode image as base64 string
 */
export async function generateBarcode(
  value: string,
  format: 'code128' | 'ean13' | 'ean8' | 'upca' = 'code128',
  options: {
    width?: number;
    height?: number;
    includetext?: boolean;
    textsize?: number;
  } = {}
): Promise<string> {
  try {
    const buffer = await bwipjs.toBuffer({
      bcid: format,
      text: value,
      scale: options.width || 3,
      height: options.height || 10,
      includetext: options.includetext !== false,
      textsize: options.textsize || 10,
      backgroundcolor: 'ffffff'
    });

    return `data:image/png;base64,${buffer.toString('base64')}`;
  } catch (error: any) {
    throw new Error(`Failed to generate barcode: ${error.message}`);
  }
}

/**
 * Generate QR code image as base64 string
 */
export async function generateQRCode(
  data: string,
  options: {
    size?: number;
    margin?: number;
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  } = {}
): Promise<string> {
  try {
    const typeNumber = 0; // Auto-detect
    const errorCorrectionLevel = options.errorCorrectionLevel || 'M';
    const qr = qrcode(typeNumber, errorCorrectionLevel);
    qr.addData(data);
    qr.make();

    // Generate SVG and convert to base64
    const size = options.size || 200;
    const margin = options.margin || 2;
    const svg = qr.createSvgTag(size / qr.getModuleCount(), margin);
    
    // Convert SVG to base64
    const base64 = Buffer.from(svg).toString('base64');
    return `data:image/svg+xml;base64,${base64}`;
  } catch (error: any) {
    throw new Error(`Failed to generate QR code: ${error.message}`);
  }
}

/**
 * Validate barcode format
 */
export function validateBarcode(barcode: string, format: string = 'CODE128'): boolean {
  try {
    switch (format.toUpperCase()) {
      case 'CODE128':
        return /^[\x00-\x7F]+$/.test(barcode) && barcode.length >= 1;
      case 'EAN13':
        return /^\d{13}$/.test(barcode);
      case 'EAN8':
        return /^\d{8}$/.test(barcode);
      case 'UPC':
        return /^\d{12}$/.test(barcode);
      default:
        return barcode.length > 0;
    }
  } catch (error) {
    return false;
  }
}

/**
 * Generate EAN13 barcode with check digit
 */
export function generateEAN13(): string {
  // Generate 12 random digits
  let barcode = '';
  for (let i = 0; i < 12; i++) {
    barcode += Math.floor(Math.random() * 10).toString();
  }

  // Calculate check digit
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(barcode[i]);
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  
  const checkDigit = (10 - (sum % 10)) % 10;
  return barcode + checkDigit.toString();
}

/**
 * Generate UPC barcode with check digit
 */
export function generateUPC(): string {
  // Generate 11 random digits
  let barcode = '';
  for (let i = 0; i < 11; i++) {
    barcode += Math.floor(Math.random() * 10).toString();
  }

  // Calculate check digit
  let sum = 0;
  for (let i = 0; i < 11; i++) {
    const digit = parseInt(barcode[i]);
    sum += i % 2 === 0 ? digit * 3 : digit;
  }
  
  const checkDigit = (10 - (sum % 10)) % 10;
  return barcode + checkDigit.toString();
}

/**
 * Parse QR code data
 */
export function parseQRCodeData(qrData: string): any {
  try {
    // Try to parse as JSON first
    return JSON.parse(qrData);
  } catch {
    // If not JSON, return as plain text
    return { data: qrData };
  }
}