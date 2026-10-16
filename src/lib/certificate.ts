import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import QRCode from "qrcode";
import type { CertificateData } from "@/lib/types";
import { SITE_URL, formatLongDate } from "@/lib/format";

const INK = rgb(0.075, 0.125, 0.114);
const BRAND = rgb(0.071, 0.4, 0.337);
const GOLD = rgb(0.83, 0.65, 0.22);
const MUTED = rgb(0.42, 0.45, 0.44);

/** Standard PDF fonts only support WinAnsi; swap or drop anything else. */
function clean(text: string) {
  return text
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .normalize("NFC")
    .replace(/[^\x20-\x7E -ÿ]/g, "");
}

function centered(page: PDFPage, text: string, y: number, font: PDFFont, size: number, color = INK, maxWidth = 680) {
  let s = size;
  const t = clean(text);
  while (font.widthOfTextAtSize(t, s) > maxWidth && s > 10) s -= 1;
  const width = font.widthOfTextAtSize(t, s);
  page.drawText(t, { x: (page.getWidth() - width) / 2, y, size: s, font, color });
}

export function verifyUrl(code: string) {
  return `${SITE_URL}/verify/${code}`;
}

async function drawCertificate(pdf: PDFDocument, data: CertificateData, fonts: Record<string, PDFFont>) {
  const page = pdf.addPage([842, 595]); // A4 landscape
  const { width, height } = page.getSize();

  // Frame
  page.drawRectangle({ x: 0, y: 0, width, height, color: rgb(0.99, 0.985, 0.97) });
  page.drawRectangle({ x: 22, y: 22, width: width - 44, height: height - 44, borderColor: BRAND, borderWidth: 3 });
  page.drawRectangle({ x: 32, y: 32, width: width - 64, height: height - 64, borderColor: GOLD, borderWidth: 1 });
  page.drawRectangle({ x: 32, y: height - 92, width: width - 64, height: 60, color: BRAND });

  centered(page, data.orgName.toUpperCase(), height - 70, fonts.sansBold, 16, rgb(1, 1, 1));

  centered(page, "CERTIFICATE OF ATTENDANCE", height - 150, fonts.serifBold, 34, BRAND);
  centered(page, "This certificate is proudly presented to", height - 195, fonts.serifItalic, 15, MUTED);

  centered(page, data.fullName, height - 255, fonts.serifBold, 40, INK);
  const lineW = 420;
  page.drawLine({
    start: { x: (width - lineW) / 2, y: height - 268 },
    end: { x: (width + lineW) / 2, y: height - 268 },
    thickness: 1,
    color: GOLD,
  });

  centered(page, "for attending and completing", height - 300, fonts.serifItalic, 15, MUTED);
  centered(page, data.eventTitle, height - 335, fonts.serifBold, 24, INK);
  const where = data.venue ? ` at ${data.venue}` : "";
  centered(page, `held on ${formatLongDate(data.startsAt)}${where}.`, height - 362, fonts.serif, 14, MUTED);

  // Signatory
  if (data.signatory) {
    const sx = 140;
    const sy = 120;
    page.drawLine({ start: { x: sx, y: sy }, end: { x: sx + 220, y: sy }, thickness: 1, color: INK });
    const name = clean(data.signatory);
    const nameSize = 13;
    page.drawText(name, {
      x: sx + (220 - fonts.sansBold.widthOfTextAtSize(name, nameSize)) / 2,
      y: sy - 18,
      size: nameSize,
      font: fonts.sansBold,
      color: INK,
    });
    if (data.signatoryTitle) {
      const title = clean(data.signatoryTitle);
      page.drawText(title, {
        x: sx + (220 - fonts.sans.widthOfTextAtSize(title, 10)) / 2,
        y: sy - 33,
        size: 10,
        font: fonts.sans,
        color: MUTED,
      });
    }
  }

  // Verification QR
  const url = verifyUrl(data.certificateCode);
  const qrPng = await QRCode.toDataURL(url, { margin: 0, width: 240, color: { dark: "#13201dff", light: "#00000000" } });
  const qr = await pdf.embedPng(qrPng);
  const qrSize = 78;
  const qx = width - 140 - qrSize - 60;
  page.drawImage(qr, { x: qx + 100, y: 76, width: qrSize, height: qrSize });
  const codeText = `Certificate No. ${data.certificateCode}`;
  page.drawText(codeText, { x: qx - 90, y: 120, size: 10, font: fonts.sansBold, color: INK });
  page.drawText("Verify this certificate at", { x: qx - 90, y: 104, size: 8, font: fonts.sans, color: MUTED });
  page.drawText(clean(url.replace(/^https?:\/\//, "")), { x: qx - 90, y: 93, size: 8, font: fonts.sans, color: BRAND });

  centered(page, "Issued via Dalo - verified by QR scan-in and scan-out", 48, fonts.sans, 8, MUTED);
}

/** One PDF with a page per certificate. */
export async function buildCertificatesPdf(list: CertificateData[]) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(list.length === 1 ? `Certificate - ${clean(list[0].fullName)}` : "Certificates");
  pdf.setCreator("Dalo");
  const fonts = {
    serif: await pdf.embedFont(StandardFonts.TimesRoman),
    serifBold: await pdf.embedFont(StandardFonts.TimesRomanBold),
    serifItalic: await pdf.embedFont(StandardFonts.TimesRomanItalic),
    sans: await pdf.embedFont(StandardFonts.Helvetica),
    sansBold: await pdf.embedFont(StandardFonts.HelveticaBold),
  };
  for (const data of list) await drawCertificate(pdf, data, fonts);
  return pdf.save();
}

export function downloadBytes(bytes: Uint8Array, filename: string, type = "application/pdf") {
  const blob = new Blob([bytes as BlobPart], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
