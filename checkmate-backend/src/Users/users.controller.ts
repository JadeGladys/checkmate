import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User, UserRole, UserStatus } from './user.entity';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  async findAll(@Request() req) {
    const currentUser = req.user as User;
    return this.usersService.findAll(currentUser);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req) {
    const currentUser = req.user as User;
    return this.usersService.findOne(id, currentUser);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Request() req,
  ) {
    const currentUser = req.user as User;
    return this.usersService.update(id, updateUserDto, currentUser);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @Request() req) {
    const currentUser = req.user as User;
    return this.usersService.remove(id, currentUser);
  }

  @Get('team/:teamId/members')
  async findTeamMembers(@Param('teamId') teamId: string, @Request() req) {
    const currentUser = req.user as User;
    return this.usersService.findTeamMembers(teamId, currentUser);
  }

  @Get('manager/:managerId/subordinates')
  async findSubordinates(@Param('managerId') managerId: string, @Request() req) {
    const currentUser = req.user as User;
    return this.usersService.findSubordinates(managerId, currentUser);
  }

  @Patch(':id/status')
  async changeUserStatus(
    @Param('id') id: string,
    @Body('status') status: UserStatus,
    @Request() req,
  ) {
    const currentUser = req.user as User;
    return this.usersService.changeUserStatus(id, status, currentUser);
  }

  @Patch(':id/role')
  async changeUserRole(
    @Param('id') id: string,
    @Body('role') role: UserRole,
    @Request() req,
  ) {
    const currentUser = req.user as User;
    return this.usersService.changeUserRole(id, role, currentUser);
  }

  @Get('profile/me')
  async getMyProfile(@Request() req) {
    const currentUser = req.user as User;
    return this.usersService.findOne(currentUser.id, currentUser);
  }

  @Patch('profile/me')
  async updateMyProfile(
    @Body() updateUserDto: UpdateUserDto,
    @Request() req,
  ) {
    const currentUser = req.user as User;
    return this.usersService.update(currentUser.id, updateUserDto, currentUser);
  }
} 