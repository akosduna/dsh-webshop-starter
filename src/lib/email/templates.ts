import type { OrderEmailKind } from '@/db/schema';

/** Croatian order e-mail templates. Pure functions: data in, { subject, html, text } out. */

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function euros(cents: number): string {
  return `${(cents / 100).toFixed(2).replace('.', ',')} €`;
}

export function layout(title: string, body: string, shopName = ''): string {
  return `<!doctype html><html lang="hr"><body style="margin:0;background:#f5f5f4;font-family:Arial,Helvetica,sans-serif;color:#1c1917">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;padding:28px">
<tr><td>
${shopName ? `<p style="margin:0 0 16px;font-size:13px;color:#78716c">${escapeHtml(shopName)}</p>` : ''}
<h1 style="margin:0 0 16px;font-size:22px">${escapeHtml(title)}</h1>
<div style="font-size:15px;line-height:1.6">${body}</div>
</td></tr></table></td></tr></table></body></html>`;
}

export type OrderEmailData = {
  shopName: string;
  customerName: string;
  orderNumber: number;
  orderUrl: string;
  items: { name: string; quantity: number; lineTotalCents: number }[];
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  shippingMethodName: string;
  bank?: {
    iban: string;
    recipientName: string;
    model: string;
    reference: string;
    barcodeUrl: string;
  } | null;
  tracking?: { carrier: string; number: string; url: string } | null;
};

export type RenderedEmail = { subject: string; html: string; text: string };

function itemsTable(data: OrderEmailData): { html: string; text: string } {
  const rows = data.items
    .map(
      (i) =>
        `<tr><td style="padding:4px 0">${escapeHtml(i.name)} × ${i.quantity}</td><td align="right" style="padding:4px 0">${euros(i.lineTotalCents)}</td></tr>`,
    )
    .join('');
  const html = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;border-top:1px solid #e7e5e4;border-bottom:1px solid #e7e5e4">
${rows}
<tr><td style="padding:4px 0;color:#78716c">Dostava (${escapeHtml(data.shippingMethodName)})</td><td align="right" style="padding:4px 0;color:#78716c">${data.shippingCents ? euros(data.shippingCents) : 'Besplatno'}</td></tr>
<tr><td style="padding:8px 0"><strong>Ukupno</strong></td><td align="right" style="padding:8px 0"><strong>${euros(data.totalCents)}</strong></td></tr>
</table>`;
  const text = [
    ...data.items.map((i) => `${i.name} × ${i.quantity}: ${euros(i.lineTotalCents)}`),
    `Dostava (${data.shippingMethodName}): ${data.shippingCents ? euros(data.shippingCents) : 'Besplatno'}`,
    `Ukupno: ${euros(data.totalCents)}`,
  ].join('\n');
  return { html, text };
}

function greeting(data: OrderEmailData) {
  const first = data.customerName.trim().split(/\s+/)[0];
  return first ? `Pozdrav ${first},` : 'Pozdrav,';
}

export function renderOrderEmail(kind: OrderEmailKind, data: OrderEmailData): RenderedEmail {
  const table = itemsTable(data);
  const link = `<p><a href="${escapeHtml(data.orderUrl)}">Pogledajte narudžbu</a></p>`;
  const hello = escapeHtml(greeting(data));

  switch (kind) {
    case 'bank_transfer': {
      const bank = data.bank;
      const bankHtml = bank
        ? `<p>Molimo uplatite <strong>${euros(data.totalCents)}</strong> na:</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="font-size:15px">
<tr><td style="padding:2px 12px 2px 0;color:#78716c">Primatelj</td><td>${escapeHtml(bank.recipientName)}</td></tr>
<tr><td style="padding:2px 12px 2px 0;color:#78716c">IBAN</td><td>${escapeHtml(bank.iban)}</td></tr>
<tr><td style="padding:2px 12px 2px 0;color:#78716c">Model</td><td>${escapeHtml(bank.model)}</td></tr>
<tr><td style="padding:2px 12px 2px 0;color:#78716c">Poziv na broj</td><td>${escapeHtml(bank.reference)}</td></tr>
</table>
<p><img src="${escapeHtml(bank.barcodeUrl)}" alt="Barkod za plaćanje" style="max-width:100%;margin-top:12px"></p>
<p style="color:#78716c;font-size:13px">Barkod možete skenirati aplikacijom svoje banke.</p>`
        : '';
      const bankText = bank
        ? `Molimo uplatite ${euros(data.totalCents)}.\nPrimatelj: ${bank.recipientName}\nIBAN: ${bank.iban}\nModel: ${bank.model}\nPoziv na broj: ${bank.reference}`
        : '';
      return {
        subject: `Narudžba #${data.orderNumber} — upute za uplatu`,
        html: layout(
          `Hvala na narudžbi #${data.orderNumber}`,
          `<p>${hello}</p><p>zaprimili smo vašu narudžbu. Šaljemo je čim uplata stigne na naš račun.</p>${bankHtml}${table.html}${link}`,
          data.shopName,
        ),
        text: `${greeting(data)}\n\nzaprimili smo vašu narudžbu #${data.orderNumber}. Šaljemo je čim uplata stigne.\n\n${bankText}\n\n${table.text}\n\n${data.orderUrl}`,
      };
    }
    case 'received':
      return {
        subject: `Narudžba #${data.orderNumber} je zaprimljena`,
        html: layout(
          `Hvala na narudžbi #${data.orderNumber}`,
          `<p>${hello}</p><p>plaćanje je uspjelo i narudžba je zaprimljena. Javit ćemo vam kad je pošaljemo.</p>${table.html}${link}`,
          data.shopName,
        ),
        text: `${greeting(data)}\n\nplaćanje je uspjelo i narudžba #${data.orderNumber} je zaprimljena.\n\n${table.text}\n\n${data.orderUrl}`,
      };
    case 'paid':
      return {
        subject: `Uplata za narudžbu #${data.orderNumber} je stigla`,
        html: layout(
          'Uplata je zaprimljena',
          `<p>${hello}</p><p>vaša uplata za narudžbu #${data.orderNumber} je stigla. Pripremamo narudžbu za slanje.</p>${table.html}${link}`,
          data.shopName,
        ),
        text: `${greeting(data)}\n\nvaša uplata za narudžbu #${data.orderNumber} je stigla. Pripremamo narudžbu za slanje.\n\n${data.orderUrl}`,
      };
    case 'shipped': {
      const tracking = data.tracking;
      const trackingHtml = tracking
        ? `<p>Dostavlja ${escapeHtml(tracking.carrier)}, broj pošiljke <strong>${escapeHtml(tracking.number)}</strong>.</p><p><a href="${escapeHtml(tracking.url)}">Pratite pošiljku</a></p>`
        : '';
      const trackingText = tracking
        ? `Dostavlja ${tracking.carrier}, broj pošiljke ${tracking.number}: ${tracking.url}`
        : '';
      return {
        subject: `Narudžba #${data.orderNumber} je poslana`,
        html: layout(
          'Narudžba je na putu',
          `<p>${hello}</p><p>vaša narudžba #${data.orderNumber} je poslana.</p>${trackingHtml}${link}`,
          data.shopName,
        ),
        text: `${greeting(data)}\n\nvaša narudžba #${data.orderNumber} je poslana.\n${trackingText}\n\n${data.orderUrl}`,
      };
    }
  }
}
