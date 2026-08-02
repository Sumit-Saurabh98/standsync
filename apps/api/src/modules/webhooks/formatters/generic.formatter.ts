import { DigestContent } from './digest-content.type';
import { WebhookPayload } from './webhook-payload.type';

export function formatGenericPayload(content: DigestContent): WebhookPayload {
  return {
    contentType: 'application/json',
    body: JSON.stringify({
      type: 'standsync.daily_digest',
      team: content.teamName,
      date: content.digestDate,
      summary: content.summary,
      submitted: content.submitted,
      missing: content.missing,
    }),
  };
}
