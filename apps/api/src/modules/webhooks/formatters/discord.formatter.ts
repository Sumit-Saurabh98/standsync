import { DigestContent } from './digest-content.type';
import {
  formatMemberStandup,
  formatMissingNames,
  formatSummaryLine,
  truncate,
} from './digest-text.util';
import { WebhookPayload } from './webhook-payload.type';

const FIELD_VALUE_MAX = 1000;

export function formatDiscordPayload(content: DigestContent): WebhookPayload {
  const title = `Daily Standup — ${content.teamName}`;

  const fields: Array<{ name: string; value: string }> = [];

  if (content.submitted.length > 0) {
    for (const member of content.submitted) {
      fields.push({
        name: `${member.name}${member.isLate ? ' (late)' : ''}`,
        value: truncate(formatMemberStandup(member, 'plain'), FIELD_VALUE_MAX),
      });
    }
  } else {
    fields.push({ name: 'Submitted', value: '_No standups submitted._' });
  }

  fields.push({
    name: 'Missing',
    value: truncate(formatMissingNames(content), FIELD_VALUE_MAX),
  });

  return {
    contentType: 'application/json',
    body: JSON.stringify({
      content: `${title} — ${content.digestDate}`,
      embeds: [
        {
          title,
          description: `${content.digestDate} (${content.timezone})`,
          color: 0x8b5a2b,
          fields: fields.slice(0, 25),
          footer: { text: formatSummaryLine(content) },
        },
      ],
    }),
  };
}
