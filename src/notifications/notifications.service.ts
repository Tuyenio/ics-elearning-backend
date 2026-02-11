import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Notification,
  NotificationType,
  NotificationStatus,
} from './entities/notification.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
  ) {}

  async create(data: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    link?: string;
    metadata?: Record<string, any>;
  }): Promise<Notification> {
    const notification = this.notificationRepository.create(data);
    return this.notificationRepository.save(notification);
  }

  async findAllByUser(
    userId: string,
    page = 1,
    limit = 20,
    status?: NotificationStatus,
  ): Promise<{
    data: Notification[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const where: any = { userId };
    if (status) {
      where.status = status;
    }

    const [data, total] = await this.notificationRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationRepository.count({
      where: { userId, status: NotificationStatus.UNREAD },
    });
  }

  async markAsRead(id: string, userId: string): Promise<Notification | null> {
    await this.notificationRepository.update(
      { id, userId },
      { status: NotificationStatus.READ, readAt: new Date() },
    );
    return this.notificationRepository.findOne({ where: { id, userId } });
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationRepository.update(
      { userId, status: NotificationStatus.UNREAD },
      { status: NotificationStatus.READ, readAt: new Date() },
    );
  }

  async delete(id: string, userId: string): Promise<void> {
    await this.notificationRepository.delete({ id, userId });
  }

  async deleteAll(userId: string): Promise<void> {
    await this.notificationRepository.delete({ userId });
  }

  // Helper methods for common notifications
  async notifyEnrollment(
    userId: string,
    courseName: string,
    courseId: string,
  ): Promise<Notification> {
    return this.create({
      userId,
      type: NotificationType.COURSE_ENROLLED,
      title: 'Đăng ký khóa học thành công',
      message: `Bạn đã đăng ký thành công khóa học "${courseName}"`,
      link: `/my-courses`,
      metadata: { courseId },
    });
  }

  async notifyPaymentSuccess(
    userId: string,
    amount: number,
    courseName: string,
  ): Promise<Notification> {
    return this.create({
      userId,
      type: NotificationType.PAYMENT_SUCCESS,
      title: 'Thanh toán thành công',
      message: `Thanh toán ${amount.toLocaleString('vi-VN')}₫ cho khóa học "${courseName}" thành công`,
      link: `/payment-history`,
    });
  }

  async notifyCertificateIssued(
    userId: string,
    courseName: string,
    certificateId: string,
  ): Promise<Notification> {
    return this.create({
      userId,
      type: NotificationType.CERTIFICATE_ISSUED,
      title: 'Chứng chỉ đã được cấp',
      message: `Chúc mừng! Bạn đã nhận được chứng chỉ hoàn thành khóa học "${courseName}"`,
      link: `/certificates`,
      metadata: { certificateId },
    });
  }

  async notifyNewStudent(
    teacherId: string,
    studentName: string,
    courseName: string,
  ): Promise<Notification> {
    return this.create({
      userId: teacherId,
      type: NotificationType.NEW_STUDENT,
      title: 'Học viên mới đăng ký',
      message: `${studentName} đã đăng ký khóa học "${courseName}" của bạn`,
      link: `/teacher/students`,
    });
  }

  async notifyNewReview(
    teacherId: string,
    courseName: string,
    rating: number,
  ): Promise<Notification> {
    return this.create({
      userId: teacherId,
      type: NotificationType.NEW_REVIEW,
      title: 'Đánh giá mới',
      message: `Khóa học "${courseName}" nhận được đánh giá ${rating}★ mới`,
      link: `/teacher/reviews`,
    });
  }

  async notifyCourseApproved(
    teacherId: string,
    courseName: string,
    courseId: string,
  ): Promise<Notification> {
    return this.create({
      userId: teacherId,
      type: NotificationType.COURSE_APPROVED,
      title: 'Khóa học được duyệt',
      message: `Khóa học "${courseName}" đã được admin phê duyệt và xuất bản`,
      link: `/teacher/courses`,
      metadata: { courseId },
    });
  }

  async notifyCourseRejected(
    teacherId: string,
    courseName: string,
    reason: string,
  ): Promise<Notification> {
    return this.create({
      userId: teacherId,
      type: NotificationType.COURSE_REJECTED,
      title: 'Khóa học bị từ chối',
      message: `Khóa học "${courseName}" bị từ chối. Lý do: ${reason}`,
      link: `/teacher/courses`,
    });
  }

  async notifyExamResult(
    userId: string,
    examName: string,
    score: number,
    passed: boolean,
  ): Promise<Notification> {
    return this.create({
      userId,
      type: NotificationType.EXAM_RESULT,
      title: passed ? 'Đạt kết quả bài thi' : 'Kết quả bài thi',
      message: passed
        ? `Chúc mừng! Bạn đã đạt ${score}% trong bài thi "${examName}"`
        : `Bạn đạt ${score}% trong bài thi "${examName}". Hãy cố gắng lần sau!`,
      link: `/exams`,
    });
  }
}
