import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UserDto {
  @ApiProperty({ description: '用户ID', example: '507f1f77bcf86cd799439011' })
  id: string;

  @ApiProperty({ description: '用户名', example: 'testuser' })
  username: string;

  @ApiProperty({ description: '邮箱地址', example: 'test@example.com' })
  email: string;

  @ApiPropertyOptional({ description: '头像URL', example: 'https://example.com/avatar.jpg' })
  avatar?: string;

  @ApiProperty({ description: '创建时间', example: '2024-01-01T00:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ description: '更新时间', example: '2024-01-01T00:00:00.000Z' })
  updatedAt: string;
}

export class UserPreferencesDto {
  @ApiProperty({ description: '主题设置', example: 'light', enum: ['light', 'dark'] })
  theme: string;

  @ApiProperty({ description: '语言设置', example: 'zh-CN' })
  language: string;

  @ApiPropertyOptional({ description: '时区设置', example: 'Asia/Shanghai' })
  timezone?: string;

  @ApiPropertyOptional({ description: '通知设置', example: true })
  notifications?: boolean;
}

export class LoginResponseDto {
  @ApiProperty({ description: 'JWT访问令牌', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  access_token: string;

  @ApiProperty({ description: '用户信息', type: UserDto })
  user: UserDto;
}

export class RegisterResponseDto {
  @ApiProperty({ description: '响应消息', example: '用户注册成功' })
  message: string;

  @ApiProperty({ description: '用户信息', type: UserDto })
  user: UserDto;
}

export class ProfileResponseDto {
  @ApiProperty({ description: '用户ID', example: '507f1f77bcf86cd799439011' })
  id: string;

  @ApiProperty({ description: '用户名', example: 'testuser' })
  username: string;

  @ApiProperty({ description: '邮箱地址', example: 'test@example.com' })
  email: string;

  @ApiPropertyOptional({ description: '头像URL', example: 'https://example.com/avatar.jpg' })
  avatar?: string;

  @ApiProperty({ description: '用户偏好设置', type: UserPreferencesDto })
  preferences: UserPreferencesDto;

  @ApiProperty({ description: '创建时间', example: '2024-01-01T00:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ description: '更新时间', example: '2024-01-01T00:00:00.000Z' })
  updatedAt: string;
}

export class ApiKeysResponseDto {
  @ApiPropertyOptional({ description: 'OpenAI API密钥（脱敏）', example: 'sk-***...***' })
  openaiApiKey?: string;

  @ApiPropertyOptional({ description: 'Anthropic API密钥（脱敏）', example: 'sk-ant-***...***' })
  anthropicApiKey?: string;

  @ApiPropertyOptional({ description: 'DeepSeek API密钥（脱敏）', example: 'sk-***...***' })
  deepseekApiKey?: string;

  @ApiProperty({ description: '最后更新时间', example: '2024-01-01T00:00:00.000Z' })
  updatedAt: string;
}

export class UpdateResponseDto {
  @ApiProperty({ description: '响应消息', example: '更新成功' })
  message: string;

  @ApiPropertyOptional({ description: '更新的数据' })
  data?: any;
}