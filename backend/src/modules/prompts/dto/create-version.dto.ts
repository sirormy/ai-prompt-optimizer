import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateVersionDto {
  @IsString()
  @IsNotEmpty()
  text: string; // 新版本的提示词文本

  @IsString()
  @IsOptional()
  changeDescription?: string; // 版本变更描述
}