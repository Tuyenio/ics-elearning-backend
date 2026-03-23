import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Script seed dữ liệu mẫu mới hoàn toàn cho hệ thống ICS E-Learning.
 *
 * Chức năng:
 *   1. Xoá sạch toàn bộ dữ liệu cũ trong tất cả bảng (schema learning)
 *   2. Tạo 3 tài khoản: Admin, Giáo viên, Học viên
 *   3. Tạo dữ liệu mẫu chuẩn cho toàn bộ hệ thống
 *
 * Cách chạy:
 *   npx ts-node -r tsconfig-paths/register src/scripts/seed-fresh-data.ts
 */

const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  synchronize: false,
  logging: false,
  extra: {
    options: '-c search_path=learning,public',
  },
});

// ===================== FIXED UUIDs =====================
const ADMIN_ID = 'a0000000-0000-0000-0000-000000000001';
const TEACHER_ID = 'b0000000-0000-0000-0000-000000000001';
const STUDENT_ID = 'c0000000-0000-0000-0000-000000000001';

const CAT_WEB_ID = 'd0000000-0000-0000-0000-000000000001';
const CAT_AI_ID = 'd0000000-0000-0000-0000-000000000002';
const CAT_MOBILE_ID = 'd0000000-0000-0000-0000-000000000003';
const CAT_DATA_ID = 'd0000000-0000-0000-0000-000000000004';
const CAT_DEVOPS_ID = 'd0000000-0000-0000-0000-000000000005';
const CAT_UIUX_ID = 'd0000000-0000-0000-0000-000000000006';

const COURSE1_ID = 'e0000000-0000-0000-0000-000000000001'; // Next.js
const COURSE2_ID = 'e0000000-0000-0000-0000-000000000002'; // Python AI
const COURSE3_ID = 'e0000000-0000-0000-0000-000000000003'; // React Native
const COURSE4_ID = 'e0000000-0000-0000-0000-000000000004'; // Docker & K8s
const COURSE5_ID = 'e0000000-0000-0000-0000-000000000005'; // Data Science

// Lessons for Course 1 (Next.js) - 10 bài
const L1_01 = 'f1000000-0000-0000-0000-000000000001';
const L1_02 = 'f1000000-0000-0000-0000-000000000002';
const L1_03 = 'f1000000-0000-0000-0000-000000000003';
const L1_04 = 'f1000000-0000-0000-0000-000000000004';
const L1_05 = 'f1000000-0000-0000-0000-000000000005';
const L1_06 = 'f1000000-0000-0000-0000-000000000006';
const L1_07 = 'f1000000-0000-0000-0000-000000000007';
const L1_08 = 'f1000000-0000-0000-0000-000000000008';
const L1_09 = 'f1000000-0000-0000-0000-000000000009';
const L1_10 = 'f1000000-0000-0000-0000-000000000010';

// Lessons for Course 2 (Python AI)
const L2_01 = 'f2000000-0000-0000-0000-000000000001';
const L2_02 = 'f2000000-0000-0000-0000-000000000002';
const L2_03 = 'f2000000-0000-0000-0000-000000000003';
const L2_04 = 'f2000000-0000-0000-0000-000000000004';
const L2_05 = 'f2000000-0000-0000-0000-000000000005';
const L2_06 = 'f2000000-0000-0000-0000-000000000006';
const L2_07 = 'f2000000-0000-0000-0000-000000000007';
const L2_08 = 'f2000000-0000-0000-0000-000000000008';

// Lessons for Course 3 (React Native)
const L3_01 = 'f3000000-0000-0000-0000-000000000001';
const L3_02 = 'f3000000-0000-0000-0000-000000000002';
const L3_03 = 'f3000000-0000-0000-0000-000000000003';
const L3_04 = 'f3000000-0000-0000-0000-000000000004';
const L3_05 = 'f3000000-0000-0000-0000-000000000005';
const L3_06 = 'f3000000-0000-0000-0000-000000000006';

// Lessons for Course 4 (Docker & K8s)
const L4_01 = 'f4000000-0000-0000-0000-000000000001';
const L4_02 = 'f4000000-0000-0000-0000-000000000002';
const L4_03 = 'f4000000-0000-0000-0000-000000000003';
const L4_04 = 'f4000000-0000-0000-0000-000000000004';
const L4_05 = 'f4000000-0000-0000-0000-000000000005';
const L4_06 = 'f4000000-0000-0000-0000-000000000006';

// Lessons for Course 5 (Data Science)
const L5_01 = 'f5000000-0000-0000-0000-000000000001';
const L5_02 = 'f5000000-0000-0000-0000-000000000002';
const L5_03 = 'f5000000-0000-0000-0000-000000000003';
const L5_04 = 'f5000000-0000-0000-0000-000000000004';
const L5_05 = 'f5000000-0000-0000-0000-000000000005';
const L5_06 = 'f5000000-0000-0000-0000-000000000006';

// Enrollments
const ENROLL1_ID = 'ee000000-0000-0000-0000-000000000001'; // student → course1
const ENROLL2_ID = 'ee000000-0000-0000-0000-000000000002'; // student → course2
const ENROLL3_ID = 'ee000000-0000-0000-0000-000000000003'; // student → course3

// Quizzes
const QUIZ1_ID = 'aa000000-0000-0000-0000-000000000001'; // quiz course1
const QUIZ2_ID = 'aa000000-0000-0000-0000-000000000002'; // quiz course2

// Exams
const EXAM1_ID = 'ab000000-0000-0000-0000-000000000001';
const EXAM2_ID = 'ab000000-0000-0000-0000-000000000002';

// Certificate Templates
const CERT_TPL1_ID = 'ac000000-0000-0000-0000-000000000001';

// Certificates
const CERT1_ID = 'ad000000-0000-0000-0000-000000000001';

// Assignments
const ASSIGN1_ID = 'ae000000-0000-0000-0000-000000000001';
const ASSIGN2_ID = 'ae000000-0000-0000-0000-000000000002';

// Coupons
const COUPON1_ID = 'af000000-0000-0000-0000-000000000001';
const COUPON2_ID = 'af000000-0000-0000-0000-000000000002';

// Password hash for "12345678@Ab" with bcrypt salt=12
const PASSWORD_HASH =
  '$2b$12$kSEz7E8I/f.UmlyZkvMvreXzw8cnUlr9AyXLTyFF8xyxQHh2EkSli';

const NOW = '2026-03-05T00:00:00.000Z';

