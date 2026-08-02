type StandupRow = {
  standupDate: Date;
  yesterday: string;
  today: string;
  blockers: string | null;
  isLate: boolean;
  submittedAt: Date;
  user: { name: string; email: string };
};

function escapeCsv(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function buildStandupsCsv(rows: StandupRow[]): string {
  const header = [
    'date',
    'member_name',
    'member_email',
    'yesterday',
    'today',
    'blockers',
    'is_late',
    'submitted_at',
  ].join(',');

  const lines = rows.map((row) =>
    [
      row.standupDate.toISOString().slice(0, 10),
      escapeCsv(row.user.name),
      escapeCsv(row.user.email),
      escapeCsv(row.yesterday),
      escapeCsv(row.today),
      escapeCsv(row.blockers ?? ''),
      row.isLate ? 'true' : 'false',
      row.submittedAt.toISOString(),
    ].join(','),
  );

  return [header, ...lines].join('\n');
}
