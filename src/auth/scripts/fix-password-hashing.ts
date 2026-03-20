import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class FixPasswordHashingService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async fixUnhashedPasswords() {
    console.log('🔍 Scanning for unhashed passwords...');
    
    const allUsers = await this.usersRepository.find();
    let fixedCount = 0;

    for (const user of allUsers) {
      // Check if password looks like it's already hashed (bcrypt hashes start with $2a$, $2b$, or $2y$)
      if (!user.password.startsWith('$2')) {
        console.log(`⚠️  Found unhashed password for user: ${user.email}`);
        
        // Hash the password
        const hashedPassword = await bcrypt.hash(user.password, 12);
        
        // Update in database directly to bypass the @BeforeInsert hook
        await this.usersRepository.update(
          { id: user.id },
          { password: hashedPassword }
        );
        
        fixedCount++;
        console.log(`✅ Fixed password for: ${user.email}`);
      }
    }

    console.log(`\n📊 Summary: Fixed ${fixedCount} unhashed password(s)`);
    return { fixedCount, totalUsers: allUsers.length };
  }

  async verifyPasswordHash(email: string): Promise<boolean> {
    const user = await this.usersRepository.findOne({ where: { email } });
    if (!user) {
      console.log(`❌ User not found: ${email}`);
      return false;
    }

    const isHashed = user.password.startsWith('$2');
    console.log(`✅ User ${email}: Password is ${isHashed ? 'HASHED' : 'NOT HASHED'}`);
    return isHashed;
  }
}
