import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In } from 'typeorm';
import { User, UserStatus, UserRole } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { EmailService } from '../common/services/email.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private jwtService: JwtService,
    private emailService: EmailService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const user = this.usersRepository.create(createUserDto);
    return await this.usersRepository.save(user);
  }

  async createUserByAdmin(createUserDto: CreateUserDto): Promise<User> {
    // Kiểm tra email đã tồn tại
    const existing = await this.findByEmail(createUserDto.email);
    if (existing) {
      throw new BadRequestException('Email đã tồn tại');
    }

    // Tạo user với status=pending
    const user = this.usersRepository.create({
      ...createUserDto,
      status: UserStatus.PENDING,
      emailVerified: false,
    });
    
    const savedUser = await this.usersRepository.save(user);
    
    // Tạo verification token
    const verificationToken = this.jwtService.sign(
      { email: savedUser.email, type: 'email-verification' },
      { expiresIn: '24h' }
    );

    // Cập nhật token vào database
    await this.updateEmailVerificationToken(savedUser.id, verificationToken);

    // Gửi email xác thực với mật khẩu tạm
    await this.emailService.sendAdminCreatedUserEmail(
      savedUser.email, 
      verificationToken,
      createUserDto.password // Mật khẩu tạm admin đặt
    );
    
    return savedUser;
  }

  async findAll(): Promise<User[]> {
    return await this.usersRepository.find();
  }

  async findAllWithPagination(
    page = 1,
    limit = 10,
    search?: string,
    role?: UserRole,
    status?: UserStatus,
    sortBy = 'createdAt',
    sortOrder: 'ASC' | 'DESC' = 'DESC',
  ): Promise<{
    data: User[];
    total: number;
    page: number;
    totalPages: number;
    stats: { total: number; active: number; inactive: number; teachers: number; students: number };
  }> {
    const queryBuilder = this.usersRepository.createQueryBuilder('user');

    // Search
    if (search) {
      queryBuilder.where(
        '(user.name ILIKE :search OR user.email ILIKE :search OR user.phone ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Filter by role
    if (role) {
      queryBuilder.andWhere('user.role = :role', { role });
    }

    // Filter by status
    if (status) {
      queryBuilder.andWhere('user.status = :status', { status });
    }

    // Sorting
    queryBuilder.orderBy(`user.${sortBy}`, sortOrder);

    // Pagination
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    // Get stats
    const stats = await this.getStats();

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      stats,
    };
  }

  async getStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    teachers: number;
    students: number;
    admins: number;
  }> {
    const [total, active, inactive, teachers, students, admins] = await Promise.all([
      this.usersRepository.count(),
      this.usersRepository.count({ where: { status: UserStatus.ACTIVE } }),
      this.usersRepository.count({ where: { status: UserStatus.INACTIVE } }),
      this.usersRepository.count({ where: { role: UserRole.TEACHER } }),
      this.usersRepository.count({ where: { role: UserRole.STUDENT } }),
      this.usersRepository.count({ where: { role: UserRole.ADMIN } }),
    ]);

    return { total, active, inactive, teachers, students, admins };
  }

  async findOne(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('Người dùng không tìm thấy');
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.usersRepository.findOne({ where: { email } });
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    await this.usersRepository.update({ id }, updateUserDto);
    return await this.findOne(id);
  }

  async updateStatus(id: string, status: UserStatus): Promise<User> {
    await this.usersRepository.update({ id }, { status });
    return await this.findOne(id);
  }

  async updateRole(id: string, role: UserRole): Promise<User> {
    await this.usersRepository.update({ id }, { role });
    return await this.findOne(id);
  }

  async bulkAction(
    ids: string[],
    action: 'activate' | 'deactivate' | 'delete',
  ): Promise<{ success: boolean; affected: number }> {
    if (!ids || ids.length === 0) {
      throw new BadRequestException('Chưa cấp ID người dùng');
    }

    let affected = 0;

    switch (action) {
      case 'activate':
        const activateResult = await this.usersRepository.update(
          { id: In(ids) },
          { status: UserStatus.ACTIVE },
        );
        affected = activateResult.affected || 0;
        break;

      case 'deactivate':
        const deactivateResult = await this.usersRepository.update(
          { id: In(ids) },
          { status: UserStatus.INACTIVE },
        );
        affected = deactivateResult.affected || 0;
        break;

      case 'delete':
        const deleteResult = await this.usersRepository.delete({ id: In(ids) });
        affected = deleteResult.affected || 0;
        break;

      default:
        throw new BadRequestException('Hành động không hợp lệ');
    }

    return { success: true, affected };
  }

  async remove(id: string): Promise<void> {
    const result = await this.usersRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('Người dùng không tìm thấy');
    }
  }

  async updateEmailVerificationToken(id: string, token: string): Promise<void> {
    await this.usersRepository.update({ id }, { emailVerificationToken: token });
  }

  async verifyEmail(token: string): Promise<User | null> {
    const user = await this.usersRepository.findOne({
      where: { emailVerificationToken: token },
    });

    if (user) {
      await this.usersRepository.update({ id: user.id }, {
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
      await this.usersRepository.update({ id: user.id }, {
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
      return { found: false, message: 'Người dùng không tìm thấy' };
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
      return { success: false, message: 'Người dùng không tìm thấy' };
    }

    user.status = UserStatus.ACTIVE;
    user.emailVerified = true;
    user.emailVerifiedAt = new Date();
    await this.usersRepository.save(user);

    return {
      success: true,
      message: 'Người dùng được kích hoạt thành công',
      user: {
        email: user.email,
        status: user.status,
        emailVerified: user.emailVerified,
      },
    };
  }

  async updatePassword(id: string, hashedPassword: string): Promise<void> {
    await this.usersRepository.update({ id }, { password: hashedPassword });
  }

  async updateUserAvatar(id: string, avatarUrl: string): Promise<void> {
    await this.usersRepository.update({ id }, { avatar: avatarUrl });
  }
}

