import { Controller, Get } from '@nestjs/common';

@Controller('api/health')
export class HealthController {
  @Get()
  check() {
    return {
      ok: true as const,
      service: 'sujia-server',
      time: new Date().toISOString(),
    };
  }
}
