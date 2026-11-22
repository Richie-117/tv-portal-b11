import ExcelJS from 'exceljs';
import { AttendanceRecord, CheckinSession } from '@/types';

export async function generateSessionAttendanceExcel(
  session: CheckinSession,
  records: AttendanceRecord[]
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'TV B11 Academic Portal';
  workbook.lastModifiedBy = 'Television Studies Admin';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Session Attendance');

  // Title Block
  worksheet.mergeCells('A1:F1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = 'UNIVERSITY COLLEGE OF RATMALANA — DIVISION OF TELEVISION STUDIES';
  titleCell.font = { name: 'Calibri', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF004DB3' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(1).height = 26;

  worksheet.mergeCells('A2:F2');
  const subCell = worksheet.getCell('A2');
  subCell.value = `Official Attendance Record — ${session.moduleTitle} (${session.moduleCode}) | Date: ${session.date} (${session.startTime} - ${session.endTime})`;
  subCell.font = { name: 'Calibri', size: 10, italic: true };
  subCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(2).height = 20;

  // Header row
  const headers = ['#', 'Index Number', 'Student Name', 'Course', 'Status', 'Method', 'Remarks'];
  const headerRow = worksheet.addRow(headers);
  headerRow.height = 22;
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  // Data rows
  records.forEach((r, idx) => {
    const row = worksheet.addRow([
      idx + 1,
      r.studentNumber,
      r.studentName,
      r.course,
      r.status.toUpperCase(),
      r.submissionSource === 'self_checkin' ? 'Terminal Check-In' : 'Manual / Admin',
      r.excuseReason || '',
    ]);

    const statusCell = row.getCell(5);
    if (r.status === 'present') {
      statusCell.font = { bold: true, color: { argb: 'FF10B981' } };
    } else if (r.status === 'absent') {
      statusCell.font = { bold: true, color: { argb: 'FFEF4444' } };
    } else if (r.status === 'excused') {
      statusCell.font = { bold: true, color: { argb: 'FFF59E0B' } };
    }
  });

  // Auto-fit column widths
  worksheet.columns = [
    { width: 6 },
    { width: 22 },
    { width: 35 },
    { width: 12 },
    { width: 14 },
    { width: 20 },
    { width: 25 },
  ];

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
