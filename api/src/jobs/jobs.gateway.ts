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
import type { JobLogEvent, JobStatusEvent } from './entities/jobs.types';

/**
 * Socket.IO gateway for real-time job log streaming.
 *
 * Connection lifecycle
 *   1. Client connects → immediately gets a list of all job summaries
 *   2. Client subscribes to a job: emit `job:subscribe` with `{ jobId: string }`
 *      → joined into room `job:{jobId}`
 *      → immediately receives the full log buffer via `job:history`
 *   3. From then on, new log lines are pushed as `job:log` events
 *   4. Status changes are pushed as `job:status` events to all subscribers
 *   5. Client can unsubscribe: `job:unsubscribe` with `{ jobId: string }`
 *
 * Event reference
 *
 *   Client → Server
 *     job:subscribe    { jobId: string }
 *     job:unsubscribe  { jobId: string }
 *
 *   Server → Client
 *     jobs:list        JobSummary[]              (on connect)
 *     job:history      { jobId, lines: LogLine[] }   (on subscribe)
 *     job:log          JobLogEvent               (live, in room)
 *     job:status       JobStatusEvent            (live, in room + global)
 *     job:error        { message: string }
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

    this.jobsService.on('job:status', (event: JobStatusEvent) => {
      // Broadcast to subscribers of this job
      this.server.to(`job:${event.jobId}`).emit('job:status', event);
      // Also broadcast to all connected clients (for the jobs list to update)
      this.server.emit('job:status', event);
    });
  }

  afterInit(_server: Server): void {
    this.logger.log('Jobs WebSocket gateway initialised');
  }

  // ── Connection handling ────────────────────────────────────────────────────

  handleConnection(client: Socket): void {
    this.logger.debug(`Client connected: ${client.id}`);
    // Send current job summaries on connect so the UI can hydrate immediately
    client.emit('jobs:list', this.jobsService.list());
  }

  handleDisconnect(client: Socket): void {
    this.logger.debug(`Client disconnected: ${client.id}`);
  }

  // ── Message handlers ───────────────────────────────────────────────────────

  /**
   * Subscribe to a job room.
   * Immediately returns the full log history so the UI can render past output.
   */
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
  }

  /**
   * Unsubscribe from a job room.
   */
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