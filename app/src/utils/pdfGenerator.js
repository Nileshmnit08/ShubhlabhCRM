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

export const generateFieldActivityPDF = (user, periodString, summary, sessions) => {
  const doc = new jsPDF('l', 'pt', 'a4'); // Landscape for wide tables
  
  // 1. Report Header
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('Shubh Labh', 40, 50);
  
  doc.setFontSize(16);
  doc.setTextColor(100, 100, 100);
  doc.text('Field Activity Report', 40, 75);

  doc.setFontSize(12);
  doc.setTextColor(40, 40, 40);
  doc.text(`Staff Name: ${user.name || 'Unknown'}`, 40, 110);
  doc.text(`Period: ${periodString}`, 40, 130);
  doc.text(`Generated: ${format(new Date(), 'PP pp')}`, 40, 150);

  // 2. Summary
  doc.setFont('helvetica', 'normal');
  doc.autoTable({
    startY: 170,
    head: [['Sessions', 'Completed Visits', 'Verified Travel KM', 'Total Travel Expenses']],
    body: [[
      summary.sessions.toString(),
      summary.visits.toString(),
      `${summary.km} KM`,
      `INR ${summary.expenseTotal.toLocaleString('en-IN', {minimumFractionDigits: 2})}`
    ]],
    theme: 'grid',
    headStyles: { fillColor: [40, 40, 40], textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { halign: 'center', fontSize: 10 },
  });

  // 3. Detailed Sessions and Visits
  let nextY = doc.lastAutoTable.finalY + 30;

  if (sessions && sessions.length > 0) {
    sessions.forEach((session, sIdx) => {
      // Check page break
      if (nextY > 450) {
        doc.addPage();
        nextY = 50;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(59, 130, 246); // Blue
      const sStart = session.startEvent?.event_time ? format(parseISO(session.startEvent.event_time), 'MMM d, yyyy h:mm a') : 'Unknown';
      const sEnd = session.endEvent?.event_time ? format(parseISO(session.endEvent.event_time), 'h:mm a') : 'Ongoing';
      doc.text(`Session ${sIdx + 1}: ${sStart} - ${sEnd}`, 40, nextY);
      
      const visitRows = [];
      session.events.filter(e => e.event_type === 'VISIT').forEach(v => {
        const checkIn = v.started_at ? format(parseISO(v.started_at), 'h:mm a') : '-';
        const checkOut = v.ended_at ? format(parseISO(v.ended_at), 'h:mm a') : '-';
        let duration = '-';
        if (v.started_at && v.ended_at) {
          const diffMins = Math.round((new Date(v.ended_at) - new Date(v.started_at)) / 60000);
          duration = `${diffMins}m`;
        }

        const outcomes = v.outcomes ? Object.entries(v.outcomes).filter(([_, val]) => val).map(([k]) => k).join(', ') : '-';
        const notes = v.notes ? v.notes.substring(0, 50) + (v.notes.length > 50 ? '...' : '') : '-';

        visitRows.push([
          format(parseISO(v.event_time), 'MMM d'),
          v.description.replace('Customer Visit: ', ''),
          `${checkIn} - ${checkOut}`,
          duration,
          v.legKm ? `${v.legKm} KM` : '-',
          v.cumulativeKm ? `${v.cumulativeKm} KM` : '-',
          outcomes,
          notes
        ]);
      });

      if (visitRows.length > 0) {
        doc.autoTable({
          startY: nextY + 10,
          head: [['Date', 'Customer/Location', 'Check In/Out', 'Duration', 'Leg KM', 'Cum. KM', 'Outcomes', 'Notes']],
          body: visitRows,
          theme: 'striped',
          headStyles: { fillColor: [70, 70, 70] },
          styles: { fontSize: 9, cellPadding: 4 },
          columnStyles: { 
            1: { cellWidth: 150 }, 
            7: { cellWidth: 150 } 
          }
        });
        nextY = doc.lastAutoTable.finalY + 30;
      } else {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(10);
        doc.setTextColor(150, 150, 150);
        doc.text('No visits recorded in this session.', 40, nextY + 15);
        nextY += 35;
      }
    });
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text('No activity records found for the selected period.', 40, nextY);
  }

  // Footer with Page Numbers
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width - 80, doc.internal.pageSize.height - 20);
  }

  return doc.output('blob');
};
