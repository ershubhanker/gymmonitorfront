import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const DEFAULT_CURRENCY_LABEL = 'Rs.';

const normalizeAmount = (amount) => {
  const parsed = Number(amount);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatCurrency = (amount, currencyLabel = DEFAULT_CURRENCY_LABEL) => {
  const value = normalizeAmount(amount);
  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

  return `${currencyLabel} ${formatted}`;
};

const formatDate = (dateInput, format = 'full') => {
  if (!dateInput) return 'N/A';

  try {
    const date = new Date(dateInput);
    if (Number.isNaN(date.getTime())) return 'N/A';

    if (format === 'short') {
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    }

    if (format === 'datetime') {
      return date.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }

    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return 'N/A';
  }
};

const getCurrencyLabel = (gymDetails = {}) => {
  const rawSymbol = String(gymDetails.currency_symbol || '').trim();
  if (!rawSymbol || rawSymbol === '₹') return DEFAULT_CURRENCY_LABEL;
  return rawSymbol;
};

const safeText = (value, fallback = 'N/A') => {
  if (value === null || value === undefined || value === '') return fallback;
  return String(value);
};

const drawLabeledText = (doc, label, value, x, y, labelWidth = 26, maxWidth) => {
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(55, 65, 81);
  doc.text(label, x, y);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(17, 24, 39);
  const lines = doc.splitTextToSize(safeText(value), maxWidth || 60);
  doc.text(lines, x + labelWidth, y);
  return lines.length;
};

const addSectionTitle = (doc, title, x, y, width, colors) => {
  doc.setFillColor(...colors.sectionFill);
  doc.roundedRect(x, y, width, 8, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...colors.sectionText);
  doc.text(title, x + 4, y + 5.5);
};

export const generateMemberInvoice = async (
  invoiceDataOrMember,
  gymDetailsOrMembership,
  paymentsArg,
  gymDetailsArg
) => {
  try {
    let member;
    let membership;
    let payments;
    let gymDetails;

    const isNewStyle =
      gymDetailsArg === undefined &&
      invoiceDataOrMember &&
      'plan_name' in invoiceDataOrMember;

    if (isNewStyle) {
      const d = invoiceDataOrMember;
      gymDetails = gymDetailsOrMembership || {};

      member = {
        id: d.id,
        full_name: d.full_name || d.fullName || 'Member',
        phone: d.phone || 'N/A',
        email: d.email || '',
        gender: d.gender || 'N/A',
        date_of_birth: d.date_of_birth || null,
        joined_date: d.joined_date || new Date().toISOString().split('T')[0],
        address: d.address || '',
      };

      membership = {
        start_date: d.start_date,
        end_date: d.end_date,
        status: d.membership_status || 'active',
        amount_paid: normalizeAmount(d.amount_paid),
        discount_applied: normalizeAmount(d.discount_applied),
        plan: {
          name: d.plan_name || 'No Plan',
          plan_type: d.plan_type || null,
          duration_days: d.duration_days || null,
          price: normalizeAmount(d.plan_price),
          discounted_price: normalizeAmount(d.plan_price),
        },
      };

      payments = Array.isArray(d.payments) ? d.payments : [];
    } else {
      member = invoiceDataOrMember;
      membership = gymDetailsOrMembership;
      payments = paymentsArg || [];
      gymDetails = gymDetailsArg || {};
    }

    if (!member || !member.full_name) {
      throw new Error('Member information is missing');
    }

    return buildProfessionalPDF(member, membership, payments, gymDetails);
  } catch (error) {
    console.error('Error in generateMemberInvoice:', error);
    throw error;
  }
};

const buildProfessionalPDF = (member, membership = {}, payments = [], gymDetails = {}) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  const colors = {
    brand: [15, 23, 42],
    brandSoft: [241, 245, 249],
    accent: [14, 116, 144],
    accentSoft: [236, 254, 255],
    success: [22, 163, 74],
    successSoft: [240, 253, 244],
    danger: [220, 38, 38],
    dangerSoft: [254, 242, 242],
    text: [17, 24, 39],
    muted: [100, 116, 139],
    border: [226, 232, 240],
    sectionFill: [248, 250, 252],
    sectionText: [30, 41, 59],
  };

  const plan = membership?.plan || {};
  const planPrice = normalizeAmount(plan.discounted_price || plan.price);
  const amountPaid = normalizeAmount(membership?.amount_paid);
  const discountApplied = normalizeAmount(membership?.discount_applied);
  const balanceDue = Math.max(0, planPrice - discountApplied - amountPaid);
  const currencyLabel = getCurrencyLabel(gymDetails);
  const gymName = safeText(gymDetails.name, 'GYMMONITOR FITNESS');
  const currentDate = new Date();
  const receiptNo = `REC-${safeText(member.id, 'NEW')}-${currentDate.getFullYear()}${String(
    currentDate.getMonth() + 1
  ).padStart(2, '0')}${String(currentDate.getDate()).padStart(2, '0')}`;
  const memberCode = `GYM${String(member.id || 'NEW').padStart(4, '0')}`;

  let y = margin;

  doc.setFillColor(...colors.brand);
  doc.roundedRect(margin, y, contentWidth, 24, 3, 3, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text(gymName, margin + 6, y + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(226, 232, 240);
  doc.text('Membership Payment Receipt', margin + 6, y + 15);

  const metaBoxX = pageWidth - margin - 56;
  const metaBoxY = y + 4;
  const metaBoxWidth = 50;
  const metaBoxHeight = 16;

  doc.setFillColor(30, 41, 59);
  doc.roundedRect(metaBoxX, metaBoxY, metaBoxWidth, metaBoxHeight, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Receipt No.', metaBoxX + 3, metaBoxY + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(receiptNo, metaBoxX + 3, metaBoxY + 9);
  doc.text(`Issued: ${formatDate(currentDate, 'datetime')}`, metaBoxX + 3, metaBoxY + 13);

  y += 30;

  const contactParts = [
    gymDetails.address ? safeText(gymDetails.address) : null,
    gymDetails.phone ? `Phone: ${gymDetails.phone}` : null,
    gymDetails.email ? `Email: ${gymDetails.email}` : null,
  ].filter(Boolean);

  if (contactParts.length > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...colors.muted);
    const contactLines = doc.splitTextToSize(contactParts.join(' | '), contentWidth);
    doc.text(contactLines, margin, y);
    y += contactLines.length * 4.2 + 4;
  }

  addSectionTitle(doc, 'Member Details', margin, y, contentWidth, colors);
  y += 12;

  doc.setDrawColor(...colors.border);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin, y, contentWidth, 30, 2, 2, 'FD');

  drawLabeledText(doc, 'Name', safeText(member.full_name), margin + 5, y + 8, 24, 55);
  drawLabeledText(doc, 'Member ID', memberCode, margin + 105, y + 8, 26, 35);
  drawLabeledText(doc, 'Phone', safeText(member.phone), margin + 5, y + 16, 24, 55);
  drawLabeledText(doc, 'Email', safeText(member.email, 'N/A'), margin + 105, y + 16, 26, 50);
  drawLabeledText(
    doc,
    'Joined',
    member.joined_date ? formatDate(member.joined_date, 'full') : formatDate(currentDate, 'full'),
    margin + 5,
    y + 24,
    24,
    55
  );
  drawLabeledText(
    doc,
    'Status',
    membership?.status ? safeText(membership.status).toUpperCase() : 'PENDING',
    margin + 105,
    y + 24,
    26,
    35
  );

  y += 38;

  addSectionTitle(doc, 'Membership Summary', margin, y, contentWidth, colors);
  y += 10;

  autoTable(doc, {
    startY: y,
    theme: 'grid',
    head: [['Item', 'Details']],
    body: [
      ['Plan Name', safeText(plan.name)],
      ['Plan Type', plan.plan_type ? safeText(plan.plan_type).replace(/_/g, ' ').toUpperCase() : 'N/A'],
      ['Duration', plan.duration_days ? `${plan.duration_days} Days` : 'N/A'],
      ['Start Date', membership?.start_date ? formatDate(membership.start_date, 'full') : 'N/A'],
      ['End Date', membership?.end_date ? formatDate(membership.end_date, 'full') : 'N/A'],
    ],
    margin: { left: margin, right: margin },
    headStyles: {
      fillColor: colors.accent,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'left',
      fontSize: 9.5,
    },
    bodyStyles: {
      textColor: colors.text,
      fontSize: 9,
      cellPadding: 4.5,
    },
    alternateRowStyles: {
      fillColor: colors.brandSoft,
    },
    columnStyles: {
      0: { cellWidth: 48, fontStyle: 'bold' },
      1: { cellWidth: 'auto' },
    },
  });

  y = doc.lastAutoTable.finalY + 8;

  addSectionTitle(doc, 'Payment Summary', margin, y, contentWidth, colors);
  y += 10;

  autoTable(doc, {
    startY: y,
    theme: 'grid',
    head: [['Description', 'Amount']],
    body: [
      ['Plan Price', formatCurrency(planPrice, currencyLabel)],
      ...(discountApplied > 0 ? [['Discount Applied', formatCurrency(discountApplied, currencyLabel)]] : []),
      ['Amount Paid', formatCurrency(amountPaid, currencyLabel)],
      ['Balance Due', formatCurrency(balanceDue, currencyLabel)],
    ],
    margin: { left: margin, right: margin },
    headStyles: {
      fillColor: colors.brand,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'left',
      fontSize: 9.5,
    },
    bodyStyles: {
      textColor: colors.text,
      fontSize: 9,
      cellPadding: 4.5,
    },
    alternateRowStyles: {
      fillColor: colors.brandSoft,
    },
    columnStyles: {
      0: { cellWidth: 85, fontStyle: 'bold' },
      1: { cellWidth: 45, halign: 'right' },
    },
    didParseCell: (hookData) => {
      if (hookData.section !== 'body' || hookData.column.index !== 1) return;

      const rowTitle = hookData.row.raw[0];
      if (rowTitle === 'Balance Due' && balanceDue > 0) {
        hookData.cell.styles.textColor = colors.danger;
        hookData.cell.styles.fontStyle = 'bold';
      } else if (rowTitle === 'Amount Paid') {
        hookData.cell.styles.textColor = colors.success;
        hookData.cell.styles.fontStyle = 'bold';
      }
    },
  });

  y = doc.lastAutoTable.finalY + 8;

  if (payments.length > 0) {
    addSectionTitle(doc, 'Payment History', margin, y, contentWidth, colors);
    y += 10;

    autoTable(doc, {
      startY: y,
      theme: 'grid',
      head: [['Date', 'Method', 'Reference', 'Amount', 'Status']],
      body: payments.map((payment) => [
        formatDate(payment.payment_date, 'short'),
        safeText(payment.payment_method || 'Cash').toUpperCase(),
        safeText(payment.reference_no || payment.transaction_id || '-'),
        formatCurrency(payment.amount, currencyLabel),
        payment.status === 'completed' ? 'Completed' : 'Pending',
      ]),
      margin: { left: margin, right: margin },
      headStyles: {
        fillColor: colors.accent,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center',
        fontSize: 8.5,
      },
      bodyStyles: {
        textColor: colors.text,
        fontSize: 8.5,
        cellPadding: 4,
      },
      alternateRowStyles: {
        fillColor: colors.brandSoft,
      },
      columnStyles: {
        0: { cellWidth: 28 },
        1: { cellWidth: 28, halign: 'center' },
        2: { cellWidth: 55 },
        3: { cellWidth: 32, halign: 'right' },
        4: { cellWidth: 28, halign: 'center' },
      },
      didParseCell: (hookData) => {
        if (hookData.section !== 'body' || hookData.column.index !== 4) return;
        if (hookData.cell.raw === 'Completed') {
          hookData.cell.styles.textColor = colors.success;
          hookData.cell.styles.fontStyle = 'bold';
        } else {
          hookData.cell.styles.textColor = colors.danger;
          hookData.cell.styles.fontStyle = 'bold';
        }
      },
    });

    y = doc.lastAutoTable.finalY + 8;
  }

  if (balanceDue > 0) {
    doc.setFillColor(...colors.dangerSoft);
    doc.setDrawColor(254, 202, 202);
    doc.roundedRect(margin, y, contentWidth, 11, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...colors.danger);
    doc.text(`Outstanding balance: ${formatCurrency(balanceDue, currencyLabel)}`, margin + 4, y + 7);
    y += 16;
  } else {
    doc.setFillColor(...colors.successSoft);
    doc.setDrawColor(187, 247, 208);
    doc.roundedRect(margin, y, contentWidth, 11, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...colors.success);
    doc.text('Payment received in full. No outstanding dues.', margin + 4, y + 7);
    y += 16;
  }

  const footerY = Math.min(y + 8, pageHeight - 24);
  doc.setDrawColor(...colors.border);
  doc.line(margin, footerY, pageWidth - margin, footerY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...colors.muted);
  doc.text('Authorized Signatory', margin, footerY + 8);
  doc.text('Member Signature', pageWidth - margin - 30, footerY + 8);

  doc.setFontSize(7.5);
  doc.text(
    'This is a computer-generated receipt and does not require a physical signature.',
    pageWidth / 2,
    pageHeight - 10,
    { align: 'center' }
  );

  const safeName = safeText(member.full_name, 'member').replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`Receipt_${safeName}_${currentDate.getTime()}.pdf`);

  return true;
};

