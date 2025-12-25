import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateResourceDto } from './dto/create-resource.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';
import { Resource } from './entities/resource.entity';

@Injectable()
export class ResourcesService {
  constructor(
    @InjectRepository(Resource)
    private readonly resourceRepo: Repository<Resource>,
  ) {}

  async create(createResourceDto: CreateResourceDto, userId: string) {
    const resource = this.resourceRepo.create({
      ...createResourceDto,
      uploadedBy: userId,
    });
    return this.resourceRepo.save(resource);
  }

  async findByCourse(courseId: string) {
    return this.resourceRepo.find({
      where: { courseId },
      order: { createdAt: 'DESC' },
    });
  }

  async findByLesson(lessonId: string) {
    return this.resourceRepo.find({
      where: { lessonId },
      order: { createdAt: 'DESC' },
    });
  }

  async findPublic() {
    return this.resourceRepo.find({
      where: { isPublic: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string) {
    const resource = await this.resourceRepo.findOne({
      where: { id },
      relations: ['course', 'lesson', 'uploader'],
    });

    if (!resource) {
      throw new NotFoundException(`Tài nguyên với ID ${id} không tìm thấy`);
    }

    return resource;
  }

  async update(id: string, updateResourceDto: UpdateResourceDto) {
    const resource = await this.findOne(id);
    Object.assign(resource, updateResourceDto);
    return this.resourceRepo.save(resource);
  }

  async remove(id: string) {
    const resource = await this.findOne(id);
    await this.resourceRepo.remove(resource);
    return { message: 'Đã xoá tài nguyên thành công' };
  }

  async incrementDownload(id: string) {
    await this.resourceRepo.increment({ id }, 'downloadCount', 1);
    return this.findOne(id);
  }
}
