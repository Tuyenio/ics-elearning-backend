import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    @InjectDataSource() private dataSource: DataSource,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  async healthCheck() {
    const startTime = Date.now();
    let dbStatus = 'down';
    let dbResponseTime = 0;

    try {
      const dbStartTime = Date.now();
      await this.dataSource.query('SELECT 1');
      dbResponseTime = Date.now() - dbStartTime;
      dbStatus = 'up';
    } catch (error) {
      dbStatus = 'down';
    }

    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();

    return {
      status: dbStatus === 'up' ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(uptime),
      responseTime: Date.now() - startTime,
      services: {
        database: {
          status: dbStatus,
          responseTime: dbResponseTime,
        },
        api: {
          status: 'up',
        },
      },
      memory: {
        rss: Math.round(memoryUsage.rss / 1024 / 1024),
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        external: Math.round(memoryUsage.external / 1024 / 1024),
      },
      environment: process.env.NODE_ENV || 'development',
    };
  }
}
