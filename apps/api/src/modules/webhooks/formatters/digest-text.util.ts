import { DigestContent } from './digest-content.type';

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

export function formatSummaryLine(content: DigestContent): string {
  const { submitted, missing, late } = content.summary;
  return `Submitted: ${submitted} · Missing: ${missing} · Late: ${late}`;
}

export function formatMissingNames(content: DigestContent): string {
  if (content.missing.length === 0) return 'Everyone submitted.';
  return content.missing.map((m) => m.name).join(', ');
}

export function formatMemberStandup(
  member: DigestContent['submitted'][number],
  style: 'slack' | 'plain',
): string {
  const lateTag = member.isLate
    ? style === 'slack'
      ? ' _(late)_'
      : ' (late)'
    : '';
  const blockerLine = member.blockers
    ? style === 'slack'
      ? `\n*Blockers:* ${member.blockers}`
      : `\nBlockers: ${member.blockers}`
    : '';

  if (style === 'slack') {
    return `*${member.name}*${lateTag}\n• *Yesterday:* ${member.yesterday}\n• *Today:* ${member.today}${blockerLine}`;
  }

  return `${member.name}${lateTag}\nYesterday: ${member.yesterday}\nToday: ${member.today}${blockerLine}`;
}
