import { Controller, Post, Body, UseGuards, Request, Get, Put } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { UpdateApiKeysDto } from './dto/update-api-keys.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import {
  LoginResponseDto,
  RegisterResponseDto,
  ProfileResponseDto,
  ApiKeysResponseDto,
  UpdateResponseDto
} from './dto/auth-response.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ 
    summary: '用户注册',
    description: '创建新用户账户'
  })
  @ApiBody({ type: RegisterDto })
  @ApiCreatedResponse({ 
    description: '注册成功',
    type: RegisterResponseDto
  })
  @ApiBadRequestResponse({ description: '注册信息无效或用户已存在' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @ApiOperation({ 
    summary: '用户登录',
    description: '用户身份验证并获取访问令牌'
  })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({ 
    description: '登录成功',
    type: LoginResponseDto
  })
  @ApiUnauthorizedResponse({ description: '用户名或密码错误' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: '获取用户资料',
    description: '获取当前登录用户的详细信息'
  })
  @ApiOkResponse({ 
    description: '获取成功',
    type: ProfileResponseDto
  })
  @ApiUnauthorizedResponse({ description: '未授权访问' })
  async getProfile(@Request() req) {
    return this.authService.getProfile(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Put('preferences')
  async updatePreferences(@Request() req, @Body() updatePreferencesDto: UpdatePreferencesDto) {
    return this.authService.updatePreferences(req.user.id, updatePreferencesDto);
  }

  @UseGuards(JwtAuthGuard)
  @Put('api-keys')
  async updateApiKeys(@Request() req, @Body() updateApiKeysDto: UpdateApiKeysDto) {
    return this.authService.updateApiKeys(req.user.id, updateApiKeysDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('api-keys')
  async getApiKeys(@Request() req) {
    return this.authService.getApiKeys(req.user.id);
  }
}