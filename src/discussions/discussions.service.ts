import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { CreateDiscussionDto } from './dto/create-discussion.dto';
import { UpdateDiscussionDto } from './dto/update-discussion.dto';
import { Discussion } from './entities/discussion.entity';

@Injectable()
export class DiscussionsService {
  constructor(
    @InjectRepository(Discussion)
    private readonly discussionRepo: Repository<Discussion>,
  ) {}

  async create(createDiscussionDto: CreateDiscussionDto, userId: string) {
    const discussion = this.discussionRepo.create({
      ...createDiscussionDto,
      authorId: userId,
    });
    return this.discussionRepo.save(discussion);
  }

  async findByCourse(courseId: string) {
    return this.discussionRepo.find({
      where: { courseId, parentId: IsNull() },
      relations: ['author', 'replies'],
      order: { isPinned: 'DESC', createdAt: 'DESC' },
    });
  }

  async findByLesson(lessonId: string) {
    return this.discussionRepo.find({
      where: { lessonId, parentId: IsNull() },
      relations: ['author', 'replies'],
      order: { isPinned: 'DESC', createdAt: 'DESC' },
    });
  }

  async findOne(id: string) {
    const discussion = await this.discussionRepo.findOne({
      where: { id },
      relations: ['author', 'replies', 'replies.author'],
    });

    if (!discussion) {
      throw new NotFoundException(`Cuộc thảo luận với ID ${id} không tìm thấy`);
    }

    return discussion;
  }

  async update(id: string, updateDiscussionDto: UpdateDiscussionDto) {
    const discussion = await this.findOne(id);
    Object.assign(discussion, updateDiscussionDto);
    return this.discussionRepo.save(discussion);
  }

  async remove(id: string) {
    const discussion = await this.findOne(id);
    await this.discussionRepo.remove(discussion);
    return { message: 'Đã xoá cuộc thảo luận thành công' };
  }

  async createReply(parentId: string, createDiscussionDto: CreateDiscussionDto, userId: string) {
    const parent = await this.findOne(parentId);
    
    const reply = this.discussionRepo.create({
      ...createDiscussionDto,
      parentId,
      courseId: parent.courseId,
      lessonId: parent.lessonId,
      authorId: userId,
    });

    await this.discussionRepo.save(reply);
    await this.discussionRepo.increment({ id: parentId }, 'replyCount', 1);

    return reply;
  }

  async toggleResolved(id: string) {
    const discussion = await this.findOne(id);
    discussion.isResolved = !discussion.isResolved;
    return this.discussionRepo.save(discussion);
  }

  async togglePinned(id: string) {
    const discussion = await this.findOne(id);
    discussion.isPinned = !discussion.isPinned;
    return this.discussionRepo.save(discussion);
  }
}