async function seedFreshData() {
  console.log('🚀 Bắt đầu xoá sạch và tạo lại dữ liệu mẫu...\n');

  await AppDataSource.initialize();
  console.log('✅ Đã kết nối database\n');

  const qr = AppDataSource.createQueryRunner();
  await qr.connect();

  try {
    await qr.query('SET search_path TO learning, public');
    // Tắt FK check
    await qr.query('SET session_replication_role = replica');

    // ===============================
    // BƯỚC 1: XOÁ SẠCH TOÀN BỘ DỮ LIỆU
    // ===============================
    console.log('🗑️  Đang xoá toàn bộ dữ liệu...');
    const tablesToClear = [
      'user_sessions',
      'two_factor_auth',
      'wishlists',
      'cart',
      'coupons',
      'notifications',
      'notes',
      'resources',
      'assignment_submissions',
      'assignments',
      'discussions',
      'announcements',
      'reviews',
      'exam_attempts',
      'exams',
      'quiz_attempts',
      'quizzes',
      'certificates',
      'certificate_templates',
      'lesson_progress',
      'payments',
      'enrollments',
      'lessons',
      'courses',
      'schedule_items',
      'system_settings',
      'categories',
      'users',
    ];
    for (const table of tablesToClear) {
      await qr.query(`DELETE FROM "learning"."${table}"`);
    }
    // Reset sequence cho system_settings
    await qr.query(
      `SELECT setval(pg_get_serial_sequence('"learning"."system_settings"', 'id'), 1, false)`,
    );
    console.log('✅ Đã xoá sạch toàn bộ dữ liệu\n');

    // ===============================
    // BƯỚC 2: TẠO 3 TÀI KHOẢN USER
    // ===============================
    console.log('👤 Đang tạo 3 tài khoản...');
    await qr.query(`
      INSERT INTO "learning"."users" ("id","email","password","name","phone","avatar","role","status","bio","dateOfBirth","address","emailVerified","emailVerifiedAt","createdAt","updatedAt")
      VALUES
        ('${ADMIN_ID}','tt98tuyen@gmail.com','${PASSWORD_HASH}','Nguyễn Văn Tuyến','0987654321','/avatars/admin.jpg','admin','active','Quản trị viên hệ thống ICS Learning. Phụ trách quản lý toàn bộ nền tảng, phê duyệt khóa học và giảng viên.','1998-03-15','Hà Nội, Việt Nam',true,'${NOW}','${NOW}','${NOW}'),
        ('${TEACHER_ID}','nguyenngoctuyen11032003@gmail.com','${PASSWORD_HASH}','Nguyễn Ngọc Tuyên','0912345678','/avatars/teacher.jpg','teacher','active','Giảng viên chuyên nghiệp với 8+ năm kinh nghiệm trong lĩnh vực lập trình Web, AI và Mobile. Đã đào tạo hơn 10.000 học viên.','2003-03-11','TP. Hồ Chí Minh, Việt Nam',true,'${NOW}','${NOW}','${NOW}'),
        ('${STUDENT_ID}','nntuyen1132003@gmail.com','${PASSWORD_HASH}','Nguyễn Ngọc Tuyên','0909123456','/avatars/student.jpg','student','active','Sinh viên năm 3 ngành Công nghệ Thông tin. Đam mê học lập trình và phát triển phần mềm.','2003-11-03','Đà Nẵng, Việt Nam',true,'${NOW}','${NOW}','${NOW}')
    `);
    console.log('✅ Đã tạo 3 tài khoản (Admin, Giáo viên, Học viên)\n');

    // ===============================
    // BƯỚC 3: CATEGORIES (6 danh mục)
    // ===============================
    console.log('📂 Đang tạo danh mục...');
    await qr.query(`
      INSERT INTO "learning"."categories" ("id","name","slug","description","icon","image","order","isActive","createdAt","updatedAt")
      VALUES
        ('${CAT_WEB_ID}','Lập trình Web','lap-trinh-web','Học lập trình web từ cơ bản đến nâng cao với HTML, CSS, JavaScript, React, Next.js, Node.js','💻',null,1,true,'${NOW}','${NOW}'),
        ('${CAT_AI_ID}','AI & Machine Learning','ai-machine-learning','Khóa học về Trí tuệ nhân tạo, Machine Learning, Deep Learning, NLP','🤖',null,2,true,'${NOW}','${NOW}'),
        ('${CAT_MOBILE_ID}','Mobile Development','mobile-development','Phát triển ứng dụng di động với React Native, Flutter, Swift, Kotlin','📱',null,3,true,'${NOW}','${NOW}'),
        ('${CAT_DATA_ID}','Data Science','data-science','Khoa học dữ liệu, phân tích dữ liệu, Big Data, SQL, Python','📊',null,4,true,'${NOW}','${NOW}'),
        ('${CAT_DEVOPS_ID}','DevOps & Cloud','devops-cloud','Docker, Kubernetes, CI/CD, AWS, Azure, GCP','☁️',null,5,true,'${NOW}','${NOW}'),
        ('${CAT_UIUX_ID}','UI/UX Design','ui-ux-design','Thiết kế giao diện người dùng, trải nghiệm người dùng, Figma, Adobe XD','🎨',null,6,true,'${NOW}','${NOW}')
    `);
    console.log('✅ Đã tạo 6 danh mục\n');

    // ===============================
    // BƯỚC 4: SYSTEM SETTINGS (21 cài đặt)
    // ===============================
    console.log('⚙️  Đang tạo cài đặt hệ thống...');
    await qr.query(`
      INSERT INTO "learning"."system_settings" ("id","key","value","site_logo")
      VALUES
        (1,'site_logo','/image/logo-ics.jpg',null),
        (2,'about_ics','ICS Learning là nền tảng học trực tuyến hàng đầu Việt Nam, cung cấp các khóa học chất lượng cao trong lĩnh vực Công nghệ thông tin.',null),
        (3,'mission','Mang đến cơ hội học tập chất lượng cao, dễ tiếp cận cho mọi người, giúp phát triển kỹ năng và sự nghiệp trong lĩnh vực công nghệ.',null),
        (4,'vision','Trở thành nền tảng edtech số 1 Việt Nam, kết nối học viên với các giảng viên hàng đầu.',null),
        (5,'supportEmail','support@icslearning.vn',null),
        (6,'businessEmail','business@icslearning.vn',null),
        (7,'phone','0987654321',null),
        (8,'hotline','1900-6868',null),
        (9,'address','123 Đường Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh, Việt Nam',null),
        (10,'workingHours','Thứ 2 - Thứ 6: 8:00 - 17:00',null),
        (11,'facebook','https://facebook.com/icslearning',null),
        (12,'youtube','https://youtube.com/@icslearning',null),
        (13,'tiktok','https://tiktok.com/@icslearning',null),
        (14,'linkedin','https://linkedin.com/company/icslearning',null),
        (15,'primaryColor','#6366f1',null),
        (16,'secondaryColor','#8b5cf6',null),
        (17,'copyright','© 2026 ICS Learning. Tất cả quyền được bảo lưu.',null),
        (18,'favicon','/image/favicon.ico',null),
        (19,'site_name','ICS Learning',null),
        (20,'site_description','Nền tảng học trực tuyến hàng đầu Việt Nam',null),
        (21,'maintenance_mode','false',null)
    `);
    await qr.query(
      `SELECT setval(pg_get_serial_sequence('"learning"."system_settings"', 'id'), 22, false)`,
    );
    console.log('✅ Đã tạo 21 cài đặt hệ thống\n');

    // ===============================
    // BƯỚC 5: COURSES (5 khóa học)
    // ===============================
    console.log('📚 Đang tạo khóa học...');
    await qr.query(`
      INSERT INTO "learning"."courses" ("id","title","slug","description","shortDescription","thumbnail","previewVideo","price","discountPrice","level","status","rejectionReason","duration","requirements","outcomes","tags","enrollmentCount","rating","reviewCount","isFeatured","isBestseller","teacherId","categoryId","createdAt","updatedAt")
      VALUES
        ('${COURSE1_ID}','Next.js 14 - Xây dựng ứng dụng Web hiện đại','nextjs-14-xay-dung-ung-dung-web-hien-dai','Khóa học toàn diện về Next.js 14 từ cơ bản đến nâng cao. Bạn sẽ học cách xây dựng ứng dụng web full-stack với App Router, Server Components, Server Actions, Authentication, Database integration và deploy lên Vercel. Khóa học bao gồm nhiều dự án thực tế giúp bạn nắm vững kiến thức.','Học Next.js 14 từ A-Z với các dự án thực tế','/image/courses/nextjs.jpg','https://www.youtube.com/watch?v=example1',799000,599000,'intermediate','published',null,2400,'HTML, CSS, JavaScript cơ bản; Kiến thức React cơ bản; Node.js cơ bản','Xây dựng ứng dụng web full-stack với Next.js 14; Sử dụng App Router và Server Components; Tích hợp authentication và database; Deploy ứng dụng lên production','nextjs,react,web,fullstack',1,5.0,1,true,true,'${TEACHER_ID}','${CAT_WEB_ID}','${NOW}','${NOW}'),

        ('${COURSE2_ID}','Python cho AI & Machine Learning','python-ai-machine-learning','Khóa học chuyên sâu về Python ứng dụng trong AI và Machine Learning. Từ cơ bản Python đến các thuật toán ML nâng cao, Deep Learning với TensorFlow và PyTorch. Bao gồm các dự án thực tế như nhận dạng hình ảnh, xử lý ngôn ngữ tự nhiên.','Khóa học Python AI/ML từ zero đến hero','/image/courses/python-ai.jpg','https://www.youtube.com/watch?v=example2',999000,799000,'advanced','published',null,3600,'Kiến thức toán cơ bản (đại số tuyến tính, xác suất); Biết lập trình cơ bản','Nắm vững Python cho Data Science; Hiểu và triển khai các thuật toán ML; Xây dựng mô hình Deep Learning; Làm dự án AI thực tế','python,ai,machine-learning,deep-learning',1,4.0,1,true,false,'${TEACHER_ID}','${CAT_AI_ID}','${NOW}','${NOW}'),

        ('${COURSE3_ID}','React Native - Phát triển App Mobile','react-native-phat-trien-app-mobile','Học cách xây dựng ứng dụng mobile đa nền tảng (iOS & Android) với React Native. Khóa học bao gồm Navigation, State Management, API Integration, Push Notifications và publish app lên App Store/Google Play.','Xây dựng app iOS & Android với React Native','/image/courses/react-native.jpg','https://www.youtube.com/watch?v=example3',699000,499000,'intermediate','published',null,2000,'JavaScript ES6+; Kiến thức React cơ bản; Có máy tính cài đặt Node.js','Xây dựng app mobile đa nền tảng; Sử dụng React Navigation; Tích hợp API và Push Notifications; Publish app lên Store','react-native,mobile,ios,android',1,5.0,1,false,false,'${TEACHER_ID}','${CAT_MOBILE_ID}','${NOW}','${NOW}'),

        ('${COURSE4_ID}','Docker & Kubernetes từ cơ bản đến thực chiến','docker-kubernetes-co-ban-den-thuc-chien','Khóa học DevOps thực chiến với Docker và Kubernetes. Học cách container hóa ứng dụng, orchestration với K8s, CI/CD pipeline, monitoring và logging. Thực hành trên môi trường cloud thực tế.','Master Docker & Kubernetes cho DevOps','/image/courses/docker-k8s.jpg','https://www.youtube.com/watch?v=example4',899000,699000,'intermediate','published',null,2800,'Kiến thức Linux cơ bản; Biết command line; Hiểu cơ bản về networking','Container hóa ứng dụng với Docker; Orchestration với Kubernetes; Thiết lập CI/CD pipeline; Monitoring và Logging','docker,kubernetes,devops,ci-cd',0,0,0,true,false,'${TEACHER_ID}','${CAT_DEVOPS_ID}','${NOW}','${NOW}'),

        ('${COURSE5_ID}','Data Science với Python & SQL','data-science-python-sql','Khóa học toàn diện về Data Science. Học phân tích dữ liệu với Python (Pandas, NumPy), trực quan hóa với Matplotlib/Seaborn, SQL nâng cao, và xây dựng dashboard với Streamlit.','Phân tích dữ liệu chuyên nghiệp với Python & SQL','/image/courses/data-science.jpg','https://www.youtube.com/watch?v=example5',599000,449000,'beginner','published',null,2200,'Không yêu cầu kinh nghiệm lập trình; Có laptop cá nhân','Thành thạo Python cho phân tích dữ liệu; Viết SQL truy vấn phức tạp; Trực quan hóa dữ liệu chuyên nghiệp; Xây dựng dashboard','data-science,python,sql,analytics',0,0,0,false,false,'${TEACHER_ID}','${CAT_DATA_ID}','${NOW}','${NOW}')
    `);
    console.log('✅ Đã tạo 5 khóa học\n');

    // ===============================
    // BƯỚC 6: LESSONS
    // ===============================
    console.log('📖 Đang tạo bài học...');

    // Course 1: Next.js (10 bài, 3 section)
    await qr.query(`
      INSERT INTO "learning"."lessons" ("id","title","description","type","videoUrl","videoThumbnail","duration","content","resources","order","isFree","isPublished","courseId","sectionTitle","createdAt","updatedAt")
      VALUES
        ('${L1_01}','Giới thiệu Next.js 14 và cài đặt môi trường','Tổng quan về Next.js 14, các tính năng mới và hướng dẫn cài đặt môi trường phát triển.','video','https://www.youtube.com/watch?v=nextjs-intro',null,1200,null,'[]',1,true,true,'${COURSE1_ID}','Phần 1: Khởi đầu với Next.js','${NOW}','${NOW}'),
        ('${L1_02}','App Router và cấu trúc thư mục','Tìm hiểu App Router, cách tổ chức file/folder và quy ước đặt tên route trong Next.js 14.','video','https://www.youtube.com/watch?v=nextjs-router',null,1500,null,'[]',2,true,true,'${COURSE1_ID}','Phần 1: Khởi đầu với Next.js','${NOW}','${NOW}'),
        ('${L1_03}','Server Components vs Client Components','Phân biệt Server Components và Client Components, khi nào dùng cái nào.','video','https://www.youtube.com/watch?v=nextjs-sc',null,1800,null,'[]',3,false,true,'${COURSE1_ID}','Phần 1: Khởi đầu với Next.js','${NOW}','${NOW}'),
        ('${L1_04}','Data Fetching và Server Actions','Các cách fetch dữ liệu trong Next.js 14 và sử dụng Server Actions.','video','https://www.youtube.com/watch?v=nextjs-data',null,2100,null,'[]',4,false,true,'${COURSE1_ID}','Phần 2: Nâng cao','${NOW}','${NOW}'),
        ('${L1_05}','Authentication với NextAuth.js','Tích hợp xác thực người dùng với NextAuth.js (Auth.js).','video','https://www.youtube.com/watch?v=nextjs-auth',null,2400,null,'[]',5,false,true,'${COURSE1_ID}','Phần 2: Nâng cao','${NOW}','${NOW}'),
        ('${L1_06}','Database Integration với Prisma','Kết nối và thao tác database với Prisma ORM trong Next.js.','video','https://www.youtube.com/watch?v=nextjs-prisma',null,2000,null,'[]',6,false,true,'${COURSE1_ID}','Phần 2: Nâng cao','${NOW}','${NOW}'),
        ('${L1_07}','Middleware và Route Protection','Sử dụng Middleware để bảo vệ route và xử lý logic trước khi render.','video','https://www.youtube.com/watch?v=nextjs-middleware',null,1600,null,'[]',7,false,true,'${COURSE1_ID}','Phần 2: Nâng cao','${NOW}','${NOW}'),
        ('${L1_08}','Tối ưu hiệu năng (Image, Font, SEO)','Tối ưu hóa ứng dụng: next/image, next/font, metadata API cho SEO.','video','https://www.youtube.com/watch?v=nextjs-perf',null,1400,null,'[]',8,false,true,'${COURSE1_ID}','Phần 3: Triển khai','${NOW}','${NOW}'),
        ('${L1_09}','Testing với Jest và React Testing Library','Viết unit test và integration test cho ứng dụng Next.js.','video','https://www.youtube.com/watch?v=nextjs-test',null,1800,null,'[]',9,false,true,'${COURSE1_ID}','Phần 3: Triển khai','${NOW}','${NOW}'),
        ('${L1_10}','Deploy ứng dụng lên Vercel','Hướng dẫn deploy ứng dụng Next.js lên Vercel, cấu hình domain và CI/CD.','video','https://www.youtube.com/watch?v=nextjs-deploy',null,1200,null,'[]',10,false,true,'${COURSE1_ID}','Phần 3: Triển khai','${NOW}','${NOW}')
    `);

    // Course 2: Python AI (8 bài)
    await qr.query(`
      INSERT INTO "learning"."lessons" ("id","title","description","type","videoUrl","videoThumbnail","duration","content","resources","order","isFree","isPublished","courseId","sectionTitle","createdAt","updatedAt")
      VALUES
        ('${L2_01}','Python cơ bản cho Data Science','Ôn tập Python: biến, kiểu dữ liệu, hàm, OOP cần thiết cho DS/ML.','video','https://www.youtube.com/watch?v=python-basic',null,2000,null,'[]',1,true,true,'${COURSE2_ID}','Phần 1: Nền tảng Python','${NOW}','${NOW}'),
        ('${L2_02}','NumPy và Pandas nâng cao','Thao tác dữ liệu hiệu quả với NumPy arrays và Pandas DataFrames.','video','https://www.youtube.com/watch?v=numpy-pandas',null,2400,null,'[]',2,true,true,'${COURSE2_ID}','Phần 1: Nền tảng Python','${NOW}','${NOW}'),
        ('${L2_03}','Trực quan hóa dữ liệu','Sử dụng Matplotlib, Seaborn để tạo biểu đồ chuyên nghiệp.','video','https://www.youtube.com/watch?v=dataviz',null,1800,null,'[]',3,false,true,'${COURSE2_ID}','Phần 1: Nền tảng Python','${NOW}','${NOW}'),
        ('${L2_04}','Supervised Learning - Regression & Classification','Hồi quy tuyến tính, Logistic Regression, Decision Tree, Random Forest.','video','https://www.youtube.com/watch?v=supervised-ml',null,3000,null,'[]',4,false,true,'${COURSE2_ID}','Phần 2: Machine Learning','${NOW}','${NOW}'),
        ('${L2_05}','Unsupervised Learning - Clustering & PCA','K-Means, DBSCAN, PCA, giảm chiều dữ liệu.','video','https://www.youtube.com/watch?v=unsupervised-ml',null,2400,null,'[]',5,false,true,'${COURSE2_ID}','Phần 2: Machine Learning','${NOW}','${NOW}'),
        ('${L2_06}','Deep Learning với TensorFlow','Xây dựng Neural Network, CNN, RNN với TensorFlow/Keras.','video','https://www.youtube.com/watch?v=tensorflow-dl',null,3600,null,'[]',6,false,true,'${COURSE2_ID}','Phần 3: Deep Learning','${NOW}','${NOW}'),
        ('${L2_07}','Transfer Learning và Fine-tuning','Sử dụng pre-trained models: ResNet, BERT, GPT.','video','https://www.youtube.com/watch?v=transfer-learning',null,2400,null,'[]',7,false,true,'${COURSE2_ID}','Phần 3: Deep Learning','${NOW}','${NOW}'),
        ('${L2_08}','Dự án thực tế: Chatbot AI','Xây dựng chatbot AI sử dụng NLP và deploy lên cloud.','video','https://www.youtube.com/watch?v=chatbot-project',null,3000,null,'[]',8,false,true,'${COURSE2_ID}','Phần 3: Deep Learning','${NOW}','${NOW}')
    `);

    // Course 3: React Native (6 bài)
    await qr.query(`
      INSERT INTO "learning"."lessons" ("id","title","description","type","videoUrl","videoThumbnail","duration","content","resources","order","isFree","isPublished","courseId","sectionTitle","createdAt","updatedAt")
      VALUES
        ('${L3_01}','Giới thiệu React Native và Expo','Tổng quan React Native, cài đặt Expo, tạo project đầu tiên.','video','https://www.youtube.com/watch?v=rn-intro',null,1500,null,'[]',1,true,true,'${COURSE3_ID}','Phần 1: Cơ bản','${NOW}','${NOW}'),
        ('${L3_02}','Components và Styling cơ bản','View, Text, Image, StyleSheet, Flexbox layout trong RN.','video','https://www.youtube.com/watch?v=rn-components',null,1800,null,'[]',2,false,true,'${COURSE3_ID}','Phần 1: Cơ bản','${NOW}','${NOW}'),
        ('${L3_03}','React Navigation - Điều hướng','Stack, Tab, Drawer Navigation, Deep Linking.','video','https://www.youtube.com/watch?v=rn-navigation',null,2100,null,'[]',3,false,true,'${COURSE3_ID}','Phần 2: Nâng cao','${NOW}','${NOW}'),
        ('${L3_04}','State Management với Redux Toolkit','Quản lý state toàn cục với Redux Toolkit và RTK Query.','video','https://www.youtube.com/watch?v=rn-redux',null,2400,null,'[]',4,false,true,'${COURSE3_ID}','Phần 2: Nâng cao','${NOW}','${NOW}'),
        ('${L3_05}','API Integration và Authentication','Kết nối REST API, JWT authentication, secure storage.','video','https://www.youtube.com/watch?v=rn-api',null,2000,null,'[]',5,false,true,'${COURSE3_ID}','Phần 2: Nâng cao','${NOW}','${NOW}'),
        ('${L3_06}','Build và Publish App','Build APK/IPA, submit lên App Store và Google Play.','video','https://www.youtube.com/watch?v=rn-publish',null,1800,null,'[]',6,false,true,'${COURSE3_ID}','Phần 3: Triển khai','${NOW}','${NOW}')
    `);

    // Course 4: Docker & K8s (6 bài)
    await qr.query(`
      INSERT INTO "learning"."lessons" ("id","title","description","type","videoUrl","videoThumbnail","duration","content","resources","order","isFree","isPublished","courseId","sectionTitle","createdAt","updatedAt")
      VALUES
        ('${L4_01}','Giới thiệu Container và Docker','Khái niệm container, Docker architecture, cài đặt Docker.','video','https://www.youtube.com/watch?v=docker-intro',null,1500,null,'[]',1,true,true,'${COURSE4_ID}','Phần 1: Docker','${NOW}','${NOW}'),
        ('${L4_02}','Dockerfile và Docker Compose','Viết Dockerfile, multi-stage build, Docker Compose cho multi-service.','video','https://www.youtube.com/watch?v=dockerfile',null,2400,null,'[]',2,false,true,'${COURSE4_ID}','Phần 1: Docker','${NOW}','${NOW}'),
        ('${L4_03}','Docker Networking và Volumes','Network types, volume mounts, data persistence.','video','https://www.youtube.com/watch?v=docker-network',null,2000,null,'[]',3,false,true,'${COURSE4_ID}','Phần 1: Docker','${NOW}','${NOW}'),
        ('${L4_04}','Kubernetes Architecture','K8s concepts: Pods, Services, Deployments, ConfigMaps, Secrets.','video','https://www.youtube.com/watch?v=k8s-arch',null,2800,null,'[]',4,false,true,'${COURSE4_ID}','Phần 2: Kubernetes','${NOW}','${NOW}'),
        ('${L4_05}','Helm Charts và Package Management','Sử dụng Helm để quản lý K8s applications.','video','https://www.youtube.com/watch?v=helm-charts',null,2200,null,'[]',5,false,true,'${COURSE4_ID}','Phần 2: Kubernetes','${NOW}','${NOW}'),
        ('${L4_06}','CI/CD Pipeline với GitHub Actions','Thiết lập CI/CD pipeline hoàn chỉnh cho Docker + K8s.','video','https://www.youtube.com/watch?v=cicd-k8s',null,2600,null,'[]',6,false,true,'${COURSE4_ID}','Phần 3: CI/CD','${NOW}','${NOW}')
    `);

    // Course 5: Data Science (6 bài)
    await qr.query(`
      INSERT INTO "learning"."lessons" ("id","title","description","type","videoUrl","videoThumbnail","duration","content","resources","order","isFree","isPublished","courseId","sectionTitle","createdAt","updatedAt")
      VALUES
        ('${L5_01}','Giới thiệu Data Science và môi trường làm việc','Data Science là gì, cài đặt Jupyter Notebook, Anaconda.','video','https://www.youtube.com/watch?v=ds-intro',null,1200,null,'[]',1,true,true,'${COURSE5_ID}','Phần 1: Nền tảng','${NOW}','${NOW}'),
        ('${L5_02}','SQL từ cơ bản đến nâng cao','SELECT, JOIN, Subquery, Window Functions, CTE.','video','https://www.youtube.com/watch?v=sql-advanced',null,2400,null,'[]',2,false,true,'${COURSE5_ID}','Phần 1: Nền tảng','${NOW}','${NOW}'),
        ('${L5_03}','Pandas - Xử lý và làm sạch dữ liệu','Import data, cleaning, transformation, merge, pivot.','video','https://www.youtube.com/watch?v=pandas-clean',null,2200,null,'[]',3,false,true,'${COURSE5_ID}','Phần 2: Phân tích','${NOW}','${NOW}'),
        ('${L5_04}','EDA - Khám phá dữ liệu','Exploratory Data Analysis, statistical summary, correlation.','video','https://www.youtube.com/watch?v=eda',null,2000,null,'[]',4,false,true,'${COURSE5_ID}','Phần 2: Phân tích','${NOW}','${NOW}'),
        ('${L5_05}','Trực quan hóa với Matplotlib & Seaborn','Bar chart, line chart, heatmap, distribution plot.','video','https://www.youtube.com/watch?v=dataviz-ds',null,1800,null,'[]',5,false,true,'${COURSE5_ID}','Phần 3: Trực quan hóa','${NOW}','${NOW}'),
        ('${L5_06}','Dashboard với Streamlit','Xây dựng interactive dashboard và deploy.','video','https://www.youtube.com/watch?v=streamlit',null,2400,null,'[]',6,false,true,'${COURSE5_ID}','Phần 3: Trực quan hóa','${NOW}','${NOW}')
    `);
    console.log('✅ Đã tạo 36 bài học cho 5 khóa học\n');

    // ===============================
    // BƯỚC 7: ENROLLMENTS (học viên đăng ký 3 khóa)
    // ===============================
    console.log('📝 Đang tạo đăng ký khóa học...');
    await qr.query(`
      INSERT INTO "learning"."enrollments" ("id","studentId","courseId","status","progress","completedAt","expiresAt","lastAccessedAt","createdAt","updatedAt")
      VALUES
        ('${ENROLL1_ID}','${STUDENT_ID}','${COURSE1_ID}','active',35,null,null,'2026-03-04T10:00:00.000Z','2026-02-20T08:00:00.000Z','2026-03-04T10:00:00.000Z'),
        ('${ENROLL2_ID}','${STUDENT_ID}','${COURSE2_ID}','active',15,null,null,'2026-03-03T14:30:00.000Z','2026-02-25T09:00:00.000Z','2026-03-03T14:30:00.000Z'),
        ('${ENROLL3_ID}','${STUDENT_ID}','${COURSE3_ID}','completed',100,'2026-03-01T16:00:00.000Z',null,'2026-03-01T16:00:00.000Z','2026-02-10T10:00:00.000Z','2026-03-01T16:00:00.000Z')
    `);
    console.log('✅ Đã tạo 3 enrollment\n');

    // ===============================
    // BƯỚC 8: LESSON PROGRESS
    // ===============================
    console.log('📈 Đang tạo tiến độ bài học...');
    await qr.query(`
      INSERT INTO "learning"."lesson_progress" ("id","enrollmentId","lessonId","isCompleted","progress","lastPosition","completedAt","createdAt","updatedAt")
      VALUES
        (gen_random_uuid(),'${ENROLL1_ID}','${L1_01}',true,100,0,'2026-02-21T10:00:00.000Z','2026-02-21T08:00:00.000Z','2026-02-21T10:00:00.000Z'),
        (gen_random_uuid(),'${ENROLL1_ID}','${L1_02}',true,100,0,'2026-02-22T11:00:00.000Z','2026-02-22T09:00:00.000Z','2026-02-22T11:00:00.000Z'),
        (gen_random_uuid(),'${ENROLL1_ID}','${L1_03}',true,100,0,'2026-02-23T14:00:00.000Z','2026-02-23T12:00:00.000Z','2026-02-23T14:00:00.000Z'),
        (gen_random_uuid(),'${ENROLL1_ID}','${L1_04}',false,60,1260,'2026-03-04T10:00:00.000Z','2026-03-04T08:00:00.000Z','2026-03-04T10:00:00.000Z'),
        (gen_random_uuid(),'${ENROLL2_ID}','${L2_01}',true,100,0,'2026-02-26T10:00:00.000Z','2026-02-26T08:00:00.000Z','2026-02-26T10:00:00.000Z'),
        (gen_random_uuid(),'${ENROLL2_ID}','${L2_02}',false,40,960,'2026-03-03T14:30:00.000Z','2026-03-03T12:00:00.000Z','2026-03-03T14:30:00.000Z'),
        (gen_random_uuid(),'${ENROLL3_ID}','${L3_01}',true,100,0,'2026-02-12T10:00:00.000Z','2026-02-12T08:00:00.000Z','2026-02-12T10:00:00.000Z'),
        (gen_random_uuid(),'${ENROLL3_ID}','${L3_02}',true,100,0,'2026-02-14T11:00:00.000Z','2026-02-14T09:00:00.000Z','2026-02-14T11:00:00.000Z'),
        (gen_random_uuid(),'${ENROLL3_ID}','${L3_03}',true,100,0,'2026-02-16T14:00:00.000Z','2026-02-16T12:00:00.000Z','2026-02-16T14:00:00.000Z'),
        (gen_random_uuid(),'${ENROLL3_ID}','${L3_04}',true,100,0,'2026-02-20T10:00:00.000Z','2026-02-20T08:00:00.000Z','2026-02-20T10:00:00.000Z'),
        (gen_random_uuid(),'${ENROLL3_ID}','${L3_05}',true,100,0,'2026-02-25T16:00:00.000Z','2026-02-25T14:00:00.000Z','2026-02-25T16:00:00.000Z'),
        (gen_random_uuid(),'${ENROLL3_ID}','${L3_06}',true,100,0,'2026-03-01T16:00:00.000Z','2026-03-01T14:00:00.000Z','2026-03-01T16:00:00.000Z')
    `);
    console.log('✅ Đã tạo 12 lesson progress\n');

    // ===============================
    // BƯỚC 9: PAYMENTS
    // ===============================
    console.log('💳 Đang tạo thanh toán...');
    await qr.query(`
      INSERT INTO "learning"."payments" ("id","transactionId","studentId","courseId","amount","discountAmount","finalAmount","currency","status","paymentMethod","paymentGatewayId","gatewayTransactionId","metadata","paidAt","failureReason","createdAt","updatedAt")
      VALUES
        (gen_random_uuid(),'TXN-20260220-001','${STUDENT_ID}','${COURSE1_ID}',799000,200000,599000,'VND','completed','bank_transfer',null,null,null,'2026-02-20T08:00:00.000Z',null,'2026-02-20T07:55:00.000Z','2026-02-20T08:00:00.000Z'),
        (gen_random_uuid(),'TXN-20260225-002','${STUDENT_ID}','${COURSE2_ID}',999000,200000,799000,'VND','completed','vnpay',null,'VNP-123456',null,'2026-02-25T09:00:00.000Z',null,'2026-02-25T08:55:00.000Z','2026-02-25T09:00:00.000Z'),
        (gen_random_uuid(),'TXN-20260210-003','${STUDENT_ID}','${COURSE3_ID}',699000,200000,499000,'VND','completed','momo',null,'MOMO-789012',null,'2026-02-10T10:00:00.000Z',null,'2026-02-10T09:55:00.000Z','2026-02-10T10:00:00.000Z')
    `);
    console.log('✅ Đã tạo 3 thanh toán\n');

    // ===============================
    // BƯỚC 10: QUIZZES
    // ===============================
    console.log('❓ Đang tạo quiz...');
    const quiz1Questions = JSON.stringify([
      {
        id: 1,
        question: 'Next.js 14 sử dụng router nào mặc định?',
        options: [
          'Pages Router',
          'App Router',
          'Express Router',
          'React Router',
        ],
        correctAnswer: 1,
        points: 10,
      },
      {
        id: 2,
        question: 'Server Component có thể sử dụng useState không?',
        options: ['Có', 'Không', 'Tùy trường hợp', 'Chỉ khi dùng use client'],
        correctAnswer: 1,
        points: 10,
      },
      {
        id: 3,
        question: 'Đâu là cách fetch data phía server trong Next.js 14?',
        options: [
          'useEffect',
          'fetch() trong Server Component',
          'axios.get()',
          'XMLHttpRequest',
        ],
        correctAnswer: 1,
        points: 10,
      },
      {
        id: 4,
        question: 'File nào dùng để định nghĩa layout trong App Router?',
        options: ['_app.tsx', 'layout.tsx', 'index.tsx', '_layout.tsx'],
        correctAnswer: 1,
        points: 10,
      },
      {
        id: 5,
        question: 'Server Actions được đánh dấu bằng directive nào?',
        options: ['"use client"', '"use server"', '"use action"', '"use api"'],
        correctAnswer: 1,
        points: 10,
      },
    ]);
    const quiz2Questions = JSON.stringify([
      {
        id: 1,
        question: 'Thư viện nào dùng để xử lý mảng số liệu trong Python?',
        options: ['Pandas', 'NumPy', 'Matplotlib', 'Scikit-learn'],
        correctAnswer: 1,
        points: 10,
      },
      {
        id: 2,
        question: 'Supervised Learning bao gồm loại nào?',
        options: [
          'Clustering',
          'Regression và Classification',
          'PCA',
          'K-Means',
        ],
        correctAnswer: 1,
        points: 10,
      },
      {
        id: 3,
        question: 'Activation function phổ biến nhất trong hidden layer?',
        options: ['Sigmoid', 'ReLU', 'Softmax', 'Tanh'],
        correctAnswer: 1,
        points: 10,
      },
      {
        id: 4,
        question: 'Overfitting xảy ra khi nào?',
        options: [
          'Model quá đơn giản',
          'Model học quá kỹ trên training data',
          'Data quá ít',
          'Learning rate quá cao',
        ],
        correctAnswer: 1,
        points: 10,
      },
      {
        id: 5,
        question: 'Transfer Learning sử dụng gì?',
        options: [
          'Model mới hoàn toàn',
          'Pre-trained model',
          'Random weights',
          'Manual features',
        ],
        correctAnswer: 1,
        points: 10,
      },
    ]);

    await qr.query(`
      INSERT INTO "learning"."quizzes" ("id","title","description","questions","timeLimit","passingScore","maxAttempts","showCorrectAnswers","shuffleQuestions","courseId","lessonId","createdAt","updatedAt")
      VALUES
        ('${QUIZ1_ID}','Quiz: Kiến thức Next.js 14 cơ bản','Kiểm tra kiến thức cơ bản về Next.js 14 App Router','${quiz1Questions.replace(/'/g, "''")}',30,60,3,true,true,'${COURSE1_ID}','${L1_03}','${NOW}','${NOW}'),
        ('${QUIZ2_ID}','Quiz: Python và Machine Learning','Kiểm tra kiến thức về Python, NumPy và ML cơ bản','${quiz2Questions.replace(/'/g, "''")}',30,60,3,true,true,'${COURSE2_ID}','${L2_05}','${NOW}','${NOW}')
    `);
    console.log('✅ Đã tạo 2 quiz\n');

    // ===============================
    // BƯỚC 11: QUIZ ATTEMPTS
    // ===============================
    console.log('📋 Đang tạo quiz attempts...');
    await qr.query(`
      INSERT INTO "learning"."quiz_attempts" ("id","studentId","quizId","answers","score","passed","status","startedAt","completedAt","timeSpent","createdAt","updatedAt")
      VALUES
        (gen_random_uuid(),'${STUDENT_ID}','${QUIZ1_ID}','[{"questionId":1,"answer":1},{"questionId":2,"answer":1},{"questionId":3,"answer":1},{"questionId":4,"answer":1},{"questionId":5,"answer":0}]',80,true,'completed','2026-02-23T13:00:00.000Z','2026-02-23T13:20:00.000Z',1200,'2026-02-23T13:00:00.000Z','2026-02-23T13:20:00.000Z')
    `);
    console.log('✅ Đã tạo 1 quiz attempt\n');

    // ===============================
    // BƯỚC 12: EXAMS
    // ===============================
    console.log('📝 Đang tạo bài thi...');
    const exam1Questions = JSON.stringify([
      {
        id: 1,
        question: 'Next.js 14 App Router lưu route trong thư mục nào?',
        options: ['pages/', 'app/', 'routes/', 'src/'],
        correctAnswer: 1,
        points: 10,
      },
      {
        id: 2,
        question: 'Cách tạo dynamic route trong App Router?',
        options: ['[id].tsx', '[id]/page.tsx', ':id/page.tsx', '{id}/page.tsx'],
        correctAnswer: 1,
        points: 10,
      },
      {
        id: 3,
        question: 'Metadata API dùng để làm gì?',
        options: [
          'Quản lý state',
          'SEO - title, description',
          'Authentication',
          'Database',
        ],
        correctAnswer: 1,
        points: 10,
      },
      {
        id: 4,
        question: 'next/image có lợi ích gì?',
        options: [
          'Chỉ hỗ trợ PNG',
          'Tự động tối ưu hình ảnh',
          'Tạo animation',
          'Không có lợi ích',
        ],
        correctAnswer: 1,
        points: 10,
      },
      {
        id: 5,
        question: 'Middleware trong Next.js chạy ở đâu?',
        options: ['Client-side', 'Edge Runtime', 'Node.js server', 'Browser'],
        correctAnswer: 1,
        points: 10,
      },
      {
        id: 6,
        question: 'Loading UI trong App Router dùng file nào?',
        options: ['_loading.tsx', 'loading.tsx', 'loader.tsx', 'spinner.tsx'],
        correctAnswer: 1,
        points: 10,
      },
      {
        id: 7,
        question: 'Error boundary dùng file nào?',
        options: ['_error.tsx', 'error.tsx', 'catch.tsx', 'boundary.tsx'],
        correctAnswer: 1,
        points: 10,
      },
      {
        id: 8,
        question: 'Parallel routes sử dụng ký hiệu gì?',
        options: ['(folder)', '@folder', '[folder]', '{folder}'],
        correctAnswer: 1,
        points: 10,
      },
      {
        id: 9,
        question: 'Route Groups sử dụng ký hiệu gì?',
        options: ['@folder', '(folder)', '[folder]', '_folder'],
        correctAnswer: 1,
        points: 10,
      },
      {
        id: 10,
        question: 'Revalidate data cache bằng cách nào?',
        options: [
          'revalidatePath()',
          'clearCache()',
          'refreshData()',
          'resetCache()',
        ],
        correctAnswer: 0,
        points: 10,
      },
    ]);
    const exam2Questions = JSON.stringify([
      {
        id: 1,
        question: 'DataFrame là cấu trúc dữ liệu của thư viện nào?',
        options: ['NumPy', 'Pandas', 'SciPy', 'Matplotlib'],
        correctAnswer: 1,
        points: 10,
      },
      {
        id: 2,
        question: 'Random Forest thuộc loại thuật toán nào?',
        options: ['Unsupervised', 'Ensemble', 'Deep Learning', 'Reinforcement'],
        correctAnswer: 1,
        points: 10,
      },
      {
        id: 3,
        question: 'Gradient Descent dùng để làm gì?',
        options: [
          'Tạo dữ liệu',
          'Tối ưu loss function',
          'Trực quan hóa',
          'Phân cụm',
        ],
        correctAnswer: 1,
        points: 10,
      },
      {
        id: 4,
        question: 'Epoch trong training là gì?',
        options: [
          'Một batch',
          'Một lần duyệt toàn bộ dataset',
          'Một iteration',
          'Một prediction',
        ],
        correctAnswer: 1,
        points: 10,
      },
      {
        id: 5,
        question: 'CNN phù hợp nhất cho loại dữ liệu nào?',
        options: ['Văn bản', 'Hình ảnh', 'Âm thanh', 'Bảng'],
        correctAnswer: 1,
        points: 10,
      },
    ]);

    await qr.query(`
      INSERT INTO "learning"."exams" ("id","title","description","type","status","questions","timeLimit","passingScore","maxAttempts","shuffleQuestions","showCorrectAnswers","certificateTemplateId","rejectionReason","courseId","teacherId","createdAt","updatedAt")
      VALUES
        ('${EXAM1_ID}','Bài thi cuối khóa: Next.js 14','Bài thi tổng hợp kiến thức khóa Next.js 14','official','approved','${exam1Questions.replace(/'/g, "''")}',60,70,2,true,false,null,null,'${COURSE1_ID}','${TEACHER_ID}','${NOW}','${NOW}'),
        ('${EXAM2_ID}','Bài thi: Python AI/ML','Bài thi kiểm tra kiến thức Python và Machine Learning','official','approved','${exam2Questions.replace(/'/g, "''")}',45,70,2,true,false,null,null,'${COURSE2_ID}','${TEACHER_ID}','${NOW}','${NOW}')
    `);
    console.log('✅ Đã tạo 2 bài thi\n');

    // ===============================
    // BƯỚC 13: EXAM ATTEMPTS
    // ===============================
    console.log('✍️  Đang tạo exam attempts...');
    await qr.query(`
      INSERT INTO "learning"."exam_attempts" ("id","examId","studentId","answers","score","earnedPoints","totalPoints","status","passed","certificateIssued","certificateId","startedAt","completedAt","timeSpent","createdAt","updatedAt")
      VALUES
        (gen_random_uuid(),'${EXAM1_ID}','${STUDENT_ID}','[{"questionId":1,"answer":1},{"questionId":2,"answer":1},{"questionId":3,"answer":1},{"questionId":4,"answer":1},{"questionId":5,"answer":1},{"questionId":6,"answer":1},{"questionId":7,"answer":1},{"questionId":8,"answer":0},{"questionId":9,"answer":1},{"questionId":10,"answer":0}]',80,80,100,'completed',true,false,null,'2026-03-02T09:00:00.000Z','2026-03-02T09:45:00.000Z',2700,'2026-03-02T09:00:00.000Z','2026-03-02T09:45:00.000Z')
    `);
    console.log('✅ Đã tạo 1 exam attempt\n');

    // ===============================
    // BƯỚC 14: CERTIFICATE TEMPLATES
    // ===============================
    console.log('🏅 Đang tạo mẫu chứng chỉ...');
    await qr.query(`
      INSERT INTO "learning"."certificate_templates" ("id","title","description","courseId","teacherId","validityPeriod","backgroundColor","borderColor","borderStyle","textColor","logoUrl","signatureUrl","templateImageUrl","templateStyle","badgeStyle","status","rejectionReason","issuedCount","createdAt","updatedAt")
      VALUES
        ('${CERT_TPL1_ID}','Chứng chỉ hoàn thành khóa React Native','Chứng nhận học viên đã hoàn thành khóa học React Native - Phát triển App Mobile','${COURSE3_ID}','${TEACHER_ID}','Vĩnh viễn','#1a1a2e','#d4af37','double','#ffffff','/image/logo-ics.jpg',null,null,'classic','star','approved',null,1,'${NOW}','${NOW}')
    `);
    console.log('✅ Đã tạo 1 mẫu chứng chỉ\n');

    // ===============================
    // BƯỚC 15: CERTIFICATES
    // ===============================
    console.log('🎓 Đang tạo chứng chỉ...');
    await qr.query(`
      INSERT INTO "learning"."certificates" ("id","certificateNumber","studentId","courseId","enrollmentId","issueDate","pdfUrl","imageUrl","metadata","status","rejectionReason","shareId","createdAt","updatedAt")
      VALUES
        ('${CERT1_ID}','CERT-RN-2026-0001','${STUDENT_ID}','${COURSE3_ID}','${ENROLL3_ID}','2026-03-01T16:00:00.000Z',null,null,null,'approved',null,'share-rn-001','2026-03-01T16:00:00.000Z','2026-03-01T16:00:00.000Z')
    `);
    console.log('✅ Đã tạo 1 chứng chỉ\n');

    // ===============================
    // BƯỚC 16: REVIEWS
    // ===============================
    console.log('⭐ Đang tạo đánh giá...');
    await qr.query(`
      INSERT INTO "learning"."reviews" ("id","studentId","courseId","rating","comment","isVerifiedPurchase","helpfulCount","isPublished","teacherReply","repliedAt","createdAt","updatedAt")
      VALUES
        (gen_random_uuid(),'${STUDENT_ID}','${COURSE1_ID}',5,'Khóa học Next.js rất chi tiết và dễ hiểu. Giảng viên giảng rất nhiệt tình, các bài thực hành rất sát thực tế. Strongly recommend!',true,5,true,'Cảm ơn bạn đã đánh giá! Chúc bạn học tốt.','2026-03-02T08:00:00.000Z','2026-02-28T10:00:00.000Z','2026-03-02T08:00:00.000Z'),
        (gen_random_uuid(),'${STUDENT_ID}','${COURSE2_ID}',4,'Nội dung khóa Python AI rất chất lượng. Phần Deep Learning hơi nhanh, cần thêm bài tập thực hành. Tổng thể rất tốt.',true,3,true,'Cảm ơn góp ý! Mình sẽ bổ sung thêm bài tập cho phần Deep Learning.','2026-03-03T09:00:00.000Z','2026-03-01T15:00:00.000Z','2026-03-03T09:00:00.000Z'),
        (gen_random_uuid(),'${STUDENT_ID}','${COURSE3_ID}',5,'Tuyệt vời! Sau khóa học mình đã publish được app đầu tiên lên Google Play. Rất cảm ơn giảng viên!',true,8,true,'Chúc mừng bạn! Rất vui khi biết bạn đã publish app thành công!','2026-03-02T10:00:00.000Z','2026-03-01T17:00:00.000Z','2026-03-02T10:00:00.000Z')
    `);
    // Cập nhật rating và reviewCount cho courses
    await qr.query(
      `UPDATE "learning"."courses" SET "rating"=5.0, "reviewCount"=1 WHERE "id"='${COURSE1_ID}'`,
    );
    await qr.query(
      `UPDATE "learning"."courses" SET "rating"=4.0, "reviewCount"=1 WHERE "id"='${COURSE2_ID}'`,
    );
    await qr.query(
      `UPDATE "learning"."courses" SET "rating"=5.0, "reviewCount"=1 WHERE "id"='${COURSE3_ID}'`,
    );
    console.log('✅ Đã tạo 3 đánh giá\n');

    // ===============================
    // BƯỚC 17: ANNOUNCEMENTS
    // ===============================
    console.log('📢 Đang tạo thông báo...');
    await qr.query(`
      INSERT INTO "learning"."announcements" ("id","title","content","course_id","author_id","priority","is_pinned","is_published","created_at","updated_at")
      VALUES
        (gen_random_uuid(),'Chào mừng đến với ICS Learning!','Chào mừng tất cả các bạn đến với nền tảng học trực tuyến ICS Learning. Hãy khám phá các khóa học chất lượng và bắt đầu hành trình học tập của bạn ngay hôm nay!',null,'${ADMIN_ID}','high',true,true,'${NOW}','${NOW}'),
        (gen_random_uuid(),'Cập nhật nội dung khóa Next.js 14','Khóa học Next.js 14 đã được cập nhật thêm 2 bài mới về Server Actions và Middleware. Mời các bạn theo dõi!','${COURSE1_ID}','${TEACHER_ID}','medium',false,true,'${NOW}','${NOW}'),
        (gen_random_uuid(),'Giảm giá 30% nhân dịp 8/3','Nhân ngày Quốc tế Phụ nữ 8/3, ICS Learning giảm giá 30% tất cả khóa học. Mã coupon: WOMEN2026. Áp dụng đến hết 10/3/2026.',null,'${ADMIN_ID}','urgent',true,true,'${NOW}','${NOW}')
    `);
    console.log('✅ Đã tạo 3 thông báo\n');

    // ===============================
    // BƯỚC 18: DISCUSSIONS
    // ===============================
    console.log('💬 Đang tạo thảo luận...');
    const disc1Id = 'dd000000-0000-0000-0000-000000000001';
    const disc2Id = 'dd000000-0000-0000-0000-000000000002';
    const disc3Id = 'dd000000-0000-0000-0000-000000000003';
    await qr.query(`
      INSERT INTO "learning"."discussions" ("id","title","content","course_id","lesson_id","author_id","parent_id","is_pinned","is_resolved","reply_count","created_at","updated_at")
      VALUES
        ('${disc1Id}','Lỗi khi chạy next dev sau khi cài đặt','Mình gặp lỗi "Module not found" khi chạy next dev. Đã thử xóa node_modules và cài lại nhưng vẫn lỗi. Ai giúp mình với!','${COURSE1_ID}','${L1_01}','${STUDENT_ID}',null,false,true,1,'2026-02-22T08:00:00.000Z','2026-02-22T10:00:00.000Z'),
        ('${disc2Id}','[Trả lời] Lỗi khi chạy next dev','Bạn thử xóa file .next rồi chạy lại xem. Nếu vẫn lỗi hãy kiểm tra phiên bản Node.js >= 18.17. Chạy: rm -rf .next && npm run dev','${COURSE1_ID}','${L1_01}','${TEACHER_ID}','${disc1Id}',false,false,0,'2026-02-22T10:00:00.000Z','2026-02-22T10:00:00.000Z'),
        ('${disc3Id}','Hỏi về NumPy vs Pandas','Khi nào nên dùng NumPy và khi nào nên dùng Pandas? Hai thư viện này có thay thế nhau được không?','${COURSE2_ID}','${L2_02}','${STUDENT_ID}',null,false,false,0,'2026-03-01T09:00:00.000Z','2026-03-01T09:00:00.000Z')
    `);
    console.log('✅ Đã tạo 3 thảo luận\n');

    // ===============================
    // BƯỚC 19: ASSIGNMENTS
    // ===============================
    console.log('📝 Đang tạo bài tập...');
    await qr.query(`
      INSERT INTO "learning"."assignments" ("id","title","description","course_id","lesson_id","created_by","max_score","due_date","status","allow_late_submission","instructions","attachments","created_at","updated_at")
      VALUES
        ('${ASSIGN1_ID}','Bài tập: Xây dựng trang Portfolio với Next.js','Tạo một trang portfolio cá nhân sử dụng Next.js 14 App Router. Yêu cầu: responsive design, có ít nhất 3 trang (Home, About, Projects), sử dụng Server Components, deploy lên Vercel.','${COURSE1_ID}','${L1_10}','${TEACHER_ID}',100,'2026-03-15T23:59:00.000Z','published',true,'1. Clone template từ GitHub repo\n2. Tùy chỉnh theo phong cách cá nhân\n3. Thêm ít nhất 3 project vào trang Projects\n4. Deploy lên Vercel\n5. Submit link deployed site',null,'${NOW}','${NOW}'),
        ('${ASSIGN2_ID}','Bài tập: Phân tích dữ liệu Iris Dataset','Sử dụng Python (Pandas, Matplotlib) để phân tích bộ dữ liệu Iris. Yêu cầu: EDA, trực quan hóa, xây dựng model classification.','${COURSE2_ID}','${L2_05}','${TEACHER_ID}',100,'2026-03-20T23:59:00.000Z','published',false,'1. Load dataset từ sklearn \n2. EDA: describe, info, null check\n3. Tạo ít nhất 4 loại biểu đồ\n4. Train model (accuracy > 90%)\n5. Submit Jupyter Notebook',null,'${NOW}','${NOW}')
    `);
    console.log('✅ Đã tạo 2 bài tập\n');

    // ===============================
    // BƯỚC 20: ASSIGNMENT SUBMISSIONS
    // ===============================
    console.log('📤 Đang tạo bài nộp...');
    await qr.query(`
      INSERT INTO "learning"."assignment_submissions" ("id","assignment_id","student_id","content","attachments","status","score","feedback","graded_by","graded_at","submitted_at","created_at","updated_at")
      VALUES
        (gen_random_uuid(),'${ASSIGN1_ID}','${STUDENT_ID}','Link portfolio: https://my-portfolio.vercel.app\nSử dụng Next.js 14, Tailwind CSS, Framer Motion. Đã deploy thành công.',null,'graded',90,'Bài làm rất tốt! Giao diện đẹp, responsive tốt. Trừ 10 điểm vì chưa có dark mode. Tiếp tục phát huy!','${TEACHER_ID}','2026-03-05T10:00:00.000Z','2026-03-04T20:00:00.000Z','2026-03-04T20:00:00.000Z','2026-03-05T10:00:00.000Z')
    `);
    console.log('✅ Đã tạo 1 bài nộp\n');

    // ===============================
    // BƯỚC 21: RESOURCES
    // ===============================
    console.log('📁 Đang tạo tài liệu...');
    await qr.query(`
      INSERT INTO "learning"."resources" ("id","title","description","type","url","file_path","file_size","course_id","lesson_id","uploaded_by","download_count","is_public","created_at","updated_at")
      VALUES
        (gen_random_uuid(),'Slide bài giảng Next.js 14','Slide tổng hợp kiến thức Next.js 14 App Router','pdf',null,'/uploads/resources/nextjs14-slides.pdf',2500000,'${COURSE1_ID}','${L1_01}','${TEACHER_ID}',15,false,'${NOW}','${NOW}'),
        (gen_random_uuid(),'Cheat Sheet React Hooks','Tài liệu tham khảo nhanh các React Hooks','pdf',null,'/uploads/resources/react-hooks-cheatsheet.pdf',800000,'${COURSE1_ID}',null,'${TEACHER_ID}',25,true,'${NOW}','${NOW}'),
        (gen_random_uuid(),'Python ML Notebook mẫu','Jupyter Notebook mẫu cho Machine Learning','document',null,'/uploads/resources/ml-sample-notebook.ipynb',1500000,'${COURSE2_ID}','${L2_04}','${TEACHER_ID}',10,false,'${NOW}','${NOW}'),
        (gen_random_uuid(),'Link tài liệu Docker chính thức','Link đến documentation chính thức của Docker','link','https://docs.docker.com',null,null,'${COURSE4_ID}','${L4_01}','${TEACHER_ID}',30,true,'${NOW}','${NOW}')
    `);
    console.log('✅ Đã tạo 4 tài liệu\n');

    // ===============================
    // BƯỚC 22: NOTES
    // ===============================
    console.log('📒 Đang tạo ghi chú...');
    await qr.query(`
      INSERT INTO "learning"."notes" ("id","studentId","courseId","lessonId","type","content","timestamp","items","schedule","isFavorite","createdAt","updatedAt")
      VALUES
        (gen_random_uuid(),'${STUDENT_ID}','${COURSE1_ID}','${L1_03}','general','Server Component mặc định, Client Component cần "use client". Server Component không thể dùng useState, useEffect. Dùng để fetch data, truy cập DB trực tiếp.',600,null,null,true,'2026-02-23T13:00:00.000Z','2026-02-23T13:00:00.000Z'),
        (gen_random_uuid(),'${STUDENT_ID}','${COURSE1_ID}','${L1_04}','general','Server Actions: form action, revalidatePath, revalidateTag. Dùng để mutate data mà không cần API route riêng.',300,null,null,false,'2026-03-04T09:00:00.000Z','2026-03-04T09:00:00.000Z'),
        (gen_random_uuid(),'${STUDENT_ID}','${COURSE2_ID}','${L2_01}','general','Python cơ bản: list comprehension, lambda, map/filter/reduce. Numpy: array operations, broadcasting, vectorization.',450,null,null,true,'2026-02-26T09:00:00.000Z','2026-02-26T09:00:00.000Z')
    `);
    console.log('✅ Đã tạo 3 ghi chú\n');

    // ===============================
    // BƯỚC 23: NOTIFICATIONS
    // ===============================
    console.log('🔔 Đang tạo thông báo cá nhân...');
    await qr.query(`
      INSERT INTO "learning"."notifications" ("id","userId","type","title","message","link","metadata","status","readAt","createdAt","updatedAt")
      VALUES
        (gen_random_uuid(),'${STUDENT_ID}','course_enrolled','Đăng ký khóa học thành công','Bạn đã đăng ký thành công khóa học "Next.js 14 - Xây dựng ứng dụng Web hiện đại". Chúc bạn học tốt!','/courses/${COURSE1_ID}',null,'read','2026-02-20T08:05:00.000Z','2026-02-20T08:00:00.000Z','2026-02-20T08:05:00.000Z'),
        (gen_random_uuid(),'${STUDENT_ID}','course_enrolled','Đăng ký khóa học thành công','Bạn đã đăng ký thành công khóa học "Python cho AI & Machine Learning".  Chúc bạn học tốt!','/courses/${COURSE2_ID}',null,'read','2026-02-25T09:05:00.000Z','2026-02-25T09:00:00.000Z','2026-02-25T09:05:00.000Z'),
        (gen_random_uuid(),'${STUDENT_ID}','course_completed','Hoàn thành khóa học!','Chúc mừng! Bạn đã hoàn thành khóa học "React Native - Phát triển App Mobile". Chứng chỉ đã được cấp.','/certificates/${CERT1_ID}',null,'read','2026-03-01T16:05:00.000Z','2026-03-01T16:00:00.000Z','2026-03-01T16:05:00.000Z'),
        (gen_random_uuid(),'${STUDENT_ID}','certificate_issued','Chứng chỉ đã được cấp','Chứng chỉ khóa React Native đã được cấp. Bạn có thể tải về hoặc chia sẻ.','/certificates/${CERT1_ID}',null,'unread',null,'2026-03-01T16:01:00.000Z','2026-03-01T16:01:00.000Z'),
        (gen_random_uuid(),'${STUDENT_ID}','payment_success','Thanh toán thành công','Thanh toán 599.000đ cho khóa "Next.js 14" đã thành công.','/payments',null,'read','2026-02-20T08:02:00.000Z','2026-02-20T08:00:00.000Z','2026-02-20T08:02:00.000Z'),
        (gen_random_uuid(),'${STUDENT_ID}','exam_result','Kết quả bài thi','Bạn đã đạt 80/100 điểm trong bài thi cuối khóa Next.js 14. Chúc mừng bạn đã PASS!','/exams/${EXAM1_ID}',null,'unread',null,'2026-03-02T09:50:00.000Z','2026-03-02T09:50:00.000Z'),
        (gen_random_uuid(),'${TEACHER_ID}','new_student','Có học viên mới đăng ký','Học viên Nguyễn Ngọc Tuyên đã đăng ký khóa học "Next.js 14".','/teacher/courses/${COURSE1_ID}',null,'read','2026-02-20T08:10:00.000Z','2026-02-20T08:00:00.000Z','2026-02-20T08:10:00.000Z'),
        (gen_random_uuid(),'${TEACHER_ID}','new_review','Có đánh giá mới','Học viên đã đánh giá 5⭐ cho khóa "Next.js 14": "Khóa học rất chi tiết và dễ hiểu..."','/teacher/reviews',null,'unread',null,'2026-02-28T10:05:00.000Z','2026-02-28T10:05:00.000Z'),
        (gen_random_uuid(),'${ADMIN_ID}','system_announcement','Hệ thống hoạt động bình thường','Tất cả các dịch vụ đang hoạt động ổn định. Không có sự cố nào.','/admin/dashboard',null,'read','2026-03-05T00:05:00.000Z','${NOW}','2026-03-05T00:05:00.000Z'),
        (gen_random_uuid(),'${TEACHER_ID}','course_approved','Khóa học đã được duyệt','Khóa học "Docker & Kubernetes từ cơ bản đến thực chiến" đã được admin duyệt và xuất bản.','/teacher/courses/${COURSE4_ID}',null,'read','2026-03-04T10:00:00.000Z','2026-03-04T10:00:00.000Z','2026-03-04T10:00:00.000Z')
    `);
    console.log('✅ Đã tạo 10 thông báo\n');

    // ===============================
    // BƯỚC 24: COUPONS
    // ===============================
    console.log('🎫 Đang tạo mã giảm giá...');
    await qr.query(`
      INSERT INTO "learning"."coupons" ("id","code","type","value","min_purchase","max_discount","usage_limit","used_count","course_id","created_by","status","valid_from","valid_until","created_at","updated_at")
      VALUES
        ('${COUPON1_ID}','WELCOME2026','percentage',20,100000,200000,100,0,null,'${ADMIN_ID}','active','2026-03-01T00:00:00.000Z','2026-06-30T23:59:59.000Z','${NOW}','${NOW}'),
        ('${COUPON2_ID}','WOMEN2026','percentage',30,200000,300000,50,0,null,'${ADMIN_ID}','active','2026-03-05T00:00:00.000Z','2026-03-10T23:59:59.000Z','${NOW}','${NOW}')
    `);
    console.log('✅ Đã tạo 2 mã giảm giá\n');

    // ===============================
    // BƯỚC 25: WISHLISTS
    // ===============================
    console.log('❤️  Đang tạo wishlist...');
    await qr.query(`
      INSERT INTO "learning"."wishlists" ("id","studentId","courseId","createdAt")
      VALUES
        (gen_random_uuid(),'${STUDENT_ID}','${COURSE4_ID}','2026-03-03T10:00:00.000Z'),
        (gen_random_uuid(),'${STUDENT_ID}','${COURSE5_ID}','2026-03-04T14:00:00.000Z')
    `);
    console.log('✅ Đã tạo 2 wishlist\n');

    // ===============================
    // BƯỚC 26: CART
    // ===============================
    console.log('🛒 Đang tạo giỏ hàng...');
    await qr.query(`
      INSERT INTO "learning"."cart" ("id","user_id","course_id","price","created_at","updated_at")
      VALUES
        (gen_random_uuid(),'${STUDENT_ID}','${COURSE4_ID}',699000,'2026-03-04T15:00:00.000Z','2026-03-04T15:00:00.000Z')
    `);
    console.log('✅ Đã tạo 1 item giỏ hàng\n');

    // ===============================
    // BƯỚC 27: SCHEDULE ITEMS
    // ===============================
    console.log('📅 Đang tạo lịch học...');
    await qr.query(`
      INSERT INTO "learning"."schedule_items" ("id","title","course","type","status","time","duration","dueDate","completed","important","description","tags","createdAt","updatedAt")
      VALUES
        (gen_random_uuid(),'Học bài Data Fetching','Next.js 14','lesson','upcoming','09:00','1h 30m',null,false,true,'Tiếp tục bài Data Fetching và Server Actions','["nextjs","data-fetching"]','${NOW}','${NOW}'),
        (gen_random_uuid(),'Làm bài tập Portfolio','Next.js 14','assignment','upcoming','14:00','2h','2026-03-15',false,true,'Hoàn thành bài tập xây dựng trang Portfolio','["nextjs","assignment"]','${NOW}','${NOW}'),
        (gen_random_uuid(),'Ôn tập Python NumPy','Python AI/ML','lesson','upcoming','10:00','1h',null,false,false,'Ôn lại NumPy array operations','["python","numpy"]','${NOW}','${NOW}'),
        (gen_random_uuid(),'Học Supervised Learning','Python AI/ML','lesson','upcoming','15:00','2h',null,false,true,'Bài mới: Regression & Classification','["python","ml"]','${NOW}','${NOW}'),
        (gen_random_uuid(),'Đã hoàn thành RN Navigation','React Native','lesson','completed','09:00','1h 30m',null,true,false,'Hoàn thành bài React Navigation','["react-native","navigation"]','${NOW}','${NOW}'),
        (gen_random_uuid(),'Bài thi cuối khóa Next.js','Next.js 14','exam','upcoming','09:00','1h','2026-03-10',false,true,'Chuẩn bị cho bài thi cuối khóa, ôn tập toàn bộ kiến thức','["nextjs","exam"]','${NOW}','${NOW}')
    `);
    console.log('✅ Đã tạo 6 lịch học\n');

    // Bật lại FK check
    await qr.query('SET session_replication_role = DEFAULT');

    console.log('========================================');
    console.log('🎉 HOÀN TẤT! Đã tạo xong toàn bộ dữ liệu mẫu');
    console.log('========================================');
    console.log('📊 Tổng kết:');
    console.log('  - 3 tài khoản (Admin, Giáo viên, Học viên)');
    console.log('  - 6 danh mục');
    console.log('  - 21 cài đặt hệ thống');
    console.log('  - 5 khóa học');
    console.log('  - 36 bài học');
    console.log('  - 3 đăng ký khóa học');
    console.log('  - 12 tiến độ bài học');
    console.log('  - 3 thanh toán');
    console.log('  - 2 quiz + 1 quiz attempt');
    console.log('  - 2 bài thi + 1 exam attempt');
    console.log('  - 1 mẫu chứng chỉ + 1 chứng chỉ');
    console.log('  - 3 đánh giá');
    console.log('  - 3 thông báo hệ thống');
    console.log('  - 3 thảo luận');
    console.log('  - 2 bài tập + 1 bài nộp');
    console.log('  - 4 tài liệu');
    console.log('  - 3 ghi chú');
    console.log('  - 10 thông báo cá nhân');
    console.log('  - 2 mã giảm giá');
    console.log('  - 2 wishlist + 1 cart');
    console.log('  - 6 lịch học');
    console.log('========================================');
    console.log('🔑 Thông tin đăng nhập (tất cả mật khẩu: 12345678@Ab):');
    console.log('  - Admin:    tt98tuyen@gmail.com');
    console.log('  - Giáo viên: nguyenngoctuyen11032003@gmail.com');
    console.log('  - Học viên:  nntuyen1132003@gmail.com');
    console.log('========================================');
  } catch (error) {
    console.error('❌ Lỗi:', error);
    // Đảm bảo bật lại FK check
    await qr.query('SET session_replication_role = DEFAULT');
    throw error;
  } finally {
    await qr.release();
    await AppDataSource.destroy();
    console.log('\n👋 Đã đóng kết nối database');
  }
}

seedFreshData().catch((error) => {
  console.error('❌ Script thất bại:', error);
  process.exit(1);
});
