import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { User, UserRole } from '../users/entities/user.entity';
import type { UpgradeSubscriptionDto } from './dto/upgrade-subscription.dto';
import type { UpsertPlanDto } from './dto/upsert-plan.dto';
import { InstructorSubscriptionsService } from './instructor-subscriptions.service';

@Controller('instructor-subscriptions')
export class InstructorSubscriptionsController {
  constructor(private readonly service: InstructorSubscriptionsService) {}

  @Get('plans/public')
  getPublicPlans() {
    return this.service.getPublicPlans();
  }

  @Get('teacher/me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER)
  getTeacherSubscription(@GetUser() user: User) {
    return this.service.getTeacherSubscription(user.id);
  }

  @Post('teacher/upgrade')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER)
  upgradePlan(@GetUser() user: User, @Body() body: UpgradeSubscriptionDto) {
    return this.service.upgradePlan(user.id, body);
  }

  @Get('teacher/payment-methods')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER)
  getTeacherPaymentMethods(@GetUser() user: User) {
    return this.service.getTeacherPaymentMethods(user.id);
  }

  @Post('teacher/payment-methods')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER)
  createTeacherPaymentMethod(
    @GetUser() user: User,
    @Body() body: Record<string, any>,
  ) {
    return this.service.createTeacherPaymentMethod(user.id, body);
  }

  @Patch('teacher/payment-methods/:id/default')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER)
  setDefaultTeacherPaymentMethod(
    @GetUser() user: User,
    @Param('id') id: string,
  ) {
    return this.service.setDefaultTeacherPaymentMethod(user.id, id);
  }

  @Post('teacher/checkout')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER)
  createCheckout(@GetUser() user: User, @Body() body: UpgradeSubscriptionDto) {
    return this.service.createCheckout(user.id, body);
  }

  @Post('teacher/checkout/:transactionId/confirm')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER)
  confirmCheckout(
    @GetUser() user: User,
    @Param('transactionId') transactionId: string,
  ) {
    return this.service.confirmCheckout(user.id, transactionId);
  }

  @Get('teacher/checkout/:transactionId/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER)
  getCheckoutStatus(
    @GetUser() user: User,
    @Param('transactionId') transactionId: string,
  ) {
    return this.service.getCheckoutStatus(user.id, transactionId);
  }

  @Post('teacher/cancel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER)
  cancelSubscription(@GetUser() user: User, @Body('reason') reason?: string) {
    return this.service.cancelSubscription(user.id, reason);
  }

  @Get('admin/plans')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  getAdminPlans() {
    return this.service.getAdminPlans();
  }

  @Post('admin/plans')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  createPlan(@Body() body: UpsertPlanDto) {
    return this.service.createPlan(body);
  }

  @Patch('admin/plans/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  updatePlan(@Param('id') id: string, @Body() body: Partial<UpsertPlanDto>) {
    return this.service.updatePlan(id, body);
  }

  @Delete('admin/plans/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  deletePlan(@Param('id') id: string, @GetUser() user: User) {
    return this.service.removePlan(id, user);
  }

  @Get('admin/subscriptions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  getAdminSubscriptions() {
    return this.service.getAdminSubscriptions();
  }

  @Get('admin/payments')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  getAdminPayments() {
    return this.service.getAdminPayments();
  }

  @Post('admin/payments/:id/confirm')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  confirmPayment(@Param('id') id: string) {
    return this.service.confirmPayment(id);
  }

  @Post('admin/payments/:id/refund')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  refundPayment(@Param('id') id: string) {
    return this.service.refundPayment(id);
  }

  @Get('admin/revenue-dashboard')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  getRevenueDashboard() {
    return this.service.getRevenueDashboard();
  }
}
