import { DigestContent } from './digest-content.type';
import {
  formatMemberStandup,
  formatMissingNames,
  formatSummaryLine,
  truncate,
} from './digest-text.util';
import { WebhookPayload } from './webhook-payload.type';

const SECTION_TEXT_MAX = 3800;

export function formatTeamsPayload(content: DigestContent): WebhookPayload {
  const title = `Daily Standup — ${content.teamName}`;
  const summary = formatSummaryLine(content);

  const submittedText =
    content.submitted.length > 0
      ? content.submitted
          .map((m) => formatMemberStandup(m, 'plain'))
          .join('\n\n---\n\n')
      : 'No standups submitted.';

  const sections = [
    {
      activityTitle: title,
      activitySubtitle: `${content.digestDate} · ${content.timezone}`,
      facts: [
        { name: 'Submitted', value: String(content.summary.submitted) },
        { name: 'Missing', value: String(content.summary.missing) },
        { name: 'Late', value: String(content.summary.late) },
      ],
      text: truncate(submittedText, SECTION_TEXT_MAX),
    },
    {
      activityTitle: 'Missing members',
      text: truncate(formatMissingNames(content), SECTION_TEXT_MAX),
    },
  ];

  return {
    contentType: 'application/json',
    body: JSON.stringify({
      '@type': 'MessageCard',
      '@context': 'http://schema.org/extensions',
      themeColor: '8B5A2B',
      summary: `${title} — ${summary}`,
      sections,
    }),
  };
}
