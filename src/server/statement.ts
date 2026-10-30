import "server-only";
import path from "node:path";
import PDFDocument from "pdfkit";
import ExcelJS from "exceljs";
import { COMPANY } from "@/config/company";
import { PERIODS, eur, type Earnings } from "./earnings";

const ROOT = process.cwd();
const FONT = (w: string) => path.join(ROOT, "node_modules/geist/dist/fonts/geist-sans", `Geist-${w}.ttf`);
const LOGO = path.join(ROOT, "public/logo.png");
const INK = "#0E1013", MUTED = "#6B7079", LINE = "#E6E6E1", SOFT = "#F6F6F3", BRAND = "#4434E6";
const KIND: Record<string, string> = { deal: "Deal", tip: "Tip", invite: "Invite" };
const CAT: Record<string, string> = { video: "Video", photos: "Photos", voice: "Voice", custom: "Custom", worn: "Worn items" };
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const day = (iso: string) => { const d = new Date(iso); return `${String(d.getDate()).padStart(2, "0")} ${MON[d.getMonth()]} ${d.getFullYear()}`; };
const periodName = (e: Earnings) => PERIODS.find(([k]) => k === e.period)?.[1] ?? e.period;

/* A designed PDF statement: logo and parties on top, the summary in cards, then every line in an aligned table, with page numbers. */
export function pdfStatement(e: Earnings, who: { handle: string; id: string }): Promise<Buffer> {
  const doc = new PDFDocument({ size: "A4", margins: { top: 48, bottom: 64, left: 48, right: 48 }, bufferPages: true, info: { Title: `ByRequest earnings statement · ${periodName(e)}`, Author: COMPANY.name } });
  doc.registerFont("R", FONT("Regular")); doc.registerFont("M", FONT("Medium")); doc.registerFont("S", FONT("SemiBold")); doc.registerFont("B", FONT("Bold"));
  const chunks: Buffer[] = []; doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((r) => doc.on("end", () => r(Buffer.concat(chunks))));
  const L = 48, R = doc.page.width - 48, W = R - L;
  const no = `ST-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${who.id.slice(0, 6).toUpperCase()}`;

  // Header
  doc.image(LOGO, L, 44, { height: 26 });
  doc.font("B").fontSize(20).fillColor(INK).text("Earnings statement", L, 44, { width: W, align: "right" });
  doc.font("R").fontSize(9).fillColor(MUTED).text(`${day(e.start)} to ${day(e.end)}  ·  ${periodName(e)}`, L, 70, { width: W, align: "right" });
  doc.moveTo(L, 100).lineTo(R, 100).lineWidth(0.6).strokeColor(LINE).stroke();

  // Parties
  const col = W / 3;
  const party = (x: number, h: string, lines: string[]) => { doc.font("S").fontSize(7.5).fillColor(MUTED).text(h.toUpperCase(), x, 116, { width: col - 12, characterSpacing: 0.8 }); doc.font("R").fontSize(9.5).fillColor(INK).text(lines.join("\n"), x, 130, { width: col - 12, lineGap: 2 }); };
  party(L, "Prepared for", [who.handle, "Creator on ByRequest"]);
  party(L + col, "Issued by", [COMPANY.name, COMPANY.address]);
  party(L + col * 2, "Statement", [`No. ${no}`, `Issued ${day(new Date().toISOString())}`, "Currency EUR"]);

  // Hero total
  let y = 196;
  doc.roundedRect(L, y, W, 86, 14).fill(INK);
  doc.font("M").fontSize(9).fillColor("#B9B7C9").text(`EARNED IN THIS PERIOD`, L + 22, y + 18, { characterSpacing: 0.8 });
  doc.font("B").fontSize(30).fillColor("#FFFFFF").text(eur(e.total), L + 22, y + 34);
  const delta = e.prevTotal ? Math.round(((e.total - e.prevTotal) / e.prevTotal) * 100) : null;
  doc.font("R").fontSize(9).fillColor("#B9B7C9").text(delta === null ? "First period with income" : `${delta >= 0 ? "Up" : "Down"} ${Math.abs(delta)}% against the previous period (${eur(e.prevTotal)})`, L + 22, y + 66);
  const stats: [string, string][] = [["Deals completed", String(e.dealCount)], ["Average per deal", eur(e.avgDeal)], ["On its way", eur(e.pending)]];
  stats.forEach(([k, v], i) => { const x = L + W * 0.52 + i * (W * 0.16); doc.font("R").fontSize(8).fillColor("#B9B7C9").text(k, x, y + 26, { width: W * 0.16 - 6 }); doc.font("S").fontSize(13).fillColor("#FFFFFF").text(v, x, y + 46, { width: W * 0.16 - 6 }); });
  y += 106;

  // Breakdown cards
  const cards: [string, number, string][] = [["Deals", e.deals, `${e.dealCount} completed`], ["Tips", e.tips, `${e.tipCount} received`], ["Invites", e.invites, "rewards paid"], ["All time", e.lifetime, "since you started"]];
  const cw = (W - 3 * 10) / 4;
  cards.forEach(([k, v, s], i) => {
    const x = L + i * (cw + 10);
    doc.roundedRect(x, y, cw, 62, 10).fill(SOFT);
    doc.font("M").fontSize(8).fillColor(MUTED).text(k.toUpperCase(), x + 12, y + 11, { characterSpacing: 0.6 });
    doc.font("B").fontSize(14).fillColor(INK).text(eur(v), x + 12, y + 25, { width: cw - 24 });
    doc.font("R").fontSize(8).fillColor(MUTED).text(s, x + 12, y + 44, { width: cw - 24 });
  });
  y += 84;

  // By type
  if (e.categories.length) {
    doc.font("S").fontSize(11).fillColor(INK).text("By type of content", L, y); y += 20;
    const max = Math.max(...e.categories.map((c) => c.cents));
    for (const c of e.categories) {
      doc.font("R").fontSize(9).fillColor(INK).text(CAT[c.k] ?? c.k, L, y + 1, { width: 110 });
      doc.roundedRect(L + 120, y + 2, (W - 220) * (c.cents / max), 8, 4).fill(BRAND);
      doc.font("M").fontSize(9).fillColor(INK).text(eur(c.cents), R - 90, y + 1, { width: 90, align: "right" });
      y += 18;
    }
    y += 14;
  }

  // Transactions table
  const cols = [{ h: "Date", w: 78, a: "left" }, { h: "Description", w: W - 78 - 92 - 58 - 86, a: "left" }, { h: "Buyer", w: 92, a: "left" }, { h: "Type", w: 58, a: "left" }, { h: "You earned", w: 86, a: "right" }] as const;
  const head = () => {
    doc.rect(L, y, W, 22).fill(SOFT);
    let x = L; for (const c of cols) { doc.font("S").fontSize(7.5).fillColor(MUTED).text(c.h.toUpperCase(), x + 8, y + 7.5, { width: c.w - 16, align: c.a, characterSpacing: 0.6 }); x += c.w; }
    y += 22;
  };
  doc.font("S").fontSize(11).fillColor(INK).text("Transactions", L, y); y += 20; head();
  const bottom = doc.page.height - 84;
  e.lines.forEach((l, i) => {
    if (y + 20 > bottom) { doc.addPage(); y = 48; head(); }
    if (i % 2 === 1) doc.rect(L, y, W, 20).fill("#FBFBF9");
    const cells = [day(l.at), l.title, l.buyer ?? "", KIND[l.kind], eur(l.cents)];
    let x = L; cols.forEach((c, j) => { doc.font(j === 4 ? "M" : "R").fontSize(8.5).fillColor(j === 0 || j === 2 ? MUTED : INK).text(cells[j], x + 8, y + 6, { width: c.w - 16, align: c.a, lineBreak: false, ellipsis: true }); x += c.w; });
    doc.moveTo(L, y + 20).lineTo(R, y + 20).lineWidth(0.4).strokeColor(LINE).stroke();
    y += 20;
  });
  if (!e.lines.length) { doc.font("R").fontSize(9).fillColor(MUTED).text("No income in this period.", L + 8, y + 8); y += 28; }
  if (y + 40 > bottom) { doc.addPage(); y = 48; }
  doc.rect(L, y + 4, W, 28).fill(INK);
  doc.font("S").fontSize(9.5).fillColor("#FFFFFF").text(`Total, ${e.lines.length} lines`, L + 8, y + 13, { width: W / 2 });
  doc.font("B").fontSize(10.5).fillColor("#FFFFFF").text(eur(e.total), R - 160, y + 12.5, { width: 152, align: "right" });
  y += 48;
  doc.font("R").fontSize(7.5).fillColor(MUTED).text("Amounts are what you received, in euro. Payouts are made by our payment partner to the payout account you set up. Keep this statement for your own records and tax return; it is not a tax invoice.", L, y, { width: W, lineGap: 1.5 });

  // Footer with page numbers on every page
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    doc.page.margins.bottom = 0;   // the footer sits below the text area; without this pdfkit would start a new page
    const fy = doc.page.height - 40;
    doc.moveTo(L, fy - 8).lineTo(R, fy - 8).lineWidth(0.4).strokeColor(LINE).stroke();
    doc.font("R").fontSize(7.5).fillColor(MUTED).text(`ByRequest  ·  ${COMPANY.name}  ·  ${COMPANY.address}`, L, fy, { width: W - 80, lineBreak: false });
    doc.text(`Page ${i + 1} of ${range.count}`, R - 80, fy, { width: 80, align: "right", lineBreak: false });
  }
  doc.end();
  return done;
}

