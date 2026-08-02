import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { DeliveryStatus, DigestStatus } from '../../generated/prisma/client';
import { QUEUES } from '../../queues/queue.constants';
import { PrismaService } from '../../prisma/prisma.service';
import { DigestContent } from './formatters/digest-content.type';
import { formatPayload } from './formatters/format-payload';
import { formatReminderPayload } from './formatters/format-reminder-payload';
import { ReminderContent } from '../reminders/reminder.types';

const MAX_ATTEMPTS = 5;

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUES.WEBHOOKS) private readonly webhooksQueue: Queue,
  ) {}

  async enqueueDelivery(deliveryId: string): Promise<void> {
    await this.webhooksQueue.add('deliver', { deliveryId });
    this.logger.warn(`[webhook] ENQUEUED delivery ${deliveryId}`);
  }

  async deliver(deliveryId: string): Promise<void> {
    const delivery = await this.prisma.webhookDelivery.findUnique({
      where: { id: deliveryId },
      include: {
        digest: true,
        team: { include: { config: true } },
      },
    });

    if (!delivery || delivery.status !== DeliveryStatus.PENDING) {
      return;
    }

    const url = delivery.team.config?.webhookUrl;
    if (!url) {
      await this.markFailed(deliveryId, 'No webhook URL configured');
      return;
    }

    let body: string;
    let contentType: string;

    if (delivery.digest?.content) {
      const content = delivery.digest.content as unknown as DigestContent;
      ({ body, contentType } = formatPayload(delivery.platform, content));
    } else if (delivery.payload) {
      const content = delivery.payload as unknown as ReminderContent;
      ({ body, contentType } = formatReminderPayload(
        delivery.platform,
        content,
      ));
    } else {
      await this.markFailed(deliveryId, 'Delivery payload missing');
      return;
    }

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': contentType },
        body,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(
          `HTTP ${res.status}${text ? `: ${text.slice(0, 200)}` : ''}`,
        );
      }

      const updates: [
        ReturnType<typeof this.prisma.webhookDelivery.update>,
        ...ReturnType<typeof this.prisma.digest.update>[],
      ] = [
        this.prisma.webhookDelivery.update({
          where: { id: deliveryId },
          data: {
            status: DeliveryStatus.SUCCESS,
            deliveredAt: new Date(),
            attempts: { increment: 1 },
            lastError: null,
          },
        }),
      ];

      if (delivery.digestId) {
        updates.push(
          this.prisma.digest.update({
            where: { id: delivery.digestId },
            data: { status: DigestStatus.SENT },
          }),
        );
      }

      await this.prisma.$transaction(updates);

      this.logger.warn(`[webhook] SUCCESS delivery ${deliveryId} → ${url}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      const attempts = delivery.attempts + 1;

      await this.prisma.webhookDelivery.update({
        where: { id: deliveryId },
        data: {
          attempts,
          lastError: message.slice(0, 500),
          ...(attempts >= MAX_ATTEMPTS
            ? { status: DeliveryStatus.FAILED }
            : {}),
        },
      });

      this.logger.warn(
        `[webhook] FAILED delivery ${deliveryId} (attempt ${attempts}/${MAX_ATTEMPTS}): ${message}`,
      );

      if (attempts < MAX_ATTEMPTS) {
        throw err;
      }
    }
  }

  private async markFailed(deliveryId: string, reason: string): Promise<void> {
    await this.prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: {
        status: DeliveryStatus.FAILED,
        lastError: reason,
        attempts: { increment: 1 },
      },
    });
    this.logger.warn(`[webhook] FAILED delivery ${deliveryId}: ${reason}`);
  }
}
