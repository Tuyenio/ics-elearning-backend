import { Injectable } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import { Repository } from "typeorm"
import { SystemSetting } from "./entities/system-setting.entity"

@Injectable()
export class SystemSettingsService  {
  async updateMany(settings: Record<string, any>) {

  const entries = Object.entries(settings).map(([key, value]) => ({
    key,
    value: String(value),
  }));

  await this.repo.upsert(entries, ["key"]);
  this.cache = null;
  return this.getAll();
}
  private cache: Record<string, string> | null = null;

  constructor(
    @InjectRepository(SystemSetting)
    private readonly repo: Repository<SystemSetting>,
  ) {}

  async getAll(): Promise<Record<string, string>> {
    if (this.cache) return this.cache;

    const settings = await this.repo.find();

    this.cache = settings.reduce((acc, cur) => {
      acc[cur.key] = cur.value;
      return acc;
    }, {} as Record<string, string>);

    return this.cache;
  }

  async update(key: string, value: string) {
    await this.repo.upsert({ key, value }, ["key"]);

    // 🔥 QUAN TRỌNG: clear cache
    this.cache = null;

    return this.getAll();
  }
}

