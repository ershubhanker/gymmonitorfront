// invoiceGenerator.js - Complete updated with Add-on and PT support

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
    let ptData;
    let addons;
    let addonPayments;

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
      
      // ✅ Add PT data if available
      ptData = d.pt_data || null;
      
      // ✅ Add addons data if available
      addons = Array.isArray(d.addons) ? d.addons : [];
      addonPayments = Array.isArray(d.addon_payments) ? d.addon_payments : [];
    } else {
      member = invoiceDataOrMember;
      membership = gymDetailsOrMembership;
      payments = paymentsArg || [];
      gymDetails = gymDetailsArg || {};
      ptData = null;
      addons = [];
      addonPayments = [];
    }

    if (!member || !member.full_name) {
      throw new Error('Member information is missing');
    }

    return buildProfessionalPDF(member, membership, payments, gymDetails, ptData, addons, addonPayments);
  } catch (error) {
    console.error('Error in generateMemberInvoice:', error);
    throw error;
  }
};

const buildProfessionalPDF = (member, membership = {}, payments = [], gymDetails = {}, ptData = null, addons = [], addonPayments = []) => {
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
    pt: [124, 58, 237],    // Purple for PT
    addon: [234, 88, 12],  // Orange for Add-ons
  };

  const plan = membership?.plan || {};
  const planPrice = normalizeAmount(plan.discounted_price || plan.price);
  const amountPaid = normalizeAmount(membership?.amount_paid);
  const discountApplied = normalizeAmount(membership?.discount_applied);
  const membershipBalance = Math.max(0, planPrice - discountApplied - amountPaid);
  
  // ✅ Calculate PT totals
  const ptTotal = ptData ? normalizeAmount(ptData.total_amount) : 0;
  const ptPaid = ptData ? normalizeAmount(ptData.amount_paid) : 0;
  const ptBalance = Math.max(0, ptTotal - ptPaid);
  
  // ✅ Calculate Add-on totals
  const addonTotal = addons.reduce((sum, a) => sum + normalizeAmount(a.price), 0);
  const addonPaid = addons.reduce((sum, a) => sum + normalizeAmount(a.amount_paid || 0), 0);
  const addonBalance = Math.max(0, addonTotal - addonPaid);
  
  // ✅ Calculate overall totals
  const totalDue = planPrice - discountApplied + ptTotal + addonTotal;
  const totalPaid = amountPaid + ptPaid + addonPaid;
  const totalBalance = membershipBalance + ptBalance + addonBalance;
  
  const currencyLabel = getCurrencyLabel(gymDetails);
  const gymName = safeText(gymDetails.name, 'GYMMONITOR FITNESS');
  const gstNumber = gymDetails.gst_number || '';
  const currentDate = new Date();
  const receiptNo = `REC-${safeText(member.id, 'NEW')}-${currentDate.getFullYear()}${String(
    currentDate.getMonth() + 1
  ).padStart(2, '0')}${String(currentDate.getDate()).padStart(2, '0')}`;
  const memberCode = `GYM${String(member.id || 'NEW').padStart(4, '0')}`;

  let y = margin;

  // Header Section
  doc.setFillColor(...colors.brand);
  doc.roundedRect(margin, y, contentWidth, 28, 3, 3, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text(gymName, margin + 6, y + 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(226, 232, 240);
  doc.text('Membership Payment Receipt', margin + 6, y + 17);

  if (gstNumber) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(226, 232, 240);
    doc.text(`GST/Tax No: ${gstNumber}`, pageWidth - margin - 6, y + 12, { align: 'right' });
  }

  const metaBoxX = pageWidth - margin - 56;
  const metaBoxY = y + 4;
  const metaBoxWidth = 50;
  const metaBoxHeight = 20;

  doc.setFillColor(30, 41, 59);
  doc.roundedRect(metaBoxX, metaBoxY, metaBoxWidth, metaBoxHeight, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('Receipt No.', metaBoxX + 3, metaBoxY + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(receiptNo, metaBoxX + 3, metaBoxY + 9);
  doc.text(`Issued: ${formatDate(currentDate, 'datetime')}`, metaBoxX + 3, metaBoxY + 14);
  doc.text(`Time: ${currentDate.toLocaleTimeString('en-IN')}`, metaBoxX + 3, metaBoxY + 18);

  y += 34;

  // Gym Contact Information Section
  const contactParts = [
    gymDetails.address ? safeText(gymDetails.address) : null,
    gymDetails.phone ? `📞 ${gymDetails.phone}` : null,
    gymDetails.email ? `✉️ ${gymDetails.email}` : null,
    gstNumber ? `GST: ${gstNumber}` : null,
  ].filter(Boolean);

  if (contactParts.length > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...colors.muted);
    const contactLines = doc.splitTextToSize(contactParts.join('  |  '), contentWidth);
    doc.text(contactLines, margin, y);
    y += contactLines.length * 4.5 + 6;
  }

  // Member Details Section
  addSectionTitle(doc, 'Member Details', margin, y, contentWidth, colors);
  y += 12;

  doc.setDrawColor(...colors.border);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin, y, contentWidth, 34, 2, 2, 'FD');

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

  y += 42;

  // Membership Details Section
  addSectionTitle(doc, 'Membership Details', margin, y, contentWidth, colors);
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
      cellPadding: 5,
    },
    alternateRowStyles: {
      fillColor: colors.brandSoft,
    },
    columnStyles: {
      0: { cellWidth: 48, fontStyle: 'bold' },
      1: { cellWidth: 'auto' },
    },
  });

  y = doc.lastAutoTable.finalY + 10;

  // ✅ Add PT Details Section if PT data exists
  if (ptData && ptTotal > 0) {
    addSectionTitle(doc, 'Personal Training Details', margin, y, contentWidth, colors);
    y += 10;

    const ptRows = [
      ['Trainer', safeText(ptData.trainer_name || 'N/A')],
      ['Start Date', ptData.start_date ? formatDate(ptData.start_date, 'full') : 'N/A'],
      ['End Date', ptData.end_date ? formatDate(ptData.end_date, 'full') : 'N/A'],
      ['Session Time', safeText(ptData.session_time || 'N/A')],
      ['Session Days', safeText(ptData.session_days_display || '—')],
      ['Status', safeText(ptData.status || 'Pending').toUpperCase()],
    ];

    if (ptData.notes) {
      ptRows.push(['Notes', safeText(ptData.notes)]);
    }

    autoTable(doc, {
      startY: y,
      theme: 'grid',
      head: [['Item', 'Details']],
      body: ptRows,
      margin: { left: margin, right: margin },
      headStyles: {
        fillColor: colors.pt,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'left',
        fontSize: 9.5,
      },
      bodyStyles: {
        textColor: colors.text,
        fontSize: 9,
        cellPadding: 5,
      },
      alternateRowStyles: {
        fillColor: colors.brandSoft,
      },
      columnStyles: {
        0: { cellWidth: 48, fontStyle: 'bold' },
        1: { cellWidth: 'auto' },
      },
    });

    y = doc.lastAutoTable.finalY + 10;
  }

  // ✅ Add Add-on Details Section if addons exist
  if (addons && addons.length > 0) {
    addSectionTitle(doc, 'Add-on Details', margin, y, contentWidth, colors);
    y += 10;

    const addonRows = addons.map(addon => [
      safeText(addon.name || 'Add-on'),
      safeText(addon.category || 'Other'),
      formatCurrency(addon.price, currencyLabel),
      addon.status ? safeText(addon.status).toUpperCase() : 'Active',
    ]);

    autoTable(doc, {
      startY: y,
      theme: 'grid',
      head: [['Name', 'Category', 'Price', 'Status']],
      body: addonRows,
      margin: { left: margin, right: margin },
      headStyles: {
        fillColor: colors.addon,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'left',
        fontSize: 9.5,
      },
      bodyStyles: {
        textColor: colors.text,
        fontSize: 9,
        cellPadding: 5,
      },
      alternateRowStyles: {
        fillColor: colors.brandSoft,
      },
      columnStyles: {
        0: { cellWidth: 48 },
        1: { cellWidth: 42 },
        2: { cellWidth: 40, halign: 'right' },
        3: { cellWidth: 30, halign: 'center' },
      },
    });

    y = doc.lastAutoTable.finalY + 10;
  }

  // Payment Summary Section
  addSectionTitle(doc, 'Payment Summary', margin, y, contentWidth, colors);
  y += 10;

  const paymentRows = [];

  // Membership section
  paymentRows.push(['MEMBERSHIP', '']);
  paymentRows.push(['Plan Price', formatCurrency(planPrice, currencyLabel)]);
  if (discountApplied > 0) {
    paymentRows.push(['Discount Applied', `- ${formatCurrency(discountApplied, currencyLabel)}`]);
  }
  paymentRows.push(['Amount Paid', formatCurrency(amountPaid, currencyLabel)]);
  if (membershipBalance > 0) {
    paymentRows.push(['Balance Due', formatCurrency(membershipBalance, currencyLabel)]);
  } else {
    paymentRows.push(['Balance Due', formatCurrency(0, currencyLabel)]);
  }

  // PT section if exists
  if (ptTotal > 0) {
    paymentRows.push(['', '']);
    paymentRows.push(['PERSONAL TRAINING', '']);
    paymentRows.push(['PT Total', formatCurrency(ptTotal, currencyLabel)]);
    if (ptPaid > 0) {
      paymentRows.push(['PT Paid', formatCurrency(ptPaid, currencyLabel)]);
    }
    if (ptBalance > 0) {
      paymentRows.push(['PT Balance Due', formatCurrency(ptBalance, currencyLabel)]);
    } else {
      paymentRows.push(['PT Balance Due', formatCurrency(0, currencyLabel)]);
    }
  }

  // Add-on section if exists
  if (addonTotal > 0) {
    paymentRows.push(['', '']);
    paymentRows.push(['ADD-ONS', '']);
    paymentRows.push(['Add-on Total', formatCurrency(addonTotal, currencyLabel)]);
    if (addonPaid > 0) {
      paymentRows.push(['Add-on Paid', formatCurrency(addonPaid, currencyLabel)]);
    }
    if (addonBalance > 0) {
      paymentRows.push(['Add-on Balance Due', formatCurrency(addonBalance, currencyLabel)]);
    } else {
      paymentRows.push(['Add-on Balance Due', formatCurrency(0, currencyLabel)]);
    }
  }

  // Separator and totals
  paymentRows.push(['', '']);
  paymentRows.push(['─' , '─']);
  paymentRows.push(['TOTAL DUE', formatCurrency(totalDue, currencyLabel)]);
  paymentRows.push(['TOTAL PAID', formatCurrency(totalPaid, currencyLabel)]);
  paymentRows.push(['TOTAL BALANCE', formatCurrency(totalBalance, currencyLabel)]);

  autoTable(doc, {
    startY: y,
    theme: 'grid',
    head: [['Description', 'Amount']],
    body: paymentRows,
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
      cellPadding: 5,
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
      
      // Skip separator rows
      if (rowTitle === '─' || rowTitle === '') return;

      // Total rows styling
      if (rowTitle === 'TOTAL DUE') {
        hookData.cell.styles.fontStyle = 'bold';
        hookData.cell.styles.textColor = colors.brand;
        hookData.row.raw[0] = 'TOTAL DUE';
      } else if (rowTitle === 'TOTAL PAID') {
        hookData.cell.styles.fontStyle = 'bold';
        hookData.cell.styles.textColor = colors.success;
        hookData.row.raw[0] = 'TOTAL PAID';
      } else if (rowTitle === 'TOTAL BALANCE') {
        hookData.cell.styles.fontStyle = 'bold';
        hookData.cell.styles.textColor = totalBalance > 0 ? colors.danger : colors.success;
        hookData.row.raw[0] = 'TOTAL BALANCE';
      }
      // Section headers
      else if (rowTitle === 'MEMBERSHIP' || rowTitle === 'PERSONAL TRAINING' || rowTitle === 'ADD-ONS') {
        hookData.cell.styles.fontStyle = 'bold';
        hookData.cell.styles.fillColor = colors.brandSoft;
        hookData.cell.styles.textColor = colors.brand;
        hookData.cell.styles.halign = 'left';
      }
      // Balance rows with balance > 0
      else if (rowTitle && (rowTitle.includes('Balance Due') || rowTitle.includes('Balance'))) {
        const amount = parseFloat(hookData.cell.raw) || 0;
        if (amount > 0) {
          hookData.cell.styles.textColor = colors.danger;
          hookData.cell.styles.fontStyle = 'bold';
        }
      }
    },
  });

  y = doc.lastAutoTable.finalY + 10;

  // Balance Status Message
  if (totalBalance > 0) {
    doc.setFillColor(...colors.dangerSoft);
    doc.setDrawColor(254, 202, 202);
    doc.roundedRect(margin, y, contentWidth, 12, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...colors.danger);
    doc.text(`⚠️ Outstanding Balance: ${formatCurrency(totalBalance, currencyLabel)}`, margin + 4, y + 8);
    y += 18;
  } else {
    doc.setFillColor(...colors.successSoft);
    doc.setDrawColor(187, 247, 208);
    doc.roundedRect(margin, y, contentWidth, 12, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...colors.success);
    doc.text('✓ Payment received in full. No outstanding dues.', margin + 4, y + 8);
    y += 18;
  }

  // Footer Section
  const footerY = Math.min(y + 8, pageHeight - 28);
  doc.setDrawColor(...colors.border);
  doc.line(margin, footerY, pageWidth - margin, footerY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...colors.muted);
  doc.text('Authorized Signatory', margin, footerY + 8);
  doc.text('Member Signature', pageWidth - margin - 30, footerY + 8);

  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text(
    'This is a computer-generated receipt and does not require a physical signature.',
    pageWidth / 2,
    pageHeight - 10,
    { align: 'center' }
  );

  if (gstNumber) {
    doc.setFontSize(6.5);
    doc.setTextColor(120, 120, 120);
    doc.text(
      `* GST/Tax Number: ${gstNumber} | This invoice is valid for tax purposes.`,
      margin,
      pageHeight - 6
    );
  }

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
  doc.roundedRect(margin, y, pageWidth - margin * 2, 22, 3, 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text('Membership Summary Report', margin + 6, y + 10);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(safeText(gymDetails.name, 'GYMMONITOR FITNESS'), margin + 6, y + 17);
  
  if (gymDetails.gst_number) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text(`GST: ${gymDetails.gst_number}`, pageWidth - margin - 6, y + 17, { align: 'right' });
  }
  
  doc.text(`Generated: ${formatDate(new Date(), 'datetime')}`, pageWidth - margin - 6, y + 10, {
    align: 'right',
  });

  y += 30;

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