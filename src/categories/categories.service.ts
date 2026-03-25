import {
  Injectable,
  NotFoundException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity';
import { Course } from '../courses/entities/course.entity';
import { EnrollmentStatus } from '../enrollments/entities/enrollment.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
  ) {}

  async create(createCategoryDto: CreateCategoryDto): Promise<Category> {
    const slug =
      createCategoryDto.slug || this.generateSlug(createCategoryDto.name);

    const existingCategory = await this.categoryRepository.findOne({
      where: [{ name: createCategoryDto.name }, { slug }],
    });

    if (existingCategory) {
      throw new ConflictException('Danh mục với tên hoặc slug này đã tồn tại');
    }

    const category = this.categoryRepository.create({
      ...createCategoryDto,
      slug,
    });

    const saved = await this.categoryRepository.save(category);

    await this.cacheManager.del('categories_all');
    await this.cacheManager.del('categories_active');

    return saved;
  }

  async findAll(): Promise<Category[]> {
    const categories = await this.categoryRepository.find({
      relations: ['courses'],
      order: { order: 'ASC', name: 'ASC' },
    });

    if (categories.length === 0) {
      return categories;
    }

    const categoryIds = categories.map((category) => category.id);
    const rows = await this.courseRepository
      .createQueryBuilder('course')
      .leftJoin('course.enrollments', 'enrollment')
      .select('course.categoryId', 'categoryId')
      .addSelect('COUNT(enrollment.id)', 'count')
      .where('course.categoryId IN (:...categoryIds)', { categoryIds })
      .andWhere('enrollment.status IN (:...statuses)', {
        statuses: [EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED],
      })
      .groupBy('course.categoryId')
      .getRawMany<{ categoryId: string; count: string }>();

    const studentCountMap = new Map<string, number>(
      rows.map((row) => [row.categoryId, Number(row.count || 0)]),
    );

    return categories.map((category) => ({
      ...category,
      students: studentCountMap.get(category.id) ?? 0,
    }));
  }

  async findActive(): Promise<Category[]> {
    return this.categoryRepository.find({
      where: { isActive: true },
      order: { order: 'ASC', name: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Category> {
    const category = await this.categoryRepository.findOne({
      where: { id },
      relations: ['courses'],
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return this.withActualEnrollmentCounts(category);
  }

  async findBySlug(slug: string): Promise<Category> {
    const category = await this.categoryRepository.findOne({
      where: { slug },
      relations: ['courses'],
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return this.withActualEnrollmentCounts(category);
  }

  private async withActualEnrollmentCounts(category: Category): Promise<Category> {
    const courses = category.courses ?? [];
    if (courses.length === 0) {
      return category;
    }

    const courseIds = courses.map((course) => course.id);
    const rows = await this.courseRepository
      .createQueryBuilder('course')
      .leftJoin('course.enrollments', 'enrollment')
      .select('course.id', 'courseId')
      .addSelect('COUNT(enrollment.id)', 'count')
      .where('course.id IN (:...courseIds)', { courseIds })
      .andWhere('enrollment.status IN (:...statuses)', {
        statuses: [EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED],
      })
      .groupBy('course.id')
      .getRawMany<{ courseId: string; count: string }>();

    const countMap = new Map<string, number>(
      rows.map((row) => [row.courseId, Number(row.count || 0)]),
    );

    category.courses = courses.map((course) => ({
      ...course,
      enrollmentCount: countMap.get(course.id) ?? 0,
    }));

    return category;
  }

  async update(
    id: string,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<Category> {
    const category = await this.findOne(id);

    if (updateCategoryDto.name && updateCategoryDto.name !== category.name) {
      const existingCategory = await this.categoryRepository.findOne({
        where: { name: updateCategoryDto.name },
      });

      if (existingCategory && existingCategory.id !== id) {
        throw new ConflictException('Danh mục với tên này đã tồn tại');
      }
    }

    if (updateCategoryDto.slug && updateCategoryDto.slug !== category.slug) {
      const existingCategory = await this.categoryRepository.findOne({
        where: { slug: updateCategoryDto.slug },
      });

      if (existingCategory && existingCategory.id !== id) {
        throw new ConflictException('Danh mục với slug này đã tồn tại');
      }
    }

    // ✅ giữ toàn bộ dữ liệu cũ, chỉ update field được gửi lên
    Object.assign(category, updateCategoryDto);

    const updatedCategory = await this.categoryRepository.save(category);

    // ✅ clear cache để FE refresh thấy ngay
    await this.cacheManager.del('categories_all');
    await this.cacheManager.del('categories_active');
    return updatedCategory;
  }

  async remove(id: string): Promise<void> {
    const category = await this.findOne(id);
    await this.categoryRepository.remove(category);

    await this.cacheManager.del('categories_all');
    await this.cacheManager.del('categories_active');
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