/* The same period as a workbook: a summary sheet and every line with deal value, service fee and earnings, ready for bookkeeping. */
export async function xlsxStatement(e: Earnings, who: { handle: string }): Promise<Buffer> {
  const wb = new ExcelJS.Workbook(); wb.creator = "ByRequest"; wb.created = new Date();
  const money = '"€"#,##0.00';
  const s = wb.addWorksheet("Summary", { views: [{ showGridLines: false }] });
  s.columns = [{ width: 30 }, { width: 22 }, { width: 18 }];
  s.addRow(["ByRequest earnings statement"]).font = { bold: true, size: 16 };
  s.addRow([`${who.handle} · ${periodName(e)} · ${day(e.start)} to ${day(e.end)}`]).font = { color: { argb: "FF6B7079" } };
  s.addRow([]);
  const rows: [string, number | string, string?][] = [["Earned in this period", e.total / 100], ["Previous period", e.prevTotal / 100], ["From deals", e.deals / 100], ["From tips", e.tips / 100], ["From invites", e.invites / 100], ["Deals completed", e.dealCount], ["Average per deal", e.avgDeal / 100], ["Biggest deal", e.biggest / 100], ["On its way", e.pending / 100], ["All time", e.lifetime / 100]];
  for (const [k, v] of rows) { const r = s.addRow([k, v]); r.getCell(1).font = { color: { argb: "FF3B3F46" } }; if (typeof v === "number" && k !== "Deals completed") r.getCell(2).numFmt = money; r.getCell(2).font = { bold: true }; }
  s.getRow(4).getCell(2).font = { bold: true, size: 13, color: { argb: "FF4434E6" } };
  if (e.categories.length) { s.addRow([]); s.addRow(["By type of content"]).font = { bold: true }; for (const c of e.categories) { const r = s.addRow([CAT[c.k] ?? c.k, c.cents / 100]); r.getCell(2).numFmt = money; } }
  s.addRow([]); s.addRow([`${COMPANY.name} · ${COMPANY.address}`]).font = { size: 9, color: { argb: "FF6B7079" } };

  const t = wb.addWorksheet("Transactions", { views: [{ state: "frozen", ySplit: 1, showGridLines: false }] });
  t.columns = [
    { header: "Date", key: "date", width: 14, style: { numFmt: "dd mmm yyyy" } }, { header: "Description", key: "desc", width: 44 }, { header: "Buyer", key: "buyer", width: 18 },
    { header: "Type", key: "type", width: 10 }, { header: "Content", key: "cat", width: 12 },
    { header: "Deal value", key: "gross", width: 14, style: { numFmt: money } }, { header: "Platform share", key: "fee", width: 15, style: { numFmt: money } }, { header: "You earned", key: "net", width: 14, style: { numFmt: money } },
  ];
  const h = t.getRow(1); h.font = { bold: true, color: { argb: "FFFFFFFF" } }; h.height = 22; h.alignment = { vertical: "middle" };
  h.eachCell((c) => { c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0E1013" } }; });
  for (const l of e.lines) t.addRow({ date: new Date(l.at), desc: l.title, buyer: l.buyer ?? "", type: KIND[l.kind], cat: l.category ? CAT[l.category] ?? l.category : "", gross: l.dealCents / 100, fee: l.feeCents / 100, net: l.cents / 100 });
  const last = t.rowCount;
  const tot = t.addRow({ desc: `Total, ${e.lines.length} lines` });
  for (const k of ["F", "G", "H"]) tot.getCell(k).value = last > 1 ? { formula: `SUM(${k}2:${k}${last})` } : 0;
  tot.font = { bold: true }; tot.eachCell((c) => { c.border = { top: { style: "thin" } }; });
  if (last > 1) t.autoFilter = { from: "A1", to: `H${last}` };
  return Buffer.from(await wb.xlsx.writeBuffer());
}
