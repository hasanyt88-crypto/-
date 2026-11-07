import { Platform } from 'react-native';
import * as FileSystemLegacy from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';
import { AppData, Visit } from '@/context/AppContext';

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function csvCell(value: unknown): string {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

export function visitsToCsv(visits: Visit[]): string {
  const rows = [
    ['مرجع الزيارة', 'مرجع الطلب', 'التاريخ', 'اسم العميل / المنشأة', 'رقم الجوال', 'نوع المنفذ', 'طريقة الشراء', 'اسم العميل (طريقة الشراء)', 'رقم العميل', 'المندوب', 'المحافظة', 'المنطقة', 'GPS', 'الأصناف والطلبات'],
    ...visits.map((visit) => [
      visit.refId,
      visit.orderRefId ?? '',
      visit.dateDisplay,
      visit.outletName,
      visit.outletPhone ?? '',
      visit.outletType,
      visit.agent ?? '',
      visit.customerName ?? '',
      visit.customerNumber ?? '',
      visit.userName,
      visit.province,
      visit.area,
      visit.gps ? `${visit.gps.lat}, ${visit.gps.lng}` : '',
      visit.products.map((product) => `${product.name}: مخزون ${product.stock} / طلب ${product.order}`).join(' | '),
    ]),
  ];
  return '\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n');
}

export function dataToCsv(data: AppData): string {
  return visitsToCsv(data.visits);
}

function visitHtml(visit: Visit): string {
  const products = visit.products.map(p =>
    `<tr><td>${escapeHtml(p.name)}</td><td>${p.stock}</td><td>${p.order}</td></tr>`
  ).join('');
  const photo = visit.photo
    ? `<div class="media"><img src="${escapeHtml(visit.photo)}" alt="صورة العميل" /></div>`
    : '';
  const signature = visit.signature
    ? `<div class="signature"><strong>التوقيع:</strong><pre>${escapeHtml(visit.signature)}</pre></div>`
    : '';
  return `
    <section class="visit">
      <h2>${escapeHtml(visit.outletName)} <small>${escapeHtml(visit.refId)}</small></h2>
      ${visit.orderRefId ? `<p><b>مرجع الطلب:</b> ${escapeHtml(visit.orderRefId)}</p>` : ''}
      <div class="grid">
        <div><b>التاريخ:</b> ${escapeHtml(visit.dateDisplay)}</div>
        <div><b>رقم الجوال:</b> ${escapeHtml(visit.outletPhone ?? 'غير مسجل')}</div>
        <div><b>المندوب:</b> ${escapeHtml(visit.userName)}</div>
        <div><b>نوع المنفذ:</b> ${escapeHtml(visit.outletType)}</div>
        <div><b>طريقة الشراء:</b> ${escapeHtml(visit.agent ?? 'غير محددة')}</div>
        <div><b>اسم العميل (طريقة الشراء):</b> ${escapeHtml(visit.customerName ?? 'غير مسجل')}</div>
        <div><b>رقم العميل:</b> ${escapeHtml(visit.customerNumber ?? 'غير مسجل')}</div>
        <div><b>الموقع:</b> ${escapeHtml(visit.province)} / ${escapeHtml(visit.area)}</div>
        <div><b>GPS:</b> ${visit.gps ? `${visit.gps.lat}, ${visit.gps.lng}` : 'غير مسجل'}</div>
      </div>
      <h3>المخزون والطلبات</h3>
      <table><thead><tr><th>الصنف</th><th>المخزون</th><th>الطلب</th></tr></thead><tbody>${products}</tbody></table>
      ${visit.notes ? `<p><b>الملاحظات:</b> ${escapeHtml(visit.notes)}</p>` : ''}
      ${photo}${signature}
    </section>`;
}

export function visitsToHtml(visits: Visit[], title = 'تقرير الزيارات'): string {
  return `<!doctype html><html dir="rtl"><head><meta charset="utf-8"/>
    <style>
      body{font-family:Arial,sans-serif;color:#172033;padding:24px;direction:rtl}
      h1{text-align:center;color:#c2410c}h2{border-bottom:2px solid #ea580c;padding-bottom:8px}
      h2 small{font-size:11px;color:#64748b;float:left}.visit{page-break-inside:avoid;margin-bottom:24px}
      .grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;background:#f8fafc;padding:12px;border-radius:8px}
      table{width:100%;border-collapse:collapse;margin:8px 0}th,td{border:1px solid #cbd5e1;padding:7px;text-align:right}
      th{background:#fff7ed}.media img{max-width:280px;max-height:220px;object-fit:contain;margin-top:10px}
      .signature pre{white-space:pre-wrap;font-size:9px;color:#475569}
    </style></head><body><h1>${escapeHtml(title)}</h1>
    <p>عدد الزيارات: ${visits.length}</p>${visits.map(visitHtml).join('')}</body></html>`;
}

async function shareFile(uri: string, mimeType: string): Promise<void> {
  if (Platform.OS === 'web') {
    throw new Error('المشاركة المباشرة للملفات متاحة على الهاتف فقط');
  }
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType });
  }
}

export async function shareVisitsExcel(data: AppData): Promise<void> {
  const rows = data.visits.map(visit => ({
    المرجع: visit.refId,
    'مرجع الطلب': visit.orderRefId ?? '',
    التاريخ: visit.dateDisplay,
    'اسم العميل / المنشأة': visit.outletName,
    'رقم الجوال': visit.outletPhone ?? '',
    'نوع المنفذ': visit.outletType,
    'طريقة الشراء': visit.agent ?? '',
    'اسم العميل (طريقة الشراء)': visit.customerName ?? '',
    'رقم العميل': visit.customerNumber ?? '',
    المندوب: visit.userName,
    المحافظة: visit.province,
    المنطقة: visit.area,
    GPS: visit.gps ? `${visit.gps.lat}, ${visit.gps.lng}` : '',
    الأصناف: visit.products.map(product => `${product.name}: مخزون ${product.stock} / طلب ${product.order}`).join(' | '),
    الملاحظات: visit.notes ?? '',
  }));
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, sheet, 'الزيارات');
  const base64 = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });
  const uri = `${FileSystemLegacy.documentDirectory ?? ''}HETAR_Visits_${Date.now()}.xlsx`;
  await FileSystemLegacy.writeAsStringAsync(uri, base64, {
    encoding: FileSystemLegacy.EncodingType.Base64,
  });
  await shareFile(uri, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}

export async function shareVisitsPdf(visits: Visit[], title = 'تقرير الزيارات'): Promise<void> {
  const result = await Print.printToFileAsync({ html: visitsToHtml(visits, title) });
  await shareFile(result.uri, 'application/pdf');
}