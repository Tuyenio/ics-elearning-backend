import { Body, Controller, Get, Put } from "@nestjs/common";
import { SystemSettingsService } from "./system-setting.service";

@Controller("system-settings")
export class SystemSettingsController {
  constructor(private service: SystemSettingsService) {}

  @Get()
  getAll() {
    return this.service.getAll()
  }

  @Put()
  updateMany(@Body() body: Record<string, string>) {
  return this.service.updateMany(body);
}

}
