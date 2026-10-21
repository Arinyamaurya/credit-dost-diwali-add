/**
 * Generates an Excel-safe, UTF-8 BOM CSV from leads documents.
 */
function leadsToCsv(leads) {
  const BOM = '\uFEFF';
  const headers = [
    'Lead ID',
    'Date & Time (IST/UTC)',
    'Offer Kind',
    'Status',
    'Amount (INR)',
    'Name',
    'Mobile',
    'Email',
    'City',
    'PIN Code',
    'Payment Ref',
    'Paid At',
    'IP Address',
    'Traffic Source',
  ];

  const escapeCsvCell = (val) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    // Guard against CSV formula injection (=, +, -, @, \t, \r)
    if (/^[=+\-@\t\r]/.test(str)) {
      return `"'${str}"`;
    }
    return `"${str}"`;
  };

  const rows = leads.map((l) => [
    escapeCsvCell(l._id || l.id),
    escapeCsvCell(l.createdAt ? new Date(l.createdAt).toISOString() : ''),
    escapeCsvCell(l.kind),
    escapeCsvCell(l.status),
    escapeCsvCell(l.amount),
    escapeCsvCell(l.name),
    escapeCsvCell(l.mobile),
    escapeCsvCell(l.email),
    escapeCsvCell(l.city),
    escapeCsvCell(l.pin),
    escapeCsvCell(l.paymentRef || ''),
    escapeCsvCell(l.paidAt ? new Date(l.paidAt).toISOString() : ''),
    escapeCsvCell(l.ip || ''),
    escapeCsvCell(l.source || ''),
  ]);

  const csvContent = [headers.map((h) => `"${h}"`).join(','), ...rows.map((r) => r.join(','))].join('\r\n');

  return BOM + csvContent;
}

module.exports = { leadsToCsv };
