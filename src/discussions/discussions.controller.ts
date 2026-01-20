import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Req, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { DiscussionsService } from './discussions.service';
import { CreateDiscussionDto } from './dto/create-discussion.dto';
import { UpdateDiscussionDto } from './dto/update-discussion.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('discussions')
@ApiBearerAuth()
@Controller('discussions')
@UseGuards(JwtAuthGuard)
export class DiscussionsController {
  constructor(private readonly discussionsService: DiscussionsService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo thảo luận mới' })
  create(@Body() createDiscussionDto: CreateDiscussionDto, @Req() req: any) {
    return this.discussionsService.create(createDiscussionDto, req.user.userId);
  }

  @Get('course/:courseId')
  @ApiOperation({ summary: 'Lấy thảo luận theo khóa học' })
  findByCourse(@Param('courseId') courseId: string) {
    return this.discussionsService.findByCourse(courseId);
  }

  @Get('lesson/:lessonId')
  @ApiOperation({ summary: 'Lấy thảo luận theo bài học' })
  findByLesson(@Param('lessonId') lessonId: string) {
    return this.discussionsService.findByLesson(lessonId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết thảo luận' })
  findOne(@Param('id') id: string) {
    return this.discussionsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật thảo luận' })
  async update(@Param('id') id: string, @Body() updateDiscussionDto: UpdateDiscussionDto, @Req() req: any) {
    // Kiểm tra quyền sở hữu
    const discussion = await this.discussionsService.findOne(id);
    if (discussion.authorId !== req.user.userId) {
      throw new ForbiddenException('Bạn không có quyền chỉnh sửa thảo luận này');
    }
    return this.discussionsService.update(id, updateDiscussionDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa thảo luận' })
  async remove(@Param('id') id: string, @Req() req: any) {
    // Kiểm tra quyền sở hữu
    const discussion = await this.discussionsService.findOne(id);
    if (discussion.authorId !== req.user.userId) {
      throw new ForbiddenException('Bạn không có quyền xóa thảo luận này');
    }
    return this.discussionsService.remove(id);
  }

  @Post(':id/reply')
  @ApiOperation({ summary: 'Trả lời thảo luận' })
  createReply(
    @Param('id') id: string,
    @Body() createDiscussionDto: CreateDiscussionDto,
    @Req() req: any,
  ) {
    return this.discussionsService.createReply(id, createDiscussionDto, req.user.userId);
  }

  @Patch(':id/resolve')
  @ApiOperation({ summary: 'Đánh dấu thảo luận đã giải quyết' })
  toggleResolved(@Param('id') id: string) {
    return this.discussionsService.toggleResolved(id);
  }

  @Patch(':id/pin')
  @ApiOperation({ summary: 'Ghim/bỏ ghim thảo luận' })
  togglePinned(@Param('id') id: string) {
    return this.discussionsService.togglePinned(id);
  }
}
