import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { CommonModule } from '../common/common.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { TwoFactorAuthService } from './two-factor-auth.service';
import { TwoFactorAuthController } from './two-factor-auth.controller';
import { TwoFactorAuth } from './entities/two-factor-auth.entity';
import { User } from '../users/entities/user.entity';
import { CacheModule } from '@nestjs/cache-manager';
import { SystemSettingsModule } from '../system-settings/system-setting.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TwoFactorAuth, User]),
    CacheModule.register(),
    UsersModule,
    CommonModule,
    SystemSettingsModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: { expiresIn: '24h' },
      }),
      inject: [ConfigService],
    }),
    ConfigModule,
  ],
  controllers: [AuthController, TwoFactorAuthController],
  providers: [
    AuthService,
    LocalStrategy,
    JwtStrategy,
    GoogleStrategy,
    TwoFactorAuthService,
  ],
  exports: [AuthService, TwoFactorAuthService],
})
export class AuthModule {}
