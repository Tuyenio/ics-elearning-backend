import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserStatus } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const user = this.usersRepository.create(createUserDto);
    return await this.usersRepository.save(user);
  }

  async findAll(): Promise<User[]> {
    return await this.usersRepository.find();
  }

  async findOne(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.usersRepository.findOne({ where: { email } });
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    await this.usersRepository.update(id, updateUserDto);
    return await this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const result = await this.usersRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('User not found');
    }
  }

  async updateEmailVerificationToken(id: string, token: string): Promise<void> {
    await this.usersRepository.update(id, { emailVerificationToken: token });
  }

  async verifyEmail(token: string): Promise<User | null> {
    const user = await this.usersRepository.findOne({
      where: { emailVerificationToken: token },
    });

    if (user) {
      await this.usersRepository.update(user.id, {
        emailVerified: true,
        emailVerifiedAt: new Date(),
        emailVerificationToken: undefined,
        status: UserStatus.ACTIVE,
      });
      return await this.findOne(user.id);
    }

    return null;
  }

  async updatePasswordResetToken(
    email: string,
    token: string,
    expires: Date,
  ): Promise<User | null> {
    const user = await this.findByEmail(email);
    if (user) {
      await this.usersRepository.update(user.id, {
        passwordResetToken: token,
        passwordResetExpires: expires,
      });
      return user;
    }
    return null;
  }

  async resetPassword(token: string, newPassword: string): Promise<User | null> {
    const user = await this.usersRepository.findOne({
      where: { passwordResetToken: token },
    });

    if (user && user.passwordResetExpires && user.passwordResetExpires > new Date()) {
      // Hash the new password manually
      const hashedPassword = await bcrypt.hash(newPassword, 12);
      
      user.password = hashedPassword;
      user.passwordResetToken = null;
      user.passwordResetExpires = null;
      
      return await this.usersRepository.save(user);
    }

    return null;
  }

  async debugUserByEmail(email: string) {
    const user = await this.usersRepository.findOne({ where: { email } });
    if (!user) {
      return { found: false, message: 'User not found' };
    }

    return {
      found: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
        emailVerified: user.emailVerified,
        emailVerifiedAt: user.emailVerifiedAt,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      }
    };
  }

  async activateUserByEmail(email: string) {
    const user = await this.usersRepository.findOne({ where: { email } });
    if (!user) {
      return { success: false, message: 'User not found' };
    }

    user.status = UserStatus.ACTIVE;
    user.emailVerified = true;
    user.emailVerifiedAt = new Date();
    await this.usersRepository.save(user);

    return {
      success: true,
      message: 'User activated successfully',
      user: {
        email: user.email,
        status: user.status,
        emailVerified: user.emailVerified,
      },
    };
  }

  async updatePassword(id: string, hashedPassword: string): Promise<void> {
    await this.usersRepository.update(id, { password: hashedPassword });
  }
}

