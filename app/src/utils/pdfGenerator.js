import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { format, parseISO } from 'date-fns';

export const generateTravelExpensePDF = (data, periodString, employeeName) => {
  const doc = new jsPDF('p', 'pt', 'a4');
  
  // 1. Company / Report Header
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('Shubh Labh', 40, 50);
  
  doc.setFontSize(16);
  doc.setTextColor(100, 100, 100);
  doc.text('Travel Expense Report', 40, 75);

  // Status Badge
  const hasExceptions = data.records.some(r => r.status === 'REVIEW_REQUIRED' || r.status === 'DISTANCE_UNAVAILABLE' || r.status === 'RATE_ALLOCATION_REQUIRES_REVIEW');
  const allPaid = data.records.length > 0 && data.records.every(r => r.workflow_status === 'PAID');
  const allApproved = data.records.length > 0 && data.records.every(r => r.workflow_status === 'APPROVED' || r.workflow_status === 'PAID');
  
  let overallStatus = hasExceptions ? 'EXCEPTIONS FOUND' : 'CLEAN';
  if (allPaid) overallStatus = 'PAID';
  else if (allApproved) overallStatus = 'APPROVED';
  
  doc.setFontSize(10);
  doc.setTextColor(hasExceptions ? 255 : 255, 255, 255);
  doc.setFillColor(hasExceptions ? 211 : 46, hasExceptions ? 47 : 125, hasExceptions ? 47 : 50); // Red if exceptions, Green if clean
  doc.rect(400, 55, 140, 20, 'F');
  doc.text(`STATUS: ${overallStatus}`, 470, 69, { align: 'center' });

  // 2. Employee & Period Details
  doc.setFontSize(12);
  doc.setTextColor(40, 40, 40);
  doc.text(`Employee Name: ${employeeName}`, 40, 110);
  doc.text(`Period: ${periodString}`, 40, 130);
  doc.text(`Generated: ${format(new Date(), 'PP pp')}`, 40, 150);

  // 3. Period Summary
  doc.setFont('helvetica', 'normal');
  doc.autoTable({
    startY: 170,
    head: [['Total KM', 'Total Expense', 'Expense Days', 'Avg KM/Day', 'Avg Expense/Day']],
    body: [[
      `${data.total_km.toFixed(2)} KM`,
      `INR ${data.total_amount.toFixed(2)}`,
      data.expense_days.toString(),
      data.expense_days > 0 ? `${(data.total_km / data.expense_days).toFixed(2)} KM` : '0 KM',
      data.expense_days > 0 ? `INR ${(data.total_amount / data.expense_days).toFixed(2)}` : 'INR 0',
    ]],
    theme: 'grid',
    headStyles: { fillColor: [40, 40, 40], textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { halign: 'center', fontSize: 10 },
  });

  // 4. Exceptions / Review
  let nextY = doc.lastAutoTable.finalY + 30;
  
  if (hasExceptions) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(211, 47, 47); // Red
    doc.text('EXCEPTIONS / REVIEW REQUIRED', 40, nextY);
    
    const exceptionRecords = data.records.filter(r => r.status === 'REVIEW_REQUIRED' || r.status === 'DISTANCE_UNAVAILABLE' || r.status === 'RATE_ALLOCATION_REQUIRES_REVIEW');
    
    doc.autoTable({
      startY: nextY + 10,
      head: [['Date', 'Recorded Reason / Status']],
      body: exceptionRecords.map(r => [
        format(parseISO(r.business_date), 'MMM d, yyyy'),
        r.status
      ]),
      theme: 'grid',
      headStyles: { fillColor: [211, 47, 47], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 10 }
    });
    
    nextY = doc.lastAutoTable.finalY + 30;
  }

  // 5. Daily Expense Breakdown
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(40, 40, 40);
  doc.text('Daily Expense Breakdown', 40, nextY);

  const sortedRecords = [...data.records].sort((a,b) => a.business_date.localeCompare(b.business_date));
  
  doc.autoTable({
    startY: nextY + 10,
    head: [['Date', 'GPS KM', 'Rate', 'Daily Exp.', 'Calc', 'Workflow']],
    body: sortedRecords.map(r => [
      format(parseISO(r.business_date), 'MMM d, yyyy'),
      r.total_distance_km != null ? `${Number(r.total_distance_km).toFixed(2)}` : '-',
      r.applicable_rate_per_km != null ? `INR ${Number(r.applicable_rate_per_km).toFixed(2)}` : '-',
      r.calculated_amount != null ? `INR ${Number(r.calculated_amount).toFixed(2)}` : '-',
      r.status,
      r.workflow_status || 'DRAFT'
    ]),
    theme: 'striped',
    headStyles: { fillColor: [59, 130, 246] }, // Blue header
    styles: { fontSize: 9 }
  });

  // 6. Approval Section (Static)
  nextY = doc.lastAutoTable.finalY + 50;
  
  // Check if we need a new page for signatures
  if (nextY > 700) {
    doc.addPage();
    nextY = 50;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  
  doc.text('Prepared By:', 40, nextY);
  doc.line(110, nextY, 250, nextY); // x1, y1, x2, y2
  
  doc.text('Reviewed By:', 300, nextY);
  doc.line(380, nextY, 520, nextY);

  doc.text('Approved By:', 40, nextY + 50);
  doc.line(110, nextY + 50, 250, nextY + 50);
  
  doc.text('Date:', 300, nextY + 50);
  doc.line(335, nextY + 50, 520, nextY + 50);

  // Return generated doc blob
  return doc.output('blob');
};
