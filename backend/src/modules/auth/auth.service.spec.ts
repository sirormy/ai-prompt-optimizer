import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { User } from '../../schemas/user.schema';
import { CryptoService } from '../../common/services/crypto.service';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let mockUserModel: any;
  let mockJwtService: any;
  let mockCryptoService: any;

  const mockUser = {
    _id: 'user123',
    email: 'test@example.com',
    password: 'hashedPassword',
    preferences: {
      defaultModel: 'openai',
      optimizationLevel: 'basic',
      autoSave: true,
    },
    apiKeys: {
      openai: '',
      anthropic: '',
      deepseek: '',
    },
    usage: {
      totalOptimizations: 0,
      monthlyUsage: 0,
      lastUsed: new Date(),
    },
    save: jest.fn(),
  };

  beforeEach(async () => {
    mockUserModel = jest.fn().mockImplementation(() => ({
      ...mockUser,
      save: jest.fn().mockResolvedValue(mockUser),
    }));
    mockUserModel.findOne = jest.fn();
    mockUserModel.findById = jest.fn();

    mockJwtService = {
      sign: jest.fn().mockReturnValue('mock-jwt-token'),
    };

    mockCryptoService = {
      encryptSimple: jest.fn().mockReturnValue('encrypted-key'),
      decryptSimple: jest.fn().mockReturnValue('decrypted-key'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: CryptoService,
          useValue: mockCryptoService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      mockUserModel.findOne.mockResolvedValue(null);
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashedPassword' as never);

      const registerDto = { email: 'test@example.com', password: 'password123' };
      const result = await service.register(registerDto);

      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('user');
      expect(result.user.email).toBe(registerDto.email);
    });

    it('should throw ConflictException if user already exists', async () => {
      mockUserModel.findOne.mockResolvedValue(mockUser);

      const registerDto = { email: 'test@example.com', password: 'password123' };

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should login user successfully', async () => {
      mockUserModel.findOne.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

      const loginDto = { email: 'test@example.com', password: 'password123' };
      const result = await service.login(loginDto);

      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('user');
      expect(result.user.email).toBe(loginDto.email);
    });

    it('should throw UnauthorizedException for invalid credentials', async () => {
      mockUserModel.findOne.mockResolvedValue(null);

      const loginDto = { email: 'test@example.com', password: 'password123' };

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('updatePreferences', () => {
    it('should update user preferences successfully', async () => {
      mockUserModel.findById.mockResolvedValue(mockUser);

      const updateDto = { defaultModel: 'claude', optimizationLevel: 'advanced' };
      const result = await service.updatePreferences('user123', updateDto);

      expect(result.preferences.defaultModel).toBe('claude');
      expect(result.preferences.optimizationLevel).toBe('advanced');
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockUserModel.findById.mockResolvedValue(null);

      const updateDto = { defaultModel: 'claude' };

      await expect(service.updatePreferences('user123', updateDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('updateApiKeys', () => {
    it('should update API keys successfully', async () => {
      mockUserModel.findById.mockResolvedValue(mockUser);

      const updateDto = { openai: 'sk-test-key-123456789012345678901234567890' };
      const result = await service.updateApiKeys('user123', updateDto);

      expect(result.message).toBe('API keys updated successfully');
      expect(mockCryptoService.encryptSimple).toHaveBeenCalledWith('sk-test-key-123456789012345678901234567890');
    });

    it('should throw BadRequestException for invalid API key format', async () => {
      mockUserModel.findById.mockResolvedValue(mockUser);

      const updateDto = { openai: 'invalid-key' };

      await expect(service.updateApiKeys('user123', updateDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('getDecryptedApiKey', () => {
    it('should return decrypted API key', async () => {
      const userWithApiKey = { ...mockUser, apiKeys: { openai: 'encrypted-key' } };
      mockUserModel.findById.mockResolvedValue(userWithApiKey);

      const result = await service.getDecryptedApiKey('user123', 'openai');

      expect(result).toBe('decrypted-key');
      expect(mockCryptoService.decryptSimple).toHaveBeenCalledWith('encrypted-key');
    });

    it('should return null if API key not found', async () => {
      const userWithoutApiKey = { ...mockUser, apiKeys: { openai: '', anthropic: '', deepseek: '' } };
      mockUserModel.findById.mockResolvedValue(userWithoutApiKey);

      const result = await service.getDecryptedApiKey('user123', 'openai');

      expect(result).toBeNull();
    });
  });

  describe('incrementUsage', () => {
    it('should increment user usage statistics', async () => {
      mockUserModel.findById.mockResolvedValue(mockUser);

      await service.incrementUsage('user123');

      expect(mockUser.usage.totalOptimizations).toBe(1);
      expect(mockUser.usage.monthlyUsage).toBe(1);
      expect(mockUser.save).toHaveBeenCalled();
    });
  });
});