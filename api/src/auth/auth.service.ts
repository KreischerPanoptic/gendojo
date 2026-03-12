import { Injectable, UnauthorizedException, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoginDto, LoginResponseDto } from './dto/login.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import * as argon2 from 'argon2';
import { generateSecret, generateURI, verify } from "otplib";
import QRCode from "qrcode";

@Injectable()
export class AuthService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) { }

  async onApplicationBootstrap() {
    const adminUser = process.env.AUTH_USERNAME?.trim();
    const adminPass = process.env.AUTH_PASSWORD?.trim();

    if (!adminUser || !adminPass) {
      this.logger.warn('AUTH_USERNAME/PASSWORD not set. Skip admin auto-creation.');
      return;
    }

    const existing = await this.userRepository.findOne({ where: { username: adminUser } });

    if (!existing) {
      this.logger.log(`Creating initial admin user: ${adminUser}`);
      const newUser = this.userRepository.create({
        username: adminUser,
        password: adminPass
      });
      await this.userRepository.save(newUser);
    }
  }

  async login(dto: LoginDto): Promise<LoginResponseDto> {
    const user = await this.userRepository.createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.username = :username', { username: dto.username })
      .getOne();

    if (!user) {
      this.logger.warn(`User not found: ${dto.username}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await argon2.verify(user.password, dto.password);

    if (!isPasswordValid) {
      this.logger.warn(`Invalid password for user: ${dto.username}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { sub: user.id, username: user.username };

    return {
      accessToken: this.jwtService.sign(payload),
      username: user.username,
    };
  }

  async generateMfaSecret(userId: string) {
    const user = await this.userRepository.findOneBy({ id: userId });
    if (user) {
      const secret = generateSecret();

      // Create otpauth:// URI
      const uri = generateURI({
        issuer: "GenDojo",
        label: user.username,
        secret,
      });
      await this.userRepository.update(userId, { mfaSecret: secret });

      const qrCode = await QRCode.toDataURL(uri);
      return {
        secret,
        qrCode,  // data:image/png;base64,...
        url: uri, // otpauth://totp/GenDojo:admin?secret=...
      };
    }
    return null;
  }

  async verifyAndEnableMfa(userId: string, token: string) {
    const user = await this.userRepository.createQueryBuilder('user')
      .addSelect('user.mfaSecret')
      .where('user.id = :id', { id: userId })
      .getOne();
    if (user) {
      const isValid = await verify({ token, secret: user.mfaSecret ?? '' });

      if (isValid) {
        await this.userRepository.update(userId, { isMfaEnabled: true });
        return true;
      }
    }
    return false;
  }

  async validateMfaToken(userId: string, token: string) {
    const user = await this.userRepository.createQueryBuilder('user')
      .addSelect('user.mfaSecret')
      .where('user.id = :id', { id: userId })
      .getOne();

    return await verify({ token, secret: user?.mfaSecret ?? '' });
  }
}