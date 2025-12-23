import { Injectable, Logger } from '@nestjs/common';

// Type definition for PDFKit document
type PDFDocumentType = any;

export interface CertificateData {
  recipientName: string;
  courseName: string;
  instructorName: string;
  completionDate: Date;
  certificateNumber: string;
  grade?: number;
  duration?: number; // in hours
}

@Injectable()
export class CertificatePdfService {
  private readonly logger = new Logger(CertificatePdfService.name);

  async generateCertificate(data: CertificateData): Promise<Buffer> {
    // Dynamic import of pdfkit
    const PDFDocument = (await import('pdfkit')).default;
    
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          layout: 'landscape',
          size: 'A4',
          margin: 0,
        });

        const buffers: Buffer[] = [];
        doc.on('data', (chunk: Buffer) => buffers.push(chunk));
        doc.on('end', () => {
          const pdfData = Buffer.concat(buffers);
          resolve(pdfData);
        });
        doc.on('error', reject);

        // Page dimensions
        const width = doc.page.width;
        const height = doc.page.height;

        // Background gradient effect (using rectangles)
        this.drawBackground(doc, width, height);

        // Border design
        this.drawBorder(doc, width, height);

        // Header section
        this.drawHeader(doc, width);

        // Certificate title
        this.drawTitle(doc, width);

        // Recipient name
        this.drawRecipientName(doc, width, data.recipientName);

        // Course completed text
        this.drawCompletionText(doc, width, data.courseName);

        // Details section
        this.drawDetails(doc, width, data);

        // Signatures section
        this.drawSignatures(doc, width, height, data.instructorName);

        // Footer
        this.drawFooter(doc, width, height, data.certificateNumber);

        doc.end();
      } catch (error) {
        this.logger.error('Error generating certificate PDF', error);
        reject(error);
      }
    });
  }

  private drawBackground(doc: PDFDocumentType, width: number, height: number): void {
    // Light cream background
    doc.rect(0, 0, width, height).fill('#FFFEF5');

    // Decorative corners
    const cornerSize = 100;
    
    // Top left corner
    doc.save();
    doc.moveTo(0, 0)
       .lineTo(cornerSize, 0)
       .lineTo(0, cornerSize)
       .closePath()
       .fill('#2563EB');
    doc.restore();

    // Top right corner
    doc.save();
    doc.moveTo(width, 0)
       .lineTo(width - cornerSize, 0)
       .lineTo(width, cornerSize)
       .closePath()
       .fill('#2563EB');
    doc.restore();

    // Bottom left corner
    doc.save();
    doc.moveTo(0, height)
       .lineTo(cornerSize, height)
       .lineTo(0, height - cornerSize)
       .closePath()
       .fill('#2563EB');
    doc.restore();

    // Bottom right corner
    doc.save();
    doc.moveTo(width, height)
       .lineTo(width - cornerSize, height)
       .lineTo(width, height - cornerSize)
       .closePath()
       .fill('#2563EB');
    doc.restore();
  }

  private drawBorder(doc: PDFDocumentType, width: number, height: number): void {
    const margin = 30;
    const innerMargin = 40;

    // Outer border
    doc.rect(margin, margin, width - 2 * margin, height - 2 * margin)
       .lineWidth(3)
       .stroke('#1E40AF');

    // Inner border
    doc.rect(innerMargin, innerMargin, width - 2 * innerMargin, height - 2 * innerMargin)
       .lineWidth(1)
       .stroke('#60A5FA');

    // Decorative lines
    doc.moveTo(margin + 20, margin + 60)
       .lineTo(width - margin - 20, margin + 60)
       .lineWidth(0.5)
       .stroke('#93C5FD');
  }

  private drawHeader(doc: PDFDocumentType, width: number): void {
    // Logo placeholder (circular)
    const logoX = width / 2;
    const logoY = 80;
    const logoRadius = 35;

    doc.circle(logoX, logoY, logoRadius)
       .fill('#2563EB');

    // Logo text
    doc.font('Helvetica-Bold')
       .fontSize(24)
       .fillColor('#FFFFFF')
       .text('ICS', logoX - 18, logoY - 10, { width: 40, align: 'center' });

    // Organization name
    doc.font('Helvetica-Bold')
       .fontSize(14)
       .fillColor('#1E40AF')
       .text('ICS E-LEARNING PLATFORM', 0, logoY + 45, { width, align: 'center' });
  }

  private drawTitle(doc: PDFDocumentType, width: number): void {
    doc.font('Helvetica-Bold')
       .fontSize(42)
       .fillColor('#1E3A8A')
       .text('CERTIFICATE', 0, 155, { width, align: 'center' });

    doc.font('Helvetica')
       .fontSize(18)
       .fillColor('#3B82F6')
       .text('OF COMPLETION', 0, 200, { width, align: 'center' });

    // Decorative line under title
    const lineY = 235;
    const lineWidth = 200;
    doc.moveTo(width / 2 - lineWidth / 2, lineY)
       .lineTo(width / 2 + lineWidth / 2, lineY)
       .lineWidth(2)
       .stroke('#60A5FA');
  }

  private drawRecipientName(doc: PDFDocumentType, width: number, name: string): void {
    doc.font('Helvetica')
       .fontSize(12)
       .fillColor('#64748B')
       .text('This is to certify that', 0, 260, { width, align: 'center' });

    doc.font('Helvetica-Bold')
       .fontSize(32)
       .fillColor('#1E293B')
       .text(name, 0, 285, { width, align: 'center' });

    // Underline for name
    const nameWidth = doc.widthOfString(name);
    const underlineY = 325;
    doc.moveTo(width / 2 - nameWidth / 2 - 20, underlineY)
       .lineTo(width / 2 + nameWidth / 2 + 20, underlineY)
       .lineWidth(1)
       .stroke('#CBD5E1');
  }

  private drawCompletionText(doc: PDFDocumentType, width: number, courseName: string): void {
    doc.font('Helvetica')
       .fontSize(12)
       .fillColor('#64748B')
       .text('has successfully completed the course', 0, 345, { width, align: 'center' });

    doc.font('Helvetica-Bold')
       .fontSize(24)
       .fillColor('#2563EB')
       .text(`"${courseName}"`, 60, 370, { width: width - 120, align: 'center' });
  }

  private drawDetails(doc: PDFDocumentType, width: number, data: CertificateData): void {
    const detailsY = 420;
    const colWidth = width / 3;

    // Grade (if provided)
    if (data.grade !== undefined) {
      doc.font('Helvetica')
         .fontSize(10)
         .fillColor('#64748B')
         .text('Grade', 0, detailsY, { width: colWidth, align: 'center' });
      
      doc.font('Helvetica-Bold')
         .fontSize(16)
         .fillColor('#1E293B')
         .text(`${data.grade}%`, 0, detailsY + 15, { width: colWidth, align: 'center' });
    }

    // Completion date
    doc.font('Helvetica')
       .fontSize(10)
       .fillColor('#64748B')
       .text('Date of Completion', colWidth, detailsY, { width: colWidth, align: 'center' });
    
    doc.font('Helvetica-Bold')
       .fontSize(16)
       .fillColor('#1E293B')
       .text(this.formatDate(data.completionDate), colWidth, detailsY + 15, { width: colWidth, align: 'center' });

    // Duration (if provided)
    if (data.duration !== undefined) {
      doc.font('Helvetica')
         .fontSize(10)
         .fillColor('#64748B')
         .text('Duration', colWidth * 2, detailsY, { width: colWidth, align: 'center' });
      
      doc.font('Helvetica-Bold')
         .fontSize(16)
         .fillColor('#1E293B')
         .text(`${data.duration} hours`, colWidth * 2, detailsY + 15, { width: colWidth, align: 'center' });
    }
  }

  private drawSignatures(doc: PDFDocumentType, width: number, height: number, instructorName: string): void {
    const signatureY = height - 120;
    const leftSigX = width * 0.25;
    const rightSigX = width * 0.75;
    const sigWidth = 180;

    // Left signature (Instructor)
    doc.moveTo(leftSigX - sigWidth / 2, signatureY)
       .lineTo(leftSigX + sigWidth / 2, signatureY)
       .lineWidth(1)
       .stroke('#CBD5E1');

    doc.font('Helvetica-Bold')
       .fontSize(12)
       .fillColor('#1E293B')
       .text(instructorName, leftSigX - sigWidth / 2, signatureY + 8, { width: sigWidth, align: 'center' });

    doc.font('Helvetica')
       .fontSize(10)
       .fillColor('#64748B')
       .text('Course Instructor', leftSigX - sigWidth / 2, signatureY + 25, { width: sigWidth, align: 'center' });

    // Right signature (Platform Director)
    doc.moveTo(rightSigX - sigWidth / 2, signatureY)
       .lineTo(rightSigX + sigWidth / 2, signatureY)
       .lineWidth(1)
       .stroke('#CBD5E1');

    doc.font('Helvetica-Bold')
       .fontSize(12)
       .fillColor('#1E293B')
       .text('ICS Academy', rightSigX - sigWidth / 2, signatureY + 8, { width: sigWidth, align: 'center' });

    doc.font('Helvetica')
       .fontSize(10)
       .fillColor('#64748B')
       .text('Platform Director', rightSigX - sigWidth / 2, signatureY + 25, { width: sigWidth, align: 'center' });
  }

  private drawFooter(doc: PDFDocumentType, width: number, height: number, certificateNumber: string): void {
    const footerY = height - 50;

    // Certificate number
    doc.font('Helvetica')
       .fontSize(9)
       .fillColor('#94A3B8')
       .text(`Certificate ID: ${certificateNumber}`, 0, footerY, { width, align: 'center' });

    // Verification text
    doc.font('Helvetica')
       .fontSize(8)
       .fillColor('#CBD5E1')
       .text('Verify this certificate at: https://ics-elearning.com/verify', 0, footerY + 15, { width, align: 'center' });
  }

  private formatDate(date: Date): string {
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    return new Date(date).toLocaleDateString('en-US', options);
  }

  // Generate a simple certificate for testing
  async generateSimpleCertificate(
    recipientName: string,
    courseName: string,
  ): Promise<Buffer> {
    const certificateNumber = this.generateCertificateNumber();
    
    return this.generateCertificate({
      recipientName,
      courseName,
      instructorName: 'ICS Team',
      completionDate: new Date(),
      certificateNumber,
      grade: 100,
      duration: 10,
    });
  }

  private generateCertificateNumber(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `ICS-${timestamp}-${random}`;
  }
}
