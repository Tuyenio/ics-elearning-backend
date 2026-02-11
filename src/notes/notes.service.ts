import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import * as XLSX from 'xlsx';
import { Note } from './entities/note.entity';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class NotesService {
  constructor(
    @InjectRepository(Note)
    private readonly noteRepository: Repository<Note>,
  ) {}

  async create(createNoteDto: CreateNoteDto, student: User): Promise<Note> {
    if (!student?.id) {
      throw new Error('Student ID is required');
    }

    const note = new Note();
    Object.assign(note, {
      content: createNoteDto.content ?? null,
      timestamp: createNoteDto.timestamp ?? 0,
      type: createNoteDto.type ?? 'general',
      items: createNoteDto.items ?? null,
      schedule: createNoteDto.schedule ?? null,
      studentId: student.id,
      courseId: createNoteDto.courseId ?? null,
      lessonId: createNoteDto.lessonId ?? null,
    });

    return await this.noteRepository.save(note);
  }

  async findByStudent(studentId: string): Promise<Note[]> {
    return this.noteRepository.find({
      where: { studentId },
      relations: ['course', 'lesson'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByCourse(studentId: string, courseId: string): Promise<Note[]> {
    return this.noteRepository.find({
      where: { studentId, course: { id: courseId } },
      relations: ['lesson'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByLesson(studentId: string, lessonId: string): Promise<Note[]> {
    return this.noteRepository.find({
      where: { studentId, lesson: { id: lessonId } },
      order: { timestamp: 'ASC' },
    });
  }

  async findOne(id: string, userId: string): Promise<Note> {
    const note = await this.noteRepository.findOne({
      where: { id },
      relations: ['course', 'lesson'],
    });

    if (!note) {
      throw new NotFoundException('Ghi chú không tìm thấy');
    }

    if (note.studentId !== userId) {
      throw new ForbiddenException('Truy cập bị từ chối');
    }

    return note;
  }

  async update(
    id: string,
    updateNoteDto: UpdateNoteDto,
    user: User,
  ): Promise<Note> {
    const note = await this.findOne(id, user.id);

    Object.assign(note, updateNoteDto);
    return this.noteRepository.save(note);
  }

  async remove(id: string, user: User): Promise<void> {
    const note = await this.findOne(id, user.id);
    await this.noteRepository.remove(note);
  }

  async exportToExcel(studentId: string): Promise<Buffer> {
    const notes = await this.noteRepository.find({
      where: { studentId },
      relations: ['course', 'lesson'],
      order: { createdAt: 'DESC' },
    });

    // Format data for Excel
    const data = notes.map((note, index) => [
      index + 1,
      note.type === 'general'
        ? 'Ghi chú thường'
        : note.type === 'deadline'
          ? 'Deadline'
          : note.type === 'checklist'
            ? 'Checklist'
            : 'Lịch học',
      note.content
        ? note.content.substring(0, 100)
        : `${note.items?.length || 0} mục` ||
          `${note.schedule?.length || 0} lịch`,
      note.course?.title || '-',
      note.lesson?.title || '-',
      new Date(note.createdAt).toLocaleDateString('vi-VN'),
      new Date(note.updatedAt).toLocaleDateString('vi-VN'),
    ]);

    // Build array of arrays: banner + empty row + headers + data
    const aoa = [
      ['GHI CHÚ CỦA BẠN TẠI ICS LEARNING'],
      [`Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}`],
      [],
      [
        'STT',
        'Loại',
        'Ghi chú',
        'Khóa học',
        'Bài học',
        'Ngày tạo',
        'Lần chỉnh sửa gần nhất',
      ],
      ...data,
    ];

    // Create worksheet from array of arrays
    const worksheet = XLSX.utils.aoa_to_sheet(aoa);

    // Set column widths
    worksheet['!cols'] = [
      { wch: 5 },
      { wch: 15 },
      { wch: 35 },
      { wch: 25 },
      { wch: 25 },
      { wch: 15 },
      { wch: 15 },
    ];

    // Merge cells for header banner
    worksheet['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }, // Banner spans all columns
    ];

    // Apply styling to banner (row 0)
    for (let c = 0; c <= 6; c++) {
      const cell = XLSX.utils.encode_cell({ r: 0, c });
      worksheet[cell] = {
        ...worksheet[cell],
        s: {
          font: { bold: true, size: 14, color: { rgb: 'FFFFFF' } },
          fill: { fgColor: { rgb: '1F4788' } },
          alignment: { horizontal: 'center', vertical: 'center' },
        },
      };
    }

    // Style row 1 (date info)
    for (let c = 0; c <= 6; c++) {
      const cell = XLSX.utils.encode_cell({ r: 1, c });
      if (worksheet[cell]) {
        worksheet[cell].s = {
          font: { size: 10, italic: true },
          fill: { fgColor: { rgb: 'E7E6E6' } },
        };
      }
    }

    // Style header row (row 3)
    const headers = [
      'STT',
      'Loại',
      'Ghi chú',
      'Khóa học',
      'Bài học',
      'Ngày tạo',
      'Lần chỉnh sửa gần nhất',
    ];
    for (let c = 0; c < headers.length; c++) {
      const cell = XLSX.utils.encode_cell({ r: 3, c });
      worksheet[cell] = {
        v: headers[c],
        s: {
          font: { bold: true, color: { rgb: 'FFFFFF' } },
          fill: { fgColor: { rgb: '4472C4' } },
          alignment: { horizontal: 'center', vertical: 'center' },
          border: {
            top: { style: 'thin', color: { rgb: '000000' } },
            bottom: { style: 'thin', color: { rgb: '000000' } },
            left: { style: 'thin', color: { rgb: '000000' } },
            right: { style: 'thin', color: { rgb: '000000' } },
          },
        },
      };
    }

    // Style data rows with alternating colors
    data.forEach((row, rowIndex) => {
      const isEvenRow = rowIndex % 2 === 0;
      row.forEach((cell, colIndex) => {
        const cellRef = XLSX.utils.encode_cell({
          r: 4 + rowIndex,
          c: colIndex,
        });
        worksheet[cellRef] = {
          v: cell,
          s: {
            fill: { fgColor: { rgb: isEvenRow ? 'F2F2F2' : 'FFFFFF' } },
            alignment: {
              horizontal: 'left',
              vertical: 'center',
              wrapText: true,
            },
            border: {
              top: { style: 'thin', color: { rgb: 'CCCCCC' } },
              bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
              left: { style: 'thin', color: { rgb: 'CCCCCC' } },
              right: { style: 'thin', color: { rgb: 'CCCCCC' } },
            },
          },
        };
      });
    });

    // Create workbook and add worksheet
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Ghi chú');

    // Generate Excel file as buffer
    return XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
  }

  async exportSingleNoteToExcel(
    noteId: string,
    studentId: string,
  ): Promise<Buffer> {
    const note = await this.findOne(noteId, studentId);

    if (!note) {
      throw new NotFoundException('Ghi chú không tìm thấy');
    }

    let noteTypeLabel = '';
    let data: any[] = [];
    let headers: string[] = [];

    // Format data based on type
    if (note.type === 'general') {
      noteTypeLabel = 'Ghi chú thường';
      headers = [
        'Tiêu đề',
        'Nội dung',
        'Khóa học',
        'Bài học',
        'Ngày tạo',
        'Lần chỉnh sửa gần nhất',
      ];
      data = [
        [
          note.content?.split('\n')[0] || 'Ghi chú',
          note.content?.substring(0, 500) || '',
          note.course?.title || '-',
          note.lesson?.title || '-',
          new Date(note.createdAt).toLocaleDateString('vi-VN'),
          new Date(note.updatedAt).toLocaleDateString('vi-VN'),
        ],
      ];
    } else if (note.type === 'deadline' || note.type === 'checklist') {
      noteTypeLabel =
        note.type === 'deadline' ? 'Deadline Tracker' : 'Checklist';
      headers = ['STT', 'Tiêu đề', 'Deadline', 'Mức độ ưu tiên', 'Hoàn thành'];
      data = (note.items || []).map((item, idx) => [
        idx + 1,
        item.title,
        item.deadline || '-',
        item.priority || '-',
        item.completed ? 'Có' : 'Không',
      ]);
    } else if (note.type === 'plan') {
      noteTypeLabel = 'Lịch học / Plan';
      headers = ['STT', 'Ngày', 'Giờ', 'Nội dung'];
      data = (note.schedule || []).map((item, idx) => [
        idx + 1,
        item.date,
        item.time,
        item.content,
      ]);
    }

    // Build array of arrays: banner + empty row + headers + data
    const aoa = [
      ['GHI CHÚ CỦA BẠN TẠI ICS LEARNING'],
      [
        `Loại: ${noteTypeLabel} | Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}`,
      ],
      [],
      headers,
      ...data,
    ];

    // Create worksheet from array of arrays
    const worksheet = XLSX.utils.aoa_to_sheet(aoa);

    // Set column widths based on type
    const colCount = headers.length;
    worksheet['!cols'] = Array(colCount)
      .fill(null)
      .map((_, i) => {
        if (i === 0) return { wch: 5 };
        if (note.type === 'general' && i === 1) return { wch: 30 };
        if (note.type === 'general' && i === 2) return { wch: 35 };
        return { wch: 20 };
      });

    // Merge cells for header banner
    worksheet['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: colCount - 1 } },
    ];

    // Apply styling to banner (row 0)
    for (let c = 0; c < colCount; c++) {
      const cell = XLSX.utils.encode_cell({ r: 0, c });
      worksheet[cell] = {
        ...worksheet[cell],
        s: {
          font: { bold: true, size: 14, color: { rgb: 'FFFFFF' } },
          fill: { fgColor: { rgb: '1F4788' } },
          alignment: { horizontal: 'center', vertical: 'center' },
        },
      };
    }

    // Style row 1 (info)
    for (let c = 0; c < colCount; c++) {
      const cell = XLSX.utils.encode_cell({ r: 1, c });
      if (worksheet[cell]) {
        worksheet[cell].s = {
          font: { size: 10, italic: true },
          fill: { fgColor: { rgb: 'E7E6E6' } },
        };
      }
    }

    // Style header row (row 3)
    for (let c = 0; c < colCount; c++) {
      const cell = XLSX.utils.encode_cell({ r: 3, c });
      worksheet[cell] = {
        v: headers[c],
        s: {
          font: { bold: true, color: { rgb: 'FFFFFF' } },
          fill: { fgColor: { rgb: '4472C4' } },
          alignment: { horizontal: 'center', vertical: 'center' },
          border: {
            top: { style: 'thin', color: { rgb: '000000' } },
            bottom: { style: 'thin', color: { rgb: '000000' } },
            left: { style: 'thin', color: { rgb: '000000' } },
            right: { style: 'thin', color: { rgb: '000000' } },
          },
        },
      };
    }

    // Style data rows with alternating colors
    data.forEach((row, rowIndex) => {
      const isEvenRow = rowIndex % 2 === 0;
      row.forEach((cell, colIndex) => {
        const cellRef = XLSX.utils.encode_cell({
          r: 4 + rowIndex,
          c: colIndex,
        });
        worksheet[cellRef] = {
          v: cell,
          s: {
            fill: { fgColor: { rgb: isEvenRow ? 'F2F2F2' : 'FFFFFF' } },
            alignment: {
              horizontal: 'left',
              vertical: 'center',
              wrapText: true,
            },
            border: {
              top: { style: 'thin', color: { rgb: 'CCCCCC' } },
              bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
              left: { style: 'thin', color: { rgb: 'CCCCCC' } },
              right: { style: 'thin', color: { rgb: 'CCCCCC' } },
            },
          },
        };
      });
    });

    // Create workbook and add worksheet
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Chi tiết');

    // Generate Excel file as buffer
    return XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
  }

  async toggleFavorite(id: string, userId: string): Promise<Note> {
    const note = await this.findOne(id, userId);
    note.isFavorite = !note.isFavorite;
    return this.noteRepository.save(note);
  }

  async findFavorites(studentId: string): Promise<Note[]> {
    return this.noteRepository.find({
      where: { studentId, isFavorite: true },
      relations: ['course', 'lesson'],
      order: { createdAt: 'DESC' },
    });
  }
}
