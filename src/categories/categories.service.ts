import { Injectable, NotFoundException, ConflictException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
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
    return this.categoryRepository.find({
      relations: ['courses'],
      order: { order: 'ASC', name: 'ASC' },
    });
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

    return category;
  }

  async findBySlug(slug: string): Promise<Category> {
    const category = await this.categoryRepository.findOne({
      where: { slug },
      relations: ['courses'],
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

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
  return this.categoryRepository.save(category);
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
