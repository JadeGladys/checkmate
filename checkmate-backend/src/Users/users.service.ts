import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User, UserRole, UserStatus } from './user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    // Check if user with email already exists
    const existingUser = await this.userRepository.findOne({
      where: { email: createUserDto.email }
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(createUserDto.password, 12);

    // Create user
    const user = this.userRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });

    return this.userRepository.save(user);
  }

  async findAll(currentUser: User): Promise<User[]> {
    // VIP users can only see basic user info
    if (currentUser.isVIP()) {
      return this.userRepository.find({
        select: ['id', 'firstName', 'lastName', 'email', 'role', 'status', 'department', 'position', 'createdAt']
      });
    }

    // Admin and managers can see all users
    if (currentUser.canManageUsers()) {
      return this.userRepository.find();
    }

    // Team leads can see their team members
    if (currentUser.isTeamLead()) {
      return this.userRepository.find({
        where: { teamId: currentUser.teamId }
      });
    }

    // Regular team members can only see themselves
    return this.userRepository.find({
      where: { id: currentUser.id }
    });
  }

  async findOne(id: string, currentUser: User): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check permissions
    if (currentUser.id === id) {
      return user; // Users can always see their own profile
    }

    if (currentUser.isVIP()) {
      // VIP users can see basic info of all users
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword as any;
    }

    if (currentUser.canManageUsers()) {
      return user; // Admin and managers can see all users
    }

    if (currentUser.isTeamLead() && user.teamId === currentUser.teamId) {
      return user; // Team leads can see their team members
    }

    throw new BadRequestException('Insufficient permissions to view this user');
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async update(id: string, updateUserDto: UpdateUserDto, currentUser: User): Promise<User> {
    const user = await this.findOne(id, currentUser);

    // Check if user can update this profile
    if (!this.canUpdateUser(currentUser, user)) {
      throw new BadRequestException('Insufficient permissions to update this user');
    }

    // If updating email, check if it's already taken
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.findByEmail(updateUserDto.email);
      if (existingUser) {
        throw new ConflictException('Email already taken');
      }
    }

    // Hash password if it's being updated
    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 12);
    }

    // VIP users can only update their own profile and only basic info
    if (currentUser.isVIP() && currentUser.id !== id) {
      throw new BadRequestException('VIP users can only update their own profile');
    }

    if (currentUser.isVIP()) {
      // Remove sensitive fields from update
      delete updateUserDto.role;
      delete updateUserDto.status;
      delete updateUserDto.managerId;
      delete updateUserDto.teamId;
    }

    await this.userRepository.update(id, updateUserDto);
    return this.findOne(id, currentUser);
  }

  async remove(id: string, currentUser: User): Promise<void> {
    const user = await this.findOne(id, currentUser);

    // Only admins can delete users
    if (!currentUser.isAdmin()) {
      throw new BadRequestException('Only admins can delete users');
    }

    // Prevent self-deletion
    if (currentUser.id === id) {
      throw new BadRequestException('Cannot delete your own account');
    }

    await this.userRepository.remove(user);
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.userRepository.update(id, { lastLoginAt: new Date() });
  }

  async findTeamMembers(teamId: string, currentUser: User): Promise<User[]> {
    // Check if user can access this team
    if (!this.canAccessTeam(currentUser, teamId)) {
      throw new BadRequestException('Insufficient permissions to access this team');
    }

    return this.userRepository.find({
      where: { teamId }
    });
  }

  async findSubordinates(managerId: string, currentUser: User): Promise<User[]> {
    // Check if user can access this manager's subordinates
    if (!this.canAccessManager(currentUser, managerId)) {
      throw new BadRequestException('Insufficient permissions to access this manager\'s subordinates');
    }

    return this.userRepository.find({
      where: { managerId }
    });
  }

  async changeUserStatus(id: string, status: UserStatus, currentUser: User): Promise<User> {
    const user = await this.findOne(id, currentUser);

    // Only admins and managers can change user status
    if (!currentUser.canManageUsers()) {
      throw new BadRequestException('Insufficient permissions to change user status');
    }

    // Prevent changing own status
    if (currentUser.id === id) {
      throw new BadRequestException('Cannot change your own status');
    }

    await this.userRepository.update(id, { status });
    return this.findOne(id, currentUser);
  }

  async changeUserRole(id: string, role: UserRole, currentUser: User): Promise<User> {
    const user = await this.findOne(id, currentUser);

    // Only admins can change user roles
    if (!currentUser.isAdmin()) {
      throw new BadRequestException('Only admins can change user roles');
    }

    // Prevent changing own role
    if (currentUser.id === id) {
      throw new BadRequestException('Cannot change your own role');
    }

    await this.userRepository.update(id, { role });
    return this.findOne(id, currentUser);
  }

  private canUpdateUser(currentUser: User, targetUser: User): boolean {
    // Users can always update their own profile
    if (currentUser.id === targetUser.id) {
      return true;
    }

    // Admins can update any user
    if (currentUser.isAdmin()) {
      return true;
    }

    // Managers can update team members and team leads
    if (currentUser.isManager()) {
      return targetUser.role === UserRole.TEAM_MEMBER || targetUser.role === UserRole.TEAM_LEAD;
    }

    // Team leads can update their team members
    if (currentUser.isTeamLead()) {
      return targetUser.teamId === currentUser.teamId && targetUser.role === UserRole.TEAM_MEMBER;
    }

    return false;
  }

  private canAccessTeam(currentUser: User, teamId: string): boolean {
    if (currentUser.isAdmin() || currentUser.isVIP()) {
      return true;
    }

    if (currentUser.isManager()) {
      return true; // Managers can access any team
    }

    if (currentUser.isTeamLead()) {
      return currentUser.teamId === teamId;
    }

    return false;
  }

  private canAccessManager(currentUser: User, managerId: string): boolean {
    if (currentUser.isAdmin() || currentUser.isVIP()) {
      return true;
    }

    if (currentUser.isManager()) {
      return true; // Managers can access any manager's subordinates
    }

    return currentUser.managerId === managerId;
  }
} 