import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum UserRole {
  TEAM_MEMBER = 'team_member',
  TEAM_LEAD = 'team_lead',
  MANAGER = 'manager',
  VIP = 'vip', // CEO, HR - read only
  ADMIN = 'admin'
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended'
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ nullable: true })
  avatar?: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.TEAM_MEMBER
  })
  role: UserRole;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.ACTIVE
  })
  status: UserStatus;

  @Column({ nullable: true })
  department?: string;

  @Column({ nullable: true })
  position?: string;

  @Column({ nullable: true })
  managerId?: string;

  @Column({ nullable: true })
  teamId?: string;

  @Column({ type: 'text', nullable: true })
  bio?: string;

  @Column({ nullable: true })
  phoneNumber?: string;

  @Column({ default: false })
  isEmailVerified: boolean;

  @Column({ nullable: true })
  lastLoginAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Helper methods for role checking
  isAdmin(): boolean {
    return this.role === UserRole.ADMIN;
  }

  isVIP(): boolean {
    return this.role === UserRole.VIP;
  }

  isManager(): boolean {
    return this.role === UserRole.MANAGER;
  }

  isTeamLead(): boolean {
    return this.role === UserRole.TEAM_LEAD;
  }

  isTeamMember(): boolean {
    return this.role === UserRole.TEAM_MEMBER;
  }

  canReadOnly(): boolean {
    return this.isVIP() || this.isAdmin();
  }

  canManageUsers(): boolean {
    return this.isAdmin() || this.isManager();
  }

  canManageTeam(): boolean {
    return this.isAdmin() || this.isManager() || this.isTeamLead();
  }

  getFullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }
} 