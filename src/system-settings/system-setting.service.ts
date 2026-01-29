import { Injectable } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import { Repository } from "typeorm"
import { SystemSetting } from "./entities/system-setting.entity"

@Injectable()
export class SystemSettingsService {
  constructor(
    @InjectRepository(SystemSetting)
    private readonly repo: Repository<SystemSetting>,
  ) {}

  /**
   * Lấy toàn bộ system settings
   * Trả về dạng object: { key: value }
   */
  async getAll(): Promise<Record<string, string>> {
    const settings = await this.repo.find()

    return settings.reduce((acc, cur) => {
      acc[cur.key] = cur.value
      return acc
    }, {} as Record<string, string>)
  }

  /**
   * Cập nhật / tạo mới 1 setting
   */
  async update(key: string, value: string): Promise<Record<string, string>> {
    await this.repo.upsert(
      { key, value },
      { conflictPaths: ["key"] },
    )

    return this.getAll()
  }

  /**
   * (OPTIONAL) Lấy 1 setting theo key
   */
  async getByKey(key: string): Promise<string | null> {
    const setting = await this.repo.findOne({ where: { key } })
    return setting?.value ?? null
  }
}
