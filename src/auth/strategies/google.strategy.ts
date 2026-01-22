import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import { UserRole } from '../../users/entities/user.entity';
import * as bcrypt from 'bcryptjs';

/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */

interface GoogleProfile {
  id: string;
  displayName: string;
  name?: {
    familyName?: string;
    givenName?: string;
  };
  emails?: Array<{ value: string }>;
  photos?: Array<{ value: string }>;
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID'),
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET'),
      callbackURL: configService.get<string>('GOOGLE_CALLBACK_URL'),
      scope: ['email', 'profile'],
    } as any);
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: GoogleProfile,
    done: VerifyCallback,
  ): Promise<any> {
    const { name, emails, photos } = profile;
    const email = emails && emails[0] ? emails[0].value : null;
    const picture = photos && photos[0] ? photos[0].value : null;

    try {
      if (!email) {
        return done(new Error('Email not provided by Google'));
      }

      // Tìm hoặc tạo user
      let user = await this.usersService.findByEmail(email);

      if (!user) {
        // Tạo user mới từ Google
        const randomPassword = bcrypt.hashSync(Math.random().toString(36), 10);
        const fullName = name
          ? `${name.givenName || ''} ${name.familyName || ''}`.trim()
          : email.split('@')[0];

        user = await this.usersService.create({
          email: email,
          name: fullName,
          password: randomPassword,
          avatar: picture || undefined,
          role: UserRole.STUDENT,
        });

        // Xác thực email ngay lập tức cho Google users
        await this.usersService.update(user.id, {
          emailVerified: true,
          emailVerifiedAt: new Date(),
        });

        // Refresh user data
        user = (await this.usersService.findOne(user.id))!;
      } else {
        // Nếu user tồn tại nhưng chưa xác thực email, hãy xác thực
        const updateData: Record<string, unknown> = {};
        let hasChanges = false;

        if (!user.emailVerified) {
          updateData.emailVerified = true;
          updateData.emailVerifiedAt = new Date();
          hasChanges = true;
        }

        if (picture && !user.avatar) {
          updateData.avatar = picture;
          hasChanges = true;
        }

        if (hasChanges) {
          await this.usersService.update(user.id, updateData as any);
          user = (await this.usersService.findOne(user.id))!;
        }
      }

      const userInfo = {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        role: user.role,
        emailVerified: user.emailVerified,
        status: user.status,
      };

      done(null, userInfo);
    } catch (error) {
      done(error);
    }
  }
}