export const generateBulkInvoiceSummary = async (members, gymDetails = {}) => {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 12;
  let y = margin;

  doc.setFillColor(15, 23, 42);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 18, 3, 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text('Membership Summary Report', margin + 6, y + 8);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(safeText(gymDetails.name, 'GYMMONITOR FITNESS'), margin + 6, y + 14);
  doc.text(`Generated: ${formatDate(new Date(), 'datetime')}`, pageWidth - margin - 6, y + 14, {
    align: 'right',
  });

  y += 26;

  autoTable(doc, {
    startY: y,
    theme: 'grid',
    head: [['ID', 'Member Name', 'Phone', 'Plan', 'Status', 'Expiry Date']],
    body: (members || []).map((member) => [
      safeText(member.id),
      safeText(member.full_name),
      safeText(member.phone),
      safeText(member.membership, 'No Plan'),
      safeText(member.status),
      member.membershipEndDate ? formatDate(member.membershipEndDate, 'short') : 'N/A',
    ]),
    margin: { left: margin, right: margin },
    headStyles: {
      fillColor: [14, 116, 144],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 8.5,
      cellPadding: 4,
      textColor: [17, 24, 39],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 18 },
      1: { cellWidth: 52 },
      2: { cellWidth: 34 },
      3: { cellWidth: 42 },
      4: { halign: 'center', cellWidth: 26 },
      5: { halign: 'center', cellWidth: 30 },
    },
  });

  doc.save(`Membership_Summary_${new Date().toISOString().split('T')[0]}.pdf`);
  return true;
};
