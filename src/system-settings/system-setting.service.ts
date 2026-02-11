import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemSetting } from './entities/system-setting.entity';

@Injectable()
export class SystemSettingsService {
  async updateMany(settings: Record<string, any>) {
    const entries = Object.entries(settings).map(([key, value]) => ({
      key,
      value: String(value),
    }));

    await this.repo.upsert(entries, ['key']);
    this.cache = null;
    return this.getAll();
  }
  private cache: Record<string, any> | null = null;

  constructor(
    @InjectRepository(SystemSetting)
    private readonly repo: Repository<SystemSetting>,
  ) {}

  private parseValue(value: string | null): any {
    if (value === null || value === undefined) return null;

    const trimmed = String(value).trim();
    if (trimmed.toLowerCase() === 'true') return true;
    if (trimmed.toLowerCase() === 'false') return false;

    const looksLikeJson =
      (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']'));

    if (looksLikeJson) {
      try {
        return JSON.parse(trimmed);
      } catch {
        return value;
      }
    }

    return value;
  }

  async getAll(): Promise<Record<string, any>> {
    if (this.cache) return this.cache;

    const settings = await this.repo.find();

    this.cache = settings.reduce(
      (acc, cur) => {
        acc[cur.key] = this.parseValue(cur.value);
        return acc;
      },
      {} as Record<string, any>,
    );

    return this.cache;
  }

  async isMaintenanceMode(): Promise<boolean> {
    const settings = await this.getAll();
    return Boolean(settings.maintenanceMode);
  }

  async update(key: string, value: string) {
    await this.repo.upsert({ key, value }, ['key']);

    // 🔥 QUAN TRỌNG: clear cache
    this.cache = null;

    return this.getAll();
  }
}
