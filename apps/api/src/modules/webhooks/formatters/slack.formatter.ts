import { DigestContent } from './digest-content.type';
import {
  formatMemberStandup,
  formatMissingNames,
  formatSummaryLine,
  truncate,
} from './digest-text.util';
import { WebhookPayload } from './webhook-payload.type';

const TEXT_BLOCK_MAX = 2900;

export function formatSlackPayload(content: DigestContent): WebhookPayload {
  const title = `Daily Standup — ${content.teamName}`;
  const subtitle = `${content.digestDate} (${content.timezone})`;

  const blocks: object[] = [
    {
      type: 'header',
      text: { type: 'plain_text', text: title, emoji: true },
    },
    {
      type: 'context',
      elements: [{ type: 'mrkdwn', text: subtitle }],
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: truncate(formatSummaryLine(content), TEXT_BLOCK_MAX),
      },
    },
    { type: 'divider' },
  ];

  if (content.submitted.length > 0) {
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: '*Submitted*' },
    });

    for (const member of content.submitted) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: truncate(formatMemberStandup(member, 'slack'), TEXT_BLOCK_MAX),
        },
      });
    }
  }

  blocks.push({ type: 'divider' });
  blocks.push({
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: truncate(
        `*Missing*\n${formatMissingNames(content)}`,
        TEXT_BLOCK_MAX,
      ),
    },
  });

  return {
    contentType: 'application/json',
    body: JSON.stringify({
      text: `${title} — ${content.digestDate}`,
      blocks,
    }),
  };
}
