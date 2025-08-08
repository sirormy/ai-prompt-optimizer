import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from '../../schemas/user.schema';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { UpdateApiKeysDto } from './dto/update-api-keys.dto';
import { CryptoService } from '../../common/services/crypto.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private jwtService: JwtService,
    private cryptoService: CryptoService,
  ) {}

  async register(registerDto: RegisterDto) {
    this.logger.log(`Registering new user: ${registerDto.email}`);

    // Check if user already exists
    const existingUser = await this.userModel.findOne({
      email: registerDto.email,
    });
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(registerDto.password, saltRounds);

    // Create user
    const user = new this.userModel({
      email: registerDto.email,
      password: hashedPassword,
      preferences: {
        defaultModel: 'openai-gpt4',
        optimizationLevel: 'basic',
        autoSave: true,
      },
      usage: {
        totalOptimizations: 0,
        monthlyUsage: 0,
        lastUsed: new Date(),
      },
    });

    await user.save();

    // Generate JWT token
    const payload = { email: user.email, sub: user._id };
    const token = this.jwtService.sign(payload);

    return {
      access_token: token,
      user: {
        id: user._id,
        email: user.email,
        preferences: user.preferences,
      },
    };
  }

  async login(loginDto: LoginDto) {
    this.logger.log(`Login attempt for user: ${loginDto.email}`);

    // Find user
    const user = await this.userModel.findOne({ email: loginDto.email });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last used
    user.usage.lastUsed = new Date();
    await user.save();

    // Generate JWT token
    const payload = { email: user.email, sub: user._id };
    const token = this.jwtService.sign(payload);

    return {
      access_token: token,
      user: {
        id: user._id,
        email: user.email,
        preferences: user.preferences,
      },
    };
  }

  async getProfile(userId: string) {
    this.logger.log(`Fetching profile for user: ${userId}`);

    const user = await this.userModel.findById(userId).select('-password');
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: user._id,
      email: user.email,
      preferences: user.preferences,
      usage: user.usage,
    };
  }

  async validateUser(payload: any): Promise<any> {
    const user = await this.userModel.findById(payload.sub).select('-password');
    if (!user) {
      return null;
    }
    return { id: user._id, email: user.email };
  }

  async updatePreferences(userId: string, updatePreferencesDto: UpdatePreferencesDto) {
    this.logger.log(`Updating preferences for user: ${userId}`);

    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Update preferences
    if (updatePreferencesDto.defaultModel !== undefined) {
      user.preferences.defaultModel = updatePreferencesDto.defaultModel;
    }
    if (updatePreferencesDto.optimizationLevel !== undefined) {
      user.preferences.optimizationLevel = updatePreferencesDto.optimizationLevel;
    }
    if (updatePreferencesDto.autoSave !== undefined) {
      user.preferences.autoSave = updatePreferencesDto.autoSave;
    }

    await user.save();

    return {
      id: user._id,
      email: user.email,
      preferences: user.preferences,
    };
  }

  async updateApiKeys(userId: string, updateApiKeysDto: UpdateApiKeysDto) {
    this.logger.log(`Updating API keys for user: ${userId}`);

    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Validate API keys format (basic validation)
    if (updateApiKeysDto.openai && !this.isValidApiKey(updateApiKeysDto.openai, 'openai')) {
      throw new BadRequestException('Invalid OpenAI API key format');
    }
    if (updateApiKeysDto.anthropic && !this.isValidApiKey(updateApiKeysDto.anthropic, 'anthropic')) {
      throw new BadRequestException('Invalid Anthropic API key format');
    }
    if (updateApiKeysDto.deepseek && !this.isValidApiKey(updateApiKeysDto.deepseek, 'deepseek')) {
      throw new BadRequestException('Invalid DeepSeek API key format');
    }

    // Update API keys (encrypt them for storage)
    if (updateApiKeysDto.openai !== undefined) {
      user.apiKeys.openai = this.cryptoService.encryptSimple(updateApiKeysDto.openai);
    }
    if (updateApiKeysDto.anthropic !== undefined) {
      user.apiKeys.anthropic = this.cryptoService.encryptSimple(updateApiKeysDto.anthropic);
    }
    if (updateApiKeysDto.deepseek !== undefined) {
      user.apiKeys.deepseek = this.cryptoService.encryptSimple(updateApiKeysDto.deepseek);
    }

    await user.save();

    return {
      message: 'API keys updated successfully',
      hasOpenAI: !!user.apiKeys.openai,
      hasAnthropic: !!user.apiKeys.anthropic,
      hasDeepSeek: !!user.apiKeys.deepseek,
    };
  }

  async getApiKeys(userId: string) {
    this.logger.log(`Fetching API keys status for user: ${userId}`);

    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Return only the status of API keys, not the actual keys
    return {
      hasOpenAI: !!user.apiKeys.openai,
      hasAnthropic: !!user.apiKeys.anthropic,
      hasDeepSeek: !!user.apiKeys.deepseek,
    };
  }

  async getDecryptedApiKey(userId: string, provider: 'openai' | 'anthropic' | 'deepseek'): Promise<string | null> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      return null;
    }

    const encryptedKey = user.apiKeys[provider];
    if (!encryptedKey) {
      return null;
    }

    try {
      return this.cryptoService.decryptSimple(encryptedKey);
    } catch (error) {
      this.logger.error(`Failed to decrypt API key for provider ${provider}:`, error);
      return null;
    }
  }

  private isValidApiKey(apiKey: string, provider: string): boolean {
    // Basic API key format validation
    switch (provider) {
      case 'openai':
        return apiKey.startsWith('sk-') && apiKey.length > 20;
      case 'anthropic':
        return apiKey.startsWith('sk-ant-') && apiKey.length > 20;
      case 'deepseek':
        return apiKey.startsWith('sk-') && apiKey.length > 20;
      default:
        return false;
    }
  }



  async incrementUsage(userId: string) {
    this.logger.log(`Incrementing usage for user: ${userId}`);

    const user = await this.userModel.findById(userId);
    if (!user) {
      return;
    }

    user.usage.totalOptimizations += 1;
    user.usage.monthlyUsage += 1;
    user.usage.lastUsed = new Date();

    await user.save();
  }

  async resetMonthlyUsage(userId: string) {
    this.logger.log(`Resetting monthly usage for user: ${userId}`);

    const user = await this.userModel.findById(userId);
    if (!user) {
      return;
    }

    user.usage.monthlyUsage = 0;
    await user.save();
  }
}