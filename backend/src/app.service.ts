import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'AI提示词优化工具后端服务正在运行！';
  }
}