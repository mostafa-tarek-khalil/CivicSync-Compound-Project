import { FullCompoundReport } from '../../Services/admin-service';

function csvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  const text = String(value);

  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function csvRows(rows: unknown[][]): string {
  return rows.map(row => row.map(csvCell).join(',')).join('\r\n');
}


function unitLabel(unit: unknown): string {
  if (!unit) return '';
  if (typeof unit === 'string') return unit;

  const value = unit as { unitNumber?: number; floor?: number };

  if (value.unitNumber == null) return '';

  return value.floor == null
    ? `Unit ${value.unitNumber}`
    : `Unit ${value.unitNumber} (Floor ${value.floor})`;
}

function personLabel(person: unknown): string {
  if (!person) return '';
  if (typeof person === 'string') return person;

  return (person as { name?: string }).name || '';
}


export function buildCompoundReportCsv(report: FullCompoundReport): string {
  const sections: string[] = [];


  sections.push('CIVICSYNC — FULL COMPOUND REPORT');
  sections.push(csvRows([['Generated at', report.generatedAt]]));
  sections.push('');

  const overview = report.overview;

  sections.push('OVERVIEW');
  sections.push(
    csvRows([
      ['Metric', 'Value'],
      ['Total users', overview.users.total],
      ['Pending users', overview.users.pending],
      ['Active residents', overview.users.activeResidents],
      ['Active technicians', overview.users.activeTechnicians],
      ['Active security', overview.users.activeSecurity],
      ['Total buildings', overview.buildings.total],
      ['Total units', overview.units.total],
      ['Occupied units', overview.units.occupied],
      ['Vacant units', overview.units.vacant],
      ['Open maintenance', overview.maintenance.open],
      ['Overdue invoices', overview.invoices.overdue],
      ['Total visits', overview.visits.total],
    ])
  );
  sections.push('');


  const revenue = report.analytics.revenue;

  sections.push('REVENUE');
  sections.push(
    csvRows([
      ['Metric', 'Amount'],
      ['Total billed', revenue.totalBilled],
      ['Paid', revenue.paid],
      ['Outstanding', revenue.outstanding],
      ['Overdue', revenue.overdue],
    ])
  );
  sections.push('');


  sections.push('USER DIRECTORY');
  sections.push(
    csvRows([
      ['Name', 'Email', 'Phone', 'Role', 'Status', 'Unit'],
      ...report.users.map(user => [
        user.name,
        user.email,
        user.phone || '',
        user.role,
        user.status,
        unitLabel(user.unitId),
      ]),
    ])
  );
  sections.push('');


  sections.push('BUILDINGS');
  sections.push(
    csvRows([
      ['Name', 'Number', 'Floors', 'Units'],
      ...report.buildings.map(building => [
        building.name,
        building.buildingNumber,
        building.floorsCount ?? building.floors ?? '',
        building.unitsCount ?? '',
      ]),
    ])
  );
  sections.push('');


  sections.push('UNITS');
  sections.push(
    csvRows([
      ['Building', 'Unit', 'Floor', 'Type', 'Status'],
      ...report.units.map(unit => [
        typeof unit.buildingId === 'object' && unit.buildingId
          ? (unit.buildingId as { name: string }).name
          : '',
        unit.unitNumber,
        unit.floor,
        unit.type,
        unit.status,
      ]),
    ])
  );
  sections.push('');


  sections.push('MAINTENANCE');
  sections.push(
    csvRows([
      ['Title', 'Category', 'Priority', 'Status', 'Resident', 'Technician', 'Created'],
      ...report.maintenance.map(ticket => [
        ticket.title,
        ticket.category,
        ticket.priority,
        ticket.status,
        personLabel(ticket.residentId),
        personLabel(ticket.assignedTo),
        ticket.createdAt,
      ]),
    ])
  );
  sections.push('');


  sections.push('INVOICES');
  sections.push(
    csvRows([
      ['Resident', 'Amount', 'Status', 'Due date', 'Paid at', 'Created'],
      ...report.invoices.map(invoice => [
        personLabel(invoice.residentId),
        invoice.amount,
        invoice.status,
        invoice.dueDate,
        invoice.paidAt || '',
        invoice.createdAt,
      ]),
    ])
  );
  sections.push('');


  sections.push('VISIT LOGS');
  sections.push(
    csvRows([
      ['Visitor', 'Email', 'Status', 'Source', 'Visit date', 'Start time', 'Resident'],
      ...report.visits.map(visit => [
        visit.visitorName,
        visit.visitorEmail,
        visit.status,
        visit.source,
        visit.visitDate,
        visit.visitStartTime,
        personLabel(visit.residentId),
      ]),
    ])
  );

  return sections.join('\r\n');
}


export function downloadTextFile(
  filename: string,
  content: string,
  mimeType = 'text/csv;charset=utf-8'
): void {

  const blob = new Blob(['\uFEFF' + content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';

  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  URL.revokeObjectURL(url);
}


export function reportFilename(extension: string): string {
  const stamp = new Date().toISOString().slice(0, 10);
  return `civicsync-compound-report-${stamp}.${extension}`;
}