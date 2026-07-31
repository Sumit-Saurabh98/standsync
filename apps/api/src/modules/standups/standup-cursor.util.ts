import { BadRequestException } from '@nestjs/common';

type StandupCursorPayload = {
  standupDate: string;
  id: string;
};

export function encodeStandupCursor(standupDate: Date, id: string): string {
  const payload: StandupCursorPayload = {
    standupDate: standupDate.toISOString().slice(0, 10),
    id,
  };
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

export function decodeStandupCursor(cursor: string): StandupCursorPayload {
  try {
    const raw = Buffer.from(cursor, 'base64url').toString('utf8');
    const parsed = JSON.parse(raw) as StandupCursorPayload;

    if (
      !parsed?.id ||
      !parsed?.standupDate ||
      !/^\d{4}-\d{2}-\d{2}$/.test(parsed.standupDate)
    ) {
      throw new Error('invalid');
    }

    return parsed;
  } catch {
    throw new BadRequestException({
      code: 'VALIDATION_FAILED',
      message: 'Invalid cursor.',
    });
  }
}

export function parseStandupDateYmd(ymd: string): Date {
  return new Date(`${ymd}T00:00:00.000Z`);
}
