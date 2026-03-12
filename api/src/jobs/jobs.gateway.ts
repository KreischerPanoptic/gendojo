import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger, OnModuleInit } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

import { JobsService } from './jobs.service';
import type { JobLogEvent, JobStatusEvent, JobProgressEvent } from './events/jobs.events';

/**
 * Socket.IO gateway for real-time job log streaming.
 *
 * Connection lifecycle
 * 1. Client connects → immediately gets a list of all job summaries
 * 2. Client subscribes to a job: emit `job:subscribe` with `{ jobId: string }`
 * → joined into room `job:{jobId}`
 * → immediately receives the full log buffer via `job:history`
 * 3. From then on, new log lines are pushed as `job:log` events
 * 4. Progress updates from tqdm are pushed as `job:progress` events
 * 5. Status changes are pushed as `job:status` events to all subscribers
 * 6. Client can unsubscribe: `job:unsubscribe` with `{ jobId: string }`
 */
@WebSocketGateway({
  cors: { origin: '*' }, // tightened in production via NestJS CORS middleware
  namespace: '/jobs',
})
export class JobsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, OnModuleInit
{
  @WebSocketServer()
  private server!: Server;

  private readonly logger = new Logger(JobsGateway.name);

  constructor(private readonly jobsService: JobsService) {}

  // ── NestJS lifecycle ───────────────────────────────────────────────────────

  onModuleInit(): void {
    // Subscribe to JobsService EventEmitter events and broadcast to rooms

    this.jobsService.on('job:log', (event: JobLogEvent) => {
      this.server.to(`job:${event.jobId}`).emit('job:log', event);
    });

    // 🚀 NEW: Broadcast high-frequency progress updates to subscribers
    this.jobsService.on('job:progress', (event: JobProgressEvent) => {
      this.server.to(`job:${event.jobId}`).emit('job:progress', event);
    });

    this.jobsService.on('job:status', (event: JobStatusEvent) => {
      // Broadcast to subscribers of this job
      this.server.to(`job:${event.jobId}`).emit('job:status', event);
      // Also broadcast to all connected clients (for the global jobs list to update)
      this.server.emit('job:status', event);
    });
  }

  afterInit(_server: Server): void {
    this.logger.log('Jobs WebSocket gateway initialised');
  }

  // ── Connection handling ────────────────────────────────────────────────────

  // 🚀 FIXED: Made async because jobsService.list() now queries SQLite
  async handleConnection(client: Socket): Promise<void> {
    this.logger.debug(`Client connected: ${client.id}`);
    
    try {
      const summaries = await this.jobsService.list();
      client.emit('jobs:list', summaries);
    } catch (err) {
      this.logger.error(`Failed to fetch job list for client ${client.id}`, err);
    }
  }

  handleDisconnect(client: Socket): void {
    this.logger.debug(`Client disconnected: ${client.id}`);
  }

  // ── Message handlers ───────────────────────────────────────────────────────

  @SubscribeMessage('job:subscribe')
  handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { jobId: string },
  ): void {
    const { jobId } = payload;

    if (!jobId || typeof jobId !== 'string') {
      client.emit('job:error', { message: 'job:subscribe requires a jobId string' });
      return;
    }

    const logs = this.jobsService.getLogs(jobId);
    if (!logs) {
      client.emit('job:error', { message: `Job not found: ${jobId}` });
      return;
    }

    void client.join(`job:${jobId}`);
    this.logger.debug(`Client ${client.id} subscribed to job:${jobId}`);

    // Replay full history so the client can render from the start
    client.emit('job:history', { jobId, lines: logs });
    
    // Note: We don't need to manually emit the current progress here.
    // sd-scripts emits tqdm updates so frequently (multiple times a second)
    // that the client will receive a fresh 'job:progress' event almost instantly.
  }

  @SubscribeMessage('job:unsubscribe')
  handleUnsubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { jobId: string },
  ): void {
    const { jobId } = payload;
    void client.leave(`job:${jobId}`);
    this.logger.debug(`Client ${client.id} unsubscribed from job:${jobId}`);
  }
}