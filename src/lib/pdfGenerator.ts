import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AttendanceRecord, CheckinSession } from '@/types';

export function generateSessionAttendancePDF(
  session: CheckinSession,
  records: AttendanceRecord[]
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Institutional Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42); // #0F172A
  doc.text('UNIVERSITY COLLEGE OF RATMALANA', 105, 16, { align: 'center' });

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Division of Television Studies — Batch 11 (2026 Intake)', 105, 22, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(0, 136, 255); // Electric blue
  doc.text('OFFICIAL ATTENDANCE ROLL-CALL RECORD', 105, 29, { align: 'center' });

  // Session metadata box
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 34, 182, 22, 2, 2, 'FD');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`Subject: ${session.moduleTitle} (${session.moduleCode})`, 18, 40);
  doc.text(`Date: ${session.date} | Time: ${session.startTime} – ${session.endTime}`, 18, 46);
  doc.text(`Course Scope: ${session.course === 'ALL' ? 'Common (Both TPOPT & TPRPT)' : session.course}`, 18, 52);

  const presentCount = records.filter((r) => r.status === 'present').length;
  const absentCount = records.filter((r) => r.status === 'absent').length;
  const excusedCount = records.filter((r) => r.status === 'excused').length;
  const denom = presentCount + absentCount;
  const pctLabel = denom > 0 ? `${Math.round((presentCount / denom) * 100)}%` : 'N/A';

  doc.text(`Present: ${presentCount} | Absent: ${absentCount} | Excused: ${excusedCount} | Rate: ${pctLabel}`, 124, 46);

  // Table
  const tableData = records.map((r, idx) => [
    idx + 1,
    r.studentNumber,
    r.studentName,
    r.course,
    r.status.toUpperCase(),
    r.submissionSource === 'self_checkin' ? 'Terminal Check-In' : 'Manual / Admin',
    r.excuseReason || '—',
  ]);

  autoTable(doc, {
    startY: 60,
    head: [['#', 'Index No', 'Student Name', 'Course', 'Status', 'Method', 'Remarks']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [0, 85, 204],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'left',
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 32 },
      2: { cellWidth: 55 },
      3: { cellWidth: 18 },
      4: { cellWidth: 20 },
      5: { cellWidth: 25 },
      6: { cellWidth: 22 },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 4) {
        const val = data.cell.raw;
        if (val === 'PRESENT') {
          data.cell.styles.textColor = [16, 185, 129];
          data.cell.styles.fontStyle = 'bold';
        } else if (val === 'ABSENT') {
          data.cell.styles.textColor = [239, 68, 68];
          data.cell.styles.fontStyle = 'bold';
        } else if (val === 'EXCUSED') {
          data.cell.styles.textColor = [245, 158, 11];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
  });

  return doc;
}

