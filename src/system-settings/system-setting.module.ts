import { Module } from '@nestjs/common';
import { SystemSettingsController } from './system-setting.controller';
import { SystemSettingsService } from './system-setting.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SystemSetting } from './entities/system-setting.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([SystemSetting]), // 🔥 CỰC KỲ QUAN TRỌNG
  ],
  controllers: [SystemSettingsController],
  providers: [SystemSettingsService],
  exports: [SystemSettingsService],
})
export class SystemSettingsModule {}
