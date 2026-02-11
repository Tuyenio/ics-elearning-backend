import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User, UserRole, UserStatus } from '../users/entities/user.entity';
import { Category } from '../categories/entities/category.entity';
import { Course, CourseLevel, CourseStatus } from '../courses/entities/course.entity';
import { Lesson, LessonType } from '../lessons/entities/lesson.entity';
import { Enrollment, EnrollmentStatus } from '../enrollments/entities/enrollment.entity';
import { LessonProgress } from '../lesson-progress/entities/lesson-progress.entity';
import { Review } from '../reviews/entities/review.entity';
import { Payment, PaymentStatus, PaymentMethod } from '../payments/entities/payment.entity';
import { Certificate } from '../certificates/entities/certificate.entity';
import { CertificateTemplate, TemplateStatus } from '../certificates/entities/certificate-template.entity';
import { Note } from '../notes/entities/note.entity';
import { Wishlist } from '../wishlists/entities/wishlist.entity';
import { Cart } from '../cart/entities/cart.entity';
import { Coupon, CouponType, CouponStatus } from '../coupons/entities/coupon.entity';
import { Announcement, AnnouncementPriority } from '../announcements/entities/announcement.entity';
import { Discussion } from '../discussions/entities/discussion.entity';
import { Assignment, AssignmentStatus, AssignmentSubmission, SubmissionStatus } from '../assignments/entities/assignment.entity';
import { Resource, ResourceType } from '../resources/entities/resource.entity';
import { Notification, NotificationType, NotificationStatus } from '../notifications/entities/notification.entity';
import { SystemSetting } from '../system-settings/entities/system-setting.entity';
import { Exam, ExamType, ExamStatus } from '../exams/entities/exam.entity';
import { ExamAttempt, AttemptStatus as ExamAttemptStatus } from '../exams/entities/exam-attempt.entity';
import { Quiz } from '../quizzes/entities/quiz.entity';
import { QuizAttempt, AttemptStatus as QuizAttemptStatus } from '../quizzes/entities/quiz-attempt.entity';
import { ScheduleItem } from '../schedule/entities/schedule.entity';


export async function seedDatabase(dataSource: DataSource) {
  console.log('🌱 Starting database seed...');

  const userRepo = dataSource.getRepository(User);
  const categoryRepo = dataSource.getRepository(Category);
  const courseRepo = dataSource.getRepository(Course);
  const lessonRepo = dataSource.getRepository(Lesson);
  const enrollmentRepo = dataSource.getRepository(Enrollment);
  const lessonProgressRepo = dataSource.getRepository(LessonProgress);
  const reviewRepo = dataSource.getRepository(Review);
  const paymentRepo = dataSource.getRepository(Payment);
  const certificateRepo = dataSource.getRepository(Certificate);
  const certificateTemplateRepo = dataSource.getRepository(CertificateTemplate);
  const cartRepo = dataSource.getRepository(Cart);
  const couponRepo = dataSource.getRepository(Coupon);
  const announcementRepo = dataSource.getRepository(Announcement);
  const discussionRepo = dataSource.getRepository(Discussion);
  const assignmentRepo = dataSource.getRepository(Assignment);
  const submissionRepo = dataSource.getRepository(AssignmentSubmission);
  const resourceRepo = dataSource.getRepository(Resource);
  const notificationRepo = dataSource.getRepository(Notification);
  const systemSettingRepo = dataSource.getRepository(SystemSetting);
  const examRepo = dataSource.getRepository(Exam);
  const examAttemptRepo = dataSource.getRepository(ExamAttempt);
  const quizRepo = dataSource.getRepository(Quiz);
  const quizAttemptRepo = dataSource.getRepository(QuizAttempt);
  const scheduleRepo = dataSource.getRepository(ScheduleItem);


  // Clear existing data
  console.log('🗑️  Clearing existing data...');
  
  await systemSettingRepo.upsert(
  {
    key: 'site_logo',
    value: '/image/logo-ics.jpg',
  },
  ['key'],
);

  // Use CASCADE to handle foreign key constraints
  const tables = [
    'schedule_items',
    'quiz_attempts',
    'quizzes',
    'exam_attempts',
    'exams',
    'certificate_templates',
    'certificates',
    'notifications',
    'resources',
    'assignment_submissions',
    'assignments',
    'discussions',
    'announcements',
    'coupons',
    'cart',
    'wishlists',
    'notes',
    'payments',
    'reviews',
    'lesson_progress',
    'enrollments',
    'lessons',
    'courses',
    'categories',
    'users'
  ];
  
  for (const table of tables) {
    await dataSource.query(`TRUNCATE TABLE "${table}" CASCADE`);
  }

  // Create Users - Only 3 accounts as requested
  console.log('👤 Creating users...');
  const hashedPassword = await bcrypt.hash('12345678@Ab', 12);

  // Admin account
  const admin = await userRepo.save({
    email: 'tt98tuyen@gmail.com',
    password: hashedPassword,
    name: 'Nguyễn Văn Tuyến',
    role: UserRole.ADMIN,
    status: UserStatus.ACTIVE,
    emailVerified: true,
    avatar: '/avatars/admin.jpg',
    bio: 'Quản trị viên hệ thống ICS Learning. Chịu trách nhiệm quản lý toàn bộ nền tảng, phê duyệt khóa học và giảng viên.',
    phone: '0987654321',
    address: 'Hà Nội, Việt Nam',
  });

  // Admin account (alt for testing login)
  const admin2 = await userRepo.save({
    email: 't98tuyen@gmail.com',
    password: hashedPassword,
    name: 'Nguyễn Văn Tuyến',
    role: UserRole.ADMIN,
    status: UserStatus.ACTIVE,
    emailVerified: true,
    avatar: '/avatars/admin2.jpg',
    bio: 'Tài khoản quản trị dự phòng dùng để kiểm thử dashboard.',
    phone: '0987000000',
    address: 'Hà Nội, Việt Nam',
  });

  // Teacher account
  const teacher = await userRepo.save({
    email: 'tuyenkoikop@gmail.com',
    password: hashedPassword,
    name: 'Trần Minh Thắng',
    role: UserRole.TEACHER,
    status: UserStatus.ACTIVE,
    emailVerified: true,
    avatar: '/avatars/teacher.jpg',
    bio: 'Chuyên gia lập trình Full-stack với hơn 10 năm kinh nghiệm. Đã giảng dạy cho hơn 50,000 học viên trên toàn thế giới. Tác giả của nhiều khóa học nổi tiếng về Web Development, AI và Data Science.',
    phone: '0912345678',
    address: 'TP. Hồ Chí Minh, Việt Nam',
  });

  // Teacher account - Second teacher for testing
  const teacher2 = await userRepo.save({
    email: 'tuyennguyen@gmail.com',
    password: hashedPassword,
    name: 'Tuyên Nguyễn',
    role: UserRole.TEACHER,
    status: UserStatus.ACTIVE,
    emailVerified: true,
    avatar: '/avatars/teacher2.jpg',
    bio: 'Giảng viên công nghệ thông tin với kinh nghiệm 8 năm. Chuyên dạy về Web Development, Cloud Computing và DevOps.',
    phone: '0938765432',
    address: 'Hà Nội, Việt Nam',
  });

  // Student account
  const student = await userRepo.save({
    email: 'minhthang031123@gmail.com',
    password: hashedPassword,
    name: 'Lê Hoàng Minh',
    role: UserRole.STUDENT,
    status: UserStatus.ACTIVE,
    emailVerified: true,
    avatar: '/avatars/student.jpg',
    bio: 'Sinh viên năm 3 chuyên ngành Công nghệ thông tin. Đam mê học hỏi và phát triển kỹ năng lập trình.',
    phone: '0909123456',
    address: 'Đà Nẵng, Việt Nam',
  });

  // Additional students for richer admin metrics
  const student2 = await userRepo.save({
    email: 'student2@example.com',
    password: hashedPassword,
    name: 'Phạm Thu Hà',
    role: UserRole.STUDENT,
    status: UserStatus.ACTIVE,
    emailVerified: true,
    avatar: '/avatars/student2.jpg',
    bio: 'Học viên yêu thích phân tích dữ liệu và AI.',
    phone: '0909000001',
    address: 'Hà Nội, Việt Nam',
  });

  const student3 = await userRepo.save({
    email: 'student3@example.com',
    password: hashedPassword,
    name: 'Đỗ Minh Quân',
    role: UserRole.STUDENT,
    status: UserStatus.ACTIVE,
    emailVerified: true,
    avatar: '/avatars/student3.jpg',
    bio: 'Học viên đam mê DevOps và Cloud.',
    phone: '0909000002',
    address: 'TP. Hồ Chí Minh, Việt Nam',
  });

  const students: User[] = [student, student2, student3];

  // Create Categories
  console.log('📚 Creating categories...');
  const categories = await categoryRepo.save([
    {
      name: 'Lập trình Web',
      slug: 'lap-trinh-web',
      description: 'Học lập trình web từ cơ bản đến nâng cao với HTML, CSS, JavaScript, React, Node.js',
      icon: '💻',
      order: 1,
      isActive: true,
    },
    {
      name: 'AI & Machine Learning',
      slug: 'ai-machine-learning',
      description: 'Khóa học về Trí tuệ nhân tạo, Machine Learning, Deep Learning',
      icon: '🤖',
      order: 2,
      isActive: true,
    },
    {
      name: 'Mobile Development',
      slug: 'mobile-development',
      description: 'Phát triển ứng dụng di động iOS và Android',
      icon: '📱',
      order: 3,
      isActive: true,
    },
    {
      name: 'Data Science',
      slug: 'data-science',
      description: 'Khoa học dữ liệu, phân tích dữ liệu, Big Data',
      icon: '📊',
      order: 4,
      isActive: true,
    },
    {
      name: 'DevOps & Cloud',
      slug: 'devops-cloud',
      description: 'DevOps, Docker, Kubernetes, AWS, Azure',
      icon: '☁️',
      order: 5,
      isActive: true,
    },
    {
      name: 'UI/UX Design',
      slug: 'ui-ux-design',
      description: 'Thiết kế giao diện và trải nghiệm người dùng',
      icon: '🎨',
      order: 6,
      isActive: true,
    },
  ]);

  // Create Courses
  console.log('🎓 Creating courses...');
  const coursesData = [
    // All courses by the teacher
    {
      title: 'Lập trình Web Full-stack với React & Node.js',
      slug: 'lap-trinh-web-fullstack-react-nodejs',
      description: 'Khóa học toàn diện về lập trình web full-stack, từ frontend với React đến backend với Node.js và MongoDB. Xây dựng ứng dụng web hoàn chỉnh từ đầu đến cuối với các dự án thực tế.',
      shortDescription: 'Trở thành Full-stack Developer chuyên nghiệp với React & Node.js',
      thumbnail: '/courses/fullstack-react-nodejs.jpg',
      previewVideo: '/videos/preview-fullstack.mp4',
      price: 1999000,
      discountPrice: 999000,
      level: CourseLevel.INTERMEDIATE,
      status: CourseStatus.PUBLISHED,
      duration: 3600,
      requirements: ['Kiến thức cơ bản về HTML, CSS, JavaScript', 'Laptop/PC để code', 'Đam mê học hỏi'],
      outcomes: [
        'Xây dựng ứng dụng web full-stack hoàn chỉnh',
        'Thành thạo React Hooks, Context API, Redux',
        'Xây dựng RESTful API với Node.js & Express',
        'Làm việc với MongoDB và Mongoose',
        'Deploy ứng dụng lên cloud',
        'Tích hợp thanh toán và authentication'
      ],
      tags: ['React', 'Node.js', 'MongoDB', 'Full-stack', 'JavaScript'],
      teacherId: teacher.id,
      categoryId: categories[0].id,
      isFeatured: true,
      isBestseller: true,
      rating: 4.9,
      reviewCount: 0,
      enrollmentCount: 0,
    },
    {
      title: 'Next.js 14 - The Complete Guide',
      slug: 'nextjs-14-complete-guide',
      description: 'Học Next.js 14 từ cơ bản đến nâng cao. App Router, Server Components, Server Actions, Streaming và nhiều tính năng mới nhất. Xây dựng ứng dụng production-ready.',
      shortDescription: 'Master Next.js 14 với App Router và Server Components',
      thumbnail: '/courses/nextjs-14.jpg',
      price: 1499000,
      discountPrice: 749000,
      level: CourseLevel.ADVANCED,
      status: CourseStatus.PUBLISHED,
      duration: 2400,
      requirements: ['Kiến thức React cơ bản', 'JavaScript ES6+', 'HTML & CSS'],
      outcomes: [
        'Xây dựng ứng dụng Next.js 14 hiện đại',
        'Thành thạo App Router và Server Components',
        'Tối ưu SEO và Performance',
        'Deploy lên Vercel',
        'Xử lý authentication và authorization'
      ],
      tags: ['Next.js', 'React', 'Server Components', 'SEO'],
      teacherId: teacher.id,
      categoryId: categories[0].id,
      isFeatured: true,
      rating: 4.8,
      reviewCount: 0,
      enrollmentCount: 0,
    },
    {
      title: 'TypeScript từ Zero đến Hero',
      slug: 'typescript-zero-to-hero',
      description: 'Học TypeScript một cách bài bản từ cơ bản đến nâng cao. Áp dụng TypeScript vào dự án thực tế với React, Node.js. Hiểu sâu về type system và best practices.',
      shortDescription: 'Làm chủ TypeScript cho dự án thực tế',
      thumbnail: '/courses/typescript.jpg',
      price: 999000,
      discountPrice: 499000,
      level: CourseLevel.INTERMEDIATE,
      status: CourseStatus.PUBLISHED,
      duration: 1800,
      requirements: ['JavaScript cơ bản', 'Hiểu về OOP'],
      outcomes: [
        'Hiểu sâu về TypeScript type system',
        'Sử dụng Generics, Decorators',
        'Áp dụng TypeScript vào React/Node.js',
        'Debug và troubleshoot TypeScript errors',
        'Best practices và design patterns'
      ],
      tags: ['TypeScript', 'JavaScript', 'Programming'],
      teacherId: teacher.id,
      categoryId: categories[0].id,
      rating: 4.7,
      reviewCount: 0,
      enrollmentCount: 0,
    },
    {
      title: 'Machine Learning A-Z: Hands-On Python',
      slug: 'machine-learning-az-python',
      description: 'Khóa học Machine Learning toàn diện nhất. Học từ cơ bản đến nâng cao với Python, scikit-learn, TensorFlow. Thực hành với 20+ dự án thực tế.',
      shortDescription: 'Master Machine Learning với Python',
      thumbnail: '/courses/ml-az.jpg',
      price: 2499000,
      discountPrice: 1249000,
      level: CourseLevel.INTERMEDIATE,
      status: CourseStatus.PUBLISHED,
      duration: 4200,
      requirements: ['Python cơ bản', 'Toán học phổ thông', 'Numpy và Pandas cơ bản'],
      outcomes: [
        'Hiểu các thuật toán ML cơ bản và nâng cao',
        'Xử lý và phân tích dữ liệu',
        'Xây dựng và deploy ML models',
        'Làm việc với TensorFlow và Keras',
        'Feature engineering và model optimization'
      ],
      tags: ['Machine Learning', 'Python', 'AI', 'TensorFlow'],
      teacherId: teacher.id,
      categoryId: categories[1].id,
      isFeatured: true,
      isBestseller: true,
      rating: 4.9,
      reviewCount: 0,
      enrollmentCount: 0,
    },
    {
      title: 'Deep Learning & Neural Networks',
      slug: 'deep-learning-neural-networks',
      description: 'Học Deep Learning từ cơ bản đến nâng cao. CNN, RNN, LSTM, Transformers và nhiều kiến trúc mạng neural hiện đại. Xây dựng AI models thực tế.',
      shortDescription: 'Làm chủ Deep Learning và Neural Networks',
      thumbnail: '/courses/deep-learning.jpg',
      price: 2999000,
      discountPrice: 1499000,
      level: CourseLevel.ADVANCED,
      status: CourseStatus.PUBLISHED,
      duration: 4800,
      requirements: ['Machine Learning cơ bản', 'Python', 'Linear Algebra'],
      outcomes: [
        'Hiểu sâu về Neural Networks',
        'Xây dựng CNN cho Computer Vision',
        'Xây dựng RNN/LSTM cho NLP',
        'Sử dụng Transfer Learning',
        'Deploy deep learning models'
      ],
      tags: ['Deep Learning', 'Neural Networks', 'AI', 'Python'],
      teacherId: teacher.id,
      categoryId: categories[1].id,
      isFeatured: true,
      rating: 4.8,
      reviewCount: 0,
      enrollmentCount: 0,
    },
    {
      title: 'Natural Language Processing với Python',
      slug: 'nlp-with-python',
      description: 'Học xử lý ngôn ngữ tự nhiên (NLP) với Python. Text Classification, Sentiment Analysis, Chatbots, và nhiều hơn nữa. Sử dụng BERT, GPT và Transformers.',
      shortDescription: 'Master NLP và xây dựng ứng dụng AI thực tế',
      thumbnail: '/courses/nlp-python.jpg',
      price: 1999000,
      discountPrice: 999000,
      level: CourseLevel.ADVANCED,
      status: CourseStatus.PUBLISHED,
      duration: 3600,
      requirements: ['Python', 'Machine Learning cơ bản'],
      outcomes: [
        'Xử lý và phân tích text data',
        'Xây dựng Chatbot',
        'Text Classification và Sentiment Analysis',
        'Sử dụng BERT và Transformers',
        'Named Entity Recognition'
      ],
      tags: ['NLP', 'Python', 'AI', 'Chatbot'],
      teacherId: teacher.id,
      categoryId: categories[1].id,
      rating: 4.7,
      reviewCount: 0,
      enrollmentCount: 0,
    },
    {
      title: 'Data Science Bootcamp 2024',
      slug: 'data-science-bootcamp-2024',
      description: 'Bootcamp Data Science toàn diện. Từ xử lý dữ liệu, phân tích thống kê đến Machine Learning và visualization. Trở thành Data Scientist chuyên nghiệp.',
      shortDescription: 'Trở thành Data Scientist chuyên nghiệp',
      thumbnail: '/courses/data-science.jpg',
      price: 2999000,
      discountPrice: 1499000,
      level: CourseLevel.BEGINNER,
      status: CourseStatus.PUBLISHED,
      duration: 5400,
      requirements: ['Không cần kiến thức trước', 'Laptop/PC'],
      outcomes: [
        'Xử lý và phân tích dữ liệu với Pandas',
        'Visualization với Matplotlib, Seaborn',
        'Machine Learning với scikit-learn',
        'Làm việc với SQL và databases',
        'Data storytelling và presentation'
      ],
      tags: ['Data Science', 'Python', 'Machine Learning', 'SQL'],
      teacherId: teacher.id,
      categoryId: categories[3].id,
      isBestseller: true,
      rating: 4.8,
      reviewCount: 0,
      enrollmentCount: 0,
    },
    {
      title: 'Flutter & Dart - Xây dựng ứng dụng iOS và Android',
      slug: 'flutter-dart-mobile-dev',
      description: 'Học Flutter và Dart để xây dựng ứng dụng mobile đa nền tảng. Từ cơ bản đến nâng cao. Xây dựng và publish apps lên Store.',
      shortDescription: 'Phát triển app mobile với Flutter',
      thumbnail: '/courses/flutter.jpg',
      price: 1799000,
      discountPrice: 899000,
      level: CourseLevel.INTERMEDIATE,
      status: CourseStatus.PUBLISHED,
      duration: 3200,
      requirements: ['Kiến thức lập trình cơ bản', 'OOP concepts'],
      outcomes: [
        'Xây dựng ứng dụng iOS và Android',
        'Thành thạo Flutter widgets',
        'State Management với Provider, Bloc',
        'Publish app lên Store',
        'Integration với Firebase'
      ],
      tags: ['Flutter', 'Dart', 'Mobile', 'iOS', 'Android'],
      teacherId: teacher.id,
      categoryId: categories[2].id,
      rating: 4.6,
      reviewCount: 0,
      enrollmentCount: 0,
    },
    {
      title: 'React Native - Build Native Mobile Apps',
      slug: 'react-native-mobile-apps',
      description: 'Xây dựng ứng dụng mobile native với React Native. Sử dụng JavaScript để develop cho iOS và Android. Tích hợp với native modules.',
      shortDescription: 'Xây dựng mobile app với React Native',
      thumbnail: '/courses/react-native.jpg',
      price: 1699000,
      discountPrice: 849000,
      level: CourseLevel.INTERMEDIATE,
      status: CourseStatus.PUBLISHED,
      duration: 3000,
      requirements: ['React cơ bản', 'JavaScript ES6+'],
      outcomes: [
        'Xây dựng mobile apps với React Native',
        'Navigation và routing',
        'State management với Redux',
        'Native modules integration',
        'Performance optimization'
      ],
      tags: ['React Native', 'Mobile', 'JavaScript', 'iOS', 'Android'],
      teacherId: teacher.id,
      categoryId: categories[2].id,
      rating: 4.5,
      reviewCount: 0,
      enrollmentCount: 0,
    },
    {
      title: 'DevOps với Docker & Kubernetes',
      slug: 'devops-docker-kubernetes',
      description: 'Học DevOps từ cơ bản đến nâng cao. Docker containers, Kubernetes orchestration, CI/CD pipelines. Deploy và scale applications.',
      shortDescription: 'Master DevOps với Docker & Kubernetes',
      thumbnail: '/courses/devops.jpg',
      price: 2299000,
      discountPrice: 1149000,
      level: CourseLevel.ADVANCED,
      status: CourseStatus.PUBLISHED,
      duration: 3800,
      requirements: ['Linux cơ bản', 'Kiến thức về web applications'],
      outcomes: [
        'Containerize applications với Docker',
        'Orchestrate containers với Kubernetes',
        'Setup CI/CD pipelines',
        'Monitor và logging',
        'Security best practices'
      ],
      tags: ['DevOps', 'Docker', 'Kubernetes', 'CI/CD'],
      teacherId: teacher.id,
      categoryId: categories[4].id,
      isFeatured: true,
      rating: 4.7,
      reviewCount: 0,
      enrollmentCount: 0,
    },
    {
      title: 'AWS Cloud Practitioner - Complete Course',
      slug: 'aws-cloud-practitioner',
      description: 'Khóa học AWS toàn diện từ cơ bản đến nâng cao. EC2, S3, Lambda, RDS và nhiều services khác. Chuẩn bị cho AWS certification.',
      shortDescription: 'Master AWS Cloud Services',
      thumbnail: '/courses/aws.jpg',
      price: 1899000,
      discountPrice: 949000,
      level: CourseLevel.BEGINNER,
      status: CourseStatus.PUBLISHED,
      duration: 2800,
      requirements: ['Kiến thức IT cơ bản'],
      outcomes: [
        'Hiểu AWS core services',
        'Deploy applications trên AWS',
        'Security và IAM',
        'Cost optimization',
        'Chuẩn bị AWS certification'
      ],
      tags: ['AWS', 'Cloud', 'DevOps', 'Infrastructure'],
      teacherId: teacher.id,
      categoryId: categories[4].id,
      rating: 4.6,
      reviewCount: 0,
      enrollmentCount: 0,
    },
    {
      title: 'UI/UX Design Fundamentals',
      slug: 'ui-ux-design-fundamentals',
      description: 'Học thiết kế UI/UX từ cơ bản. User research, wireframing, prototyping với Figma. Tạo designs đẹp và user-friendly.',
      shortDescription: 'Thiết kế UI/UX chuyên nghiệp với Figma',
      thumbnail: '/courses/ui-ux.jpg',
      price: 1599000,
      discountPrice: 799000,
      level: CourseLevel.BEGINNER,
      status: CourseStatus.PUBLISHED,
      duration: 2600,
      requirements: ['Không cần kiến thức trước', 'Có máy tính'],
      outcomes: [
        'User research và personas',
        'Wireframing và prototyping',
        'Visual design principles',
        'Usability testing',
        'Design systems'
      ],
      tags: ['UI/UX', 'Design', 'Figma', 'User Experience'],
      teacherId: teacher.id,
      categoryId: categories[5].id,
      rating: 4.5,
      reviewCount: 0,
      enrollmentCount: 0,
    },
    // Courses for teacher2 (Tuyên Nguyễn)
    {
      title: 'Vue.js 3 - The Modern Way',
      slug: 'vuejs-3-modern-way',
      description: 'Học Vue.js 3 với Composition API, TypeScript, Pinia. Xây dựng ứng dụng SPA hiện đại.',
      shortDescription: 'Master Vue.js 3 với Composition API',
      thumbnail: '/courses/vuejs-3.jpg',
      price: 1299000,
      discountPrice: 649000,
      level: CourseLevel.INTERMEDIATE,
      status: CourseStatus.PUBLISHED,
      duration: 2000,
      requirements: ['JavaScript cơ bản', 'HTML/CSS'],
      outcomes: ['Vue 3 Composition API', 'State management với Pinia', 'Deploy Vue apps'],
      tags: ['Vue.js', 'JavaScript', 'Frontend'],
      teacherId: teacher2.id,
      categoryId: categories[0].id,
      isFeatured: true,
      rating: 4.7,
      reviewCount: 0,
      enrollmentCount: 0,
    },
    {
      title: 'AWS Solutions Architect',
      slug: 'aws-solutions-architect',
      description: 'Trở thành AWS Solutions Architect. EC2, RDS, S3, Lambda, CloudFormation.',
      shortDescription: 'Certified AWS Solutions Architect',
      thumbnail: '/courses/aws-architect.jpg',
      price: 2199000,
      discountPrice: 1099000,
      level: CourseLevel.ADVANCED,
      status: CourseStatus.PUBLISHED,
      duration: 3200,
      requirements: ['IT cơ bản', 'Linux/Windows', 'Networking'],
      outcomes: ['AWS certifications', 'Cloud architecture', 'High availability design'],
      tags: ['AWS', 'Cloud', 'DevOps'],
      teacherId: teacher2.id,
      categoryId: categories[4].id,
      isFeatured: true,
      isBestseller: true,
      rating: 4.8,
      reviewCount: 0,
      enrollmentCount: 0,
    },
    {
      title: 'Python cho Data Analysis',
      slug: 'python-data-analysis',
      description: 'Phân tích dữ liệu với Python: Pandas, NumPy, Matplotlib, Seaborn.',
      shortDescription: 'Data Analysis với Python',
      thumbnail: '/courses/python-data-analysis.jpg',
      price: 1499000,
      discountPrice: 749000,
      level: CourseLevel.INTERMEDIATE,
      status: CourseStatus.PUBLISHED,
      duration: 2400,
      requirements: ['Python cơ bản', 'Excel'],
      outcomes: ['Pandas và NumPy', 'Data visualization', 'Statistical analysis'],
      tags: ['Python', 'Data Science', 'Analytics'],
      teacherId: teacher2.id,
      categoryId: categories[3].id,
      rating: 4.6,
      reviewCount: 0,
      enrollmentCount: 0,
    },
  ];

  const courses: Course[] = [];
  for (const courseData of coursesData) {
    const course = await courseRepo.save(courseData);
    courses.push(course);
  }

  // Create Lessons for each course
  console.log('📝 Creating lessons...');
  
  for (const course of courses) {
    const lessonCount = 12 + Math.floor(Math.random() * 8); // 12-19 lessons per course
    
    for (let i = 0; i < lessonCount; i++) {
      await lessonRepo.save({
        title: `Bài ${i + 1}: ${getLessonTitle(i, course.title)}`,
        description: `Nội dung chi tiết của bài học ${i + 1}. Trong bài này bạn sẽ học được những kiến thức quan trọng và thực hành qua các ví dụ cụ thể.`,
        type: i === 0 ? LessonType.VIDEO : (i % 6 === 0 ? LessonType.QUIZ : LessonType.VIDEO),
        videoUrl: `/videos/${course.slug}/lesson-${i + 1}.mp4`,
        videoThumbnail: `/videos/${course.slug}/thumb-${i + 1}.jpg`,
        duration: 600 + Math.floor(Math.random() * 1800), // 10-40 minutes
        content: i % 6 === 0 ? `Quiz content for lesson ${i + 1}` : '',
        resources: i % 3 === 0 ? [
          { name: `Slide bài ${i + 1}.pdf`, url: `/resources/${course.slug}/slide-${i + 1}.pdf` },
          { name: `Source code.zip`, url: `/resources/${course.slug}/code-${i + 1}.zip` }
        ] : [],
        order: i + 1,
        isFree: i < 3, // First 3 lessons are free
        isPublished: true,
        courseId: course.id,
      } as any);
    }
  }

  // Create Enrollments, Progress, Reviews, Payments for multiple students
  console.log('📊 Creating enrollments and progress for students...');
  const enrollments: any[] = [];
  const allStudents = [student, student2, student3];
  const enrolledCourses = courses;
  let txnCounter = 0;

  for (const learner of allStudents) {
    for (let courseIndex = 0; courseIndex < enrolledCourses.length; courseIndex++) {
      const course = enrolledCourses[courseIndex];
      const paidAt = new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000); // Last 60 days

      // Create Payment
      await paymentRepo.save({
        transactionId: `TXN${Date.now()}${txnCounter++}${course.id.substring(0, 6)}`,
        studentId: learner.id,
        courseId: course.id,
        amount: course.price,
        discountAmount: course.price - course.discountPrice,
        finalAmount: course.discountPrice,
        currency: 'VND',
        status: PaymentStatus.COMPLETED,
        paymentMethod: [PaymentMethod.CREDIT_CARD, PaymentMethod.WALLET, PaymentMethod.QR_CODE][(courseIndex + txnCounter) % 3],
        paidAt,
        paymentGatewayId: `GW${Date.now()}${courseIndex}`,
        metadata: {
          paymentMethod: 'Online',
          bankCode: courseIndex % 2 === 0 ? 'VCB' : 'TCB',
        }
      });

      // Create Enrollment with varying progress
      const progress = courseIndex % 4 === 0 ? 100 : courseIndex % 3 === 0 ? 80 : 40 + Math.floor(Math.random() * 50);
      const isCompleted = progress >= 90;
      const enrollment = await enrollmentRepo.save({
        studentId: learner.id,
        courseId: course.id,
        status: isCompleted ? EnrollmentStatus.COMPLETED : EnrollmentStatus.ACTIVE,
        progress,
        completedAt: isCompleted ? paidAt : undefined,
        lastAccessedAt: new Date(Date.now() - Math.random() * 3 * 24 * 60 * 60 * 1000), // Last 3 days
      } as any);
      enrollments.push(enrollment);

      // Update course enrollment count
      await courseRepo.increment({ id: course.id }, 'enrollmentCount', 1);

      // Create Lesson Progress
      const lessons = await lessonRepo.find({ where: { courseId: course.id }, order: { order: 'ASC' } });
      const completedLessons = Math.floor((lessons.length * progress) / 100);
      for (let j = 0; j < lessons.length; j++) {
        if (j < completedLessons) {
          await lessonProgressRepo.save({
            enrollmentId: enrollment.id,
            lessonId: lessons[j].id,
            isCompleted: true,
            progress: 100,
            lastPosition: lessons[j].duration,
            completedAt: paidAt,
            timeSpent: 600 + Math.floor(Math.random() * 1800),
          });
        }
      }

      // Create Review for completed courses
      if (isCompleted) {
        await reviewRepo.save({
          courseId: course.id,
          studentId: learner.id,
          rating: Math.floor(4 + Math.random() * 2),
          comment: `Khóa học ${course.title} rất bổ ích và chi tiết!`,
          isPublished: true,
        } as any);
      }

      // Update course rating
      const reviews = await reviewRepo.find({ where: { courseId: course.id } });
      const avgRating = reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;
      await courseRepo.update(course.id, { rating: Math.round(avgRating * 10) / 10 });

      // Create Certificate
      if (isCompleted) {
        const instructorName = course.teacherId === teacher2.id ? teacher2.name : teacher.name;
        await certificateRepo.save({
          certificateNumber: `ICS-CERT-${Date.now()}-${courseIndex}-${txnCounter}`,
          studentId: learner.id,
          courseId: course.id,
          enrollmentId: enrollment.id,
          issueDate: paidAt,
          pdfUrl: `/certificates/${enrollment.id}.pdf`,
          imageUrl: `/certificates/${enrollment.id}.jpg`,
          metadata: {
            courseName: course.title,
            studentName: learner.name,
            completionDate: paidAt.toISOString(),
            instructor: instructorName,
          }
        });
      }
    }
  }

  // Create some notes for the student
  console.log('📒 Creating notes...');
  const studentEnrollments = await enrollmentRepo.find({ 
    where: { studentId: student.id },
    relations: ['course']
  });

  for (const enrollment of studentEnrollments.slice(0, 5)) {
    const lessons = await lessonRepo.find({ 
      where: { courseId: enrollment.course.id },
      take: 3
    });

    for (const lesson of lessons) {
      await dataSource.getRepository(Note).save({
        studentId: student.id,
        courseId: enrollment.course.id,
        lessonId: lesson.id,
        type: 'general',
        content: `Ghi chú quan trọng cho bài "${lesson.title}": ${getNoteContent()}`,
        timestamp: Math.floor(lesson.duration * Math.random()),
        isFavorite: Math.random() > 0.7,
      });
    }
  }

  // Create deadline/checklist/plan notes
  if (studentEnrollments.length > 0) {
    await dataSource.getRepository(Note).save({
      studentId: student.id,
      courseId: studentEnrollments[0].course.id,
      type: 'deadline',
      content: 'Deadline các bài tập quan trọng',
      items: [
        { id: '1', title: 'Hoàn thành bài tập React Hooks', deadline: '2026-02-20', priority: 'high', completed: false },
        { id: '2', title: 'Nộp project cuối kỳ', deadline: '2026-03-01', priority: 'high', completed: false },
        { id: '3', title: 'Review code bài tập 3', deadline: '2026-02-15', priority: 'medium', completed: true },
        { id: '4', title: 'Đọc tài liệu TypeScript Generics', deadline: '2026-02-18', priority: 'low', completed: false },
      ],
      isFavorite: true,
    });

    await dataSource.getRepository(Note).save({
      studentId: student.id,
      courseId: studentEnrollments[0].course.id,
      type: 'checklist',
      content: 'Checklist học tập tuần này',
      items: [
        { id: '1', title: 'Xem video bài 5-8', deadline: '', priority: 'high', completed: true },
        { id: '2', title: 'Làm quiz chương 3', deadline: '', priority: 'medium', completed: true },
        { id: '3', title: 'Code along dự án thực tế', deadline: '', priority: 'high', completed: false },
        { id: '4', title: 'Ôn lại kiến thức cũ', deadline: '', priority: 'low', completed: false },
      ],
      isFavorite: false,
    });

    if (studentEnrollments.length > 1) {
      await dataSource.getRepository(Note).save({
        studentId: student.id,
        courseId: studentEnrollments[1].course.id,
        type: 'plan',
        content: 'Kế hoạch học tập tháng 2',
        schedule: [
          { date: '2026-02-12', time: '09:00', content: 'Học bài 10: Server Components' },
          { date: '2026-02-14', time: '14:00', content: 'Thực hành API Routes' },
          { date: '2026-02-16', time: '10:00', content: 'Ôn tập Middleware & Authentication' },
          { date: '2026-02-18', time: '09:00', content: 'Làm project: Blog App' },
          { date: '2026-02-20', time: '14:00', content: 'Deploy lên Vercel' },
        ],
        isFavorite: true,
      });
    }
  }

  // Create wishlist for student
  console.log('❤️ Creating wishlist...');
  const wishlistCourses = courses.slice(0, 3);
  for (const course of wishlistCourses) {
    await dataSource.getRepository(Wishlist).save({
      studentId: student.id,
      courseId: course.id,
    });
  }

  // Create Cart items
  console.log('🛒 Creating cart items...');
  const availableCourses = courses.filter(c => !enrollments.find(e => e.courseId === c.id));
  if (availableCourses.length > 0) {
    for (let i = 0; i < Math.min(2, availableCourses.length); i++) {
      await cartRepo.save({
        userId: student.id,
        courseId: availableCourses[i].id,
        price: availableCourses[i].discountPrice || availableCourses[i].price,
      });
    }
  }

  // Create Coupons
  console.log('🎟️  Creating coupons...');
  await couponRepo.save([
    {
      code: 'WELCOME2024',
      type: CouponType.PERCENTAGE,
      value: 20,
      minPurchase: 500000,
      maxDiscount: 200000,
      usageLimit: 100,
      usedCount: 15,
      createdBy: admin.id,
      status: CouponStatus.ACTIVE,
      validFrom: new Date('2024-01-01'),
      validUntil: new Date('2024-12-31'),
    },
    {
      code: 'BLACKFRIDAY',
      type: CouponType.PERCENTAGE,
      value: 50,
      minPurchase: 1000000,
      maxDiscount: 500000,
      usageLimit: 50,
      usedCount: 32,
      createdBy: admin.id,
      status: CouponStatus.ACTIVE,
      validFrom: new Date('2024-11-01'),
      validUntil: new Date('2024-11-30'),
    },
    {
      code: 'FIRSTCOURSE',
      type: CouponType.FIXED,
      value: 100000,
      usageLimit: 500,
      usedCount: 123,
      createdBy: admin.id,
      status: CouponStatus.ACTIVE,
    },
    {
      code: 'TEACHER50',
      type: CouponType.PERCENTAGE,
      value: 10,
      courseId: courses[0].id,
      usageLimit: 20,
      usedCount: 5,
      createdBy: teacher.id,
      status: CouponStatus.ACTIVE,
    },
  ]);

  // Create Announcements
  console.log('📢 Creating announcements...');
  for (let i = 0; i < 3; i++) {
    await announcementRepo.save({
      title: i === 0 ? 'Chào mừng đến với khóa học!' : i === 1 ? 'Cập nhật nội dung mới' : 'Thông báo quan trọng',
      content: i === 0 
        ? 'Chào các bạn! Mình rất vui được đồng hành cùng các bạn trong khóa học này. Hãy tích cực tham gia thảo luận và làm bài tập nhé!'
        : i === 1
        ? 'Mình vừa cập nhật thêm 3 bài học mới về các chủ đề nâng cao. Các bạn check out nhé!'
        : 'Deadline nộp bài tập cuối khóa là ngày 31/12. Các bạn hoàn thành đúng hạn để nhận certificate nhé!',
      courseId: courses[i % courses.length].id,
      authorId: teacher.id,
      priority: i === 2 ? AnnouncementPriority.HIGH : AnnouncementPriority.MEDIUM,
      isPinned: i === 0,
      isPublished: true,
    });
  }

  // Create Discussions
  console.log('💬 Creating discussions...');
  const allLessons = await lessonRepo.find({ take: 10 });
  for (let i = 0; i < 5; i++) {
    const discussion = await discussionRepo.save({
      title: i === 0 ? 'Làm sao để cài đặt môi trường?' : 
             i === 1 ? 'Best practice khi làm dự án' :
             i === 2 ? 'Lỗi khi chạy code bài 5' :
             i === 3 ? 'Gợi ý tài liệu tham khảo thêm' :
             'Câu hỏi về bài tập cuối khóa',
      content: 'Chi tiết câu hỏi ở đây...',
      courseId: courses[i % courses.length].id,
      lessonId: i > 1 && allLessons[i] ? allLessons[i].id : undefined,
      authorId: student.id,
      isPinned: i === 0,
      isResolved: i < 2,
    });

    // Add replies
    if (i < 2) {
      await discussionRepo.save({
        title: '',
        content: 'Mình có thể giúp bạn với vấn đề này. Bạn thử làm theo cách này xem...',
        courseId: courses[i % courses.length].id,
        authorId: teacher.id,
        parentId: discussion.id,
      });
    }
  }

  // Create Assignments
  console.log('📝 Creating assignments...');
  const assignments: any[] = [];
  for (let i = 0; i < 4; i++) {
    const assignment = await assignmentRepo.save({
      title: `Bài tập ${i + 1}: ${i === 0 ? 'Thiết lập dự án' : i === 1 ? 'Xây dựng tính năng cơ bản' : i === 2 ? 'Tích hợp API' : 'Hoàn thiện dự án'}`,
      description: 'Mô tả chi tiết bài tập...',
      courseId: courses[i % 4].id,
      lessonId: allLessons[i * 2] ? allLessons[i * 2].id : undefined,
      createdBy: teacher.id,
      maxScore: 100,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      status: AssignmentStatus.PUBLISHED,
      allowLateSubmission: true,
      instructions: 'Hướng dẫn làm bài chi tiết ở đây...',
    });
    assignments.push(assignment);
  }

  // Create Assignment Submissions
  console.log('📤 Creating assignment submissions...');
  for (let i = 0; i < 3; i++) {
    await submissionRepo.save({
      assignmentId: assignments[i].id,
      studentId: student.id,
      content: 'Nội dung bài làm của học viên...',
      attachments: i === 1 ? ['/uploads/submissions/file1.pdf', '/uploads/submissions/screenshot.png'] : undefined,
      status: i === 0 ? SubmissionStatus.GRADED : i === 1 ? SubmissionStatus.SUBMITTED : SubmissionStatus.NOT_SUBMITTED,
      score: i === 0 ? 85 : undefined,
      feedback: i === 0 ? 'Bài làm tốt! Tuy nhiên cần cải thiện phần...' : undefined,
      gradedBy: i === 0 ? teacher.id : undefined,
      gradedAt: i === 0 ? new Date() : undefined,
      submittedAt: i < 2 ? new Date() : undefined,
    });
  }

  // Create Resources
  console.log('📚 Creating resources...');
  for (let i = 0; i < 6; i++) {
    await resourceRepo.save({
      title: i === 0 ? 'Slide bài giảng' :
             i === 1 ? 'Source code mẫu' :
             i === 2 ? 'Tài liệu tham khảo' :
             i === 3 ? 'Video hướng dẫn bổ sung' :
             i === 4 ? 'Cheat sheet' :
             'Link tài nguyên hữu ích',
      description: 'Mô tả tài nguyên...',
      type: i === 0 || i === 2 ? ResourceType.PDF :
            i === 1 ? ResourceType.DOCUMENT :
            i === 3 ? ResourceType.VIDEO :
            i === 5 ? ResourceType.LINK :
            ResourceType.OTHER,
      url: i === 5 ? 'https://example.com/resource' : undefined,
      filePath: i !== 5 ? `/uploads/resources/file${i}.pdf` : undefined,
      fileSize: i !== 5 ? 1024000 : undefined,
      courseId: courses[i % courses.length].id,
      lessonId: i < 4 && allLessons[i * 2] ? allLessons[i * 2].id : undefined,
      uploadedBy: teacher.id,
      isPublic: i < 2,
    });
  }

  // Create Notifications - đa dạng hơn
  console.log('🔔 Creating notifications...');
  await notificationRepo.save([
    {
      userId: student.id,
      type: NotificationType.SYSTEM_ANNOUNCEMENT,
      title: 'Khóa học mới được cập nhật',
      message: 'Giảng viên đã thêm 3 bài học mới cho khóa học bạn đang theo dõi',
      status: NotificationStatus.UNREAD,
    },
    {
      userId: student.id,
      type: NotificationType.EXAM_REMINDER,
      title: 'Bài tập mới',
      message: 'Bạn có bài tập mới cần hoàn thành trước ngày 31/12',
      status: NotificationStatus.UNREAD,
    },
    {
      userId: student.id,
      type: NotificationType.SYSTEM_ANNOUNCEMENT,
      title: 'Thông báo từ giảng viên',
      message: 'Giảng viên vừa đăng thông báo quan trọng',
      status: NotificationStatus.READ,
      readAt: new Date(),
    },
    {
      userId: student.id,
      type: NotificationType.COURSE_ENROLLED,
      title: 'Đăng ký khóa học thành công',
      message: 'Bạn đã đăng ký thành công khóa học "Lập trình Web Full-stack với React & Node.js"',
      link: '/my-courses',
      status: NotificationStatus.READ,
      readAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    },
    {
      userId: student.id,
      type: NotificationType.CERTIFICATE_ISSUED,
      title: 'Chứng chỉ mới',
      message: 'Chúc mừng! Bạn đã nhận được chứng chỉ hoàn thành khóa học',
      link: '/certificates',
      status: NotificationStatus.UNREAD,
    },
    {
      userId: teacher.id,
      type: NotificationType.NEW_REVIEW,
      title: 'Đánh giá mới',
      message: 'Học viên Lê Hoàng Minh vừa đánh giá 5 sao cho khóa học của bạn',
      link: '/teacher/reviews',
      status: NotificationStatus.UNREAD,
    },
    {
      userId: teacher.id,
      type: NotificationType.COURSE_ENROLLED,
      title: 'Học viên mới đăng ký',
      message: 'Có 3 học viên mới đăng ký khóa học "Next.js 14 - The Complete Guide"',
      link: '/teacher/students',
      status: NotificationStatus.UNREAD,
    },
    {
      userId: teacher.id,
      type: NotificationType.PAYMENT_SUCCESS,
      title: 'Thanh toán mới',
      message: 'Bạn vừa nhận được thanh toán 999.000đ từ khóa học',
      link: '/teacher/earnings',
      status: NotificationStatus.READ,
      readAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      userId: admin.id,
      type: NotificationType.SYSTEM_ANNOUNCEMENT,
      title: 'Hệ thống hoạt động bình thường',
      message: 'Tất cả dịch vụ đang hoạt động ổn định. Có 15 khóa học mới trong tháng',
      status: NotificationStatus.UNREAD,
    },
    {
      userId: admin.id,
      type: NotificationType.EXAM_RESULT,
      title: 'Bài thi mới cần duyệt',
      message: 'Giảng viên Trần Minh Thắng vừa gửi bài thi mới cần phê duyệt',
      link: '/admin/exams',
      status: NotificationStatus.UNREAD,
    },
  ]);

  // ========== CERTIFICATE TEMPLATES ==========
  console.log('🏅 Creating certificate templates...');
  const certTemplates: CertificateTemplate[] = [];
  
  // Template 1 - Approved, cho khóa học React Fullstack
  const template1 = await certificateTemplateRepo.save({
    title: 'Chứng chỉ Lập trình Web Full-stack',
    description: 'Chứng nhận hoàn thành khóa học Lập trình Web Full-stack với React & Node.js. Học viên đã nắm vững kiến thức frontend, backend và có khả năng xây dựng ứng dụng web hoàn chỉnh.',
    courseId: courses[0].id,
    teacherId: teacher.id,
    validityPeriod: 'Vĩnh viễn',
    backgroundColor: '#1a1a2e',
    borderColor: '#d4af37',
    borderStyle: 'double',
    textColor: '#ffffff',
    logoUrl: '/image/logo-ics.jpg',
    signatureUrl: '/image/signature-teacher.png',
    templateStyle: 'classic',
    badgeStyle: 'star',
    status: TemplateStatus.APPROVED,
    issuedCount: 8,
  });
  certTemplates.push(template1);

  // Template 2 - Approved, cho khóa học Next.js
  const template2 = await certificateTemplateRepo.save({
    title: 'Chứng chỉ Next.js 14 Professional',
    description: 'Chứng nhận năng lực phát triển ứng dụng web hiện đại với Next.js 14, bao gồm App Router, Server Components và Server Actions.',
    courseId: courses[1].id,
    teacherId: teacher.id,
    validityPeriod: '2 năm',
    backgroundColor: '#0f172a',
    borderColor: '#3b82f6',
    borderStyle: 'solid',
    textColor: '#e2e8f0',
    logoUrl: '/image/logo-ics.jpg',
    signatureUrl: '/image/signature-teacher.png',
    templateStyle: 'modern',
    badgeStyle: 'shield',
    status: TemplateStatus.APPROVED,
    issuedCount: 5,
  });
  certTemplates.push(template2);

  // Template 3 - Pending, cho khóa học Machine Learning
  const template3 = await certificateTemplateRepo.save({
    title: 'Chứng chỉ Machine Learning Expert',
    description: 'Chứng nhận hoàn thành khóa học Machine Learning A-Z. Học viên có kiến thức sâu về các thuật toán ML và khả năng xây dựng mô hình AI thực tế.',
    courseId: courses[3].id,
    teacherId: teacher.id,
    validityPeriod: '3 năm',
    backgroundColor: '#1e1b4b',
    borderColor: '#8b5cf6',
    borderStyle: 'double',
    textColor: '#e2e8f0',
    logoUrl: '/image/logo-ics.jpg',
    templateStyle: 'elegant',
    badgeStyle: 'medal',
    status: TemplateStatus.PENDING,
    issuedCount: 0,
  });
  certTemplates.push(template3);

  // Template 4 - Draft, cho khóa học Deep Learning
  const template4 = await certificateTemplateRepo.save({
    title: 'Chứng chỉ Deep Learning Specialist',
    description: 'Chứng nhận chuyên gia Deep Learning với kiến thức về CNN, RNN, Transformers và các mô hình neural network hiện đại.',
    courseId: courses[4].id,
    teacherId: teacher.id,
    validityPeriod: '2 năm',
    backgroundColor: '#162447',
    borderColor: '#e43f5a',
    borderStyle: 'double',
    textColor: '#f8f9fa',
    templateStyle: 'classic',
    badgeStyle: 'star',
    status: TemplateStatus.DRAFT,
    issuedCount: 0,
  });
  certTemplates.push(template4);

  // Template 5 - Rejected, cho khóa học TypeScript
  const template5 = await certificateTemplateRepo.save({
    title: 'Chứng chỉ TypeScript Developer',
    description: 'Chứng nhận thành thạo TypeScript cho phát triển ứng dụng web.',
    courseId: courses[2].id,
    teacherId: teacher.id,
    validityPeriod: 'Vĩnh viễn',
    backgroundColor: '#1a1a2e',
    borderColor: '#007acc',
    borderStyle: 'solid',
    textColor: '#ffffff',
    templateStyle: 'modern',
    badgeStyle: 'shield',
    status: TemplateStatus.REJECTED,
    rejectionReason: 'Chứng chỉ cần bổ sung thêm logo và chữ ký giảng viên. Vui lòng cập nhật và gửi lại.',
    issuedCount: 0,
  });
  certTemplates.push(template5);

  // Template 6 - Approved, teacher2, Flutter
  const template6 = await certificateTemplateRepo.save({
    title: 'Chứng chỉ Flutter Mobile Developer',
    description: 'Chứng nhận năng lực phát triển ứng dụng mobile đa nền tảng với Flutter & Dart.',
    courseId: courses[7].id,
    teacherId: teacher.id,
    validityPeriod: '1 năm',
    backgroundColor: '#0d1b2a',
    borderColor: '#00b4d8',
    borderStyle: 'double',
    textColor: '#ffffff',
    logoUrl: '/image/logo-ics.jpg',
    signatureUrl: '/image/signature-teacher.png',
    templateStyle: 'elegant',
    badgeStyle: 'medal',
    status: TemplateStatus.APPROVED,
    issuedCount: 3,
  });
  certTemplates.push(template6);

  // Template 7 - Pending, teacher2, Vue.js
  const template7 = await certificateTemplateRepo.save({
    title: 'Chứng chỉ Vue.js Frontend Developer',
    description: 'Chứng nhận hoàn thành khóa học Vue.js 3 với Composition API, TypeScript và Pinia.',
    courseId: courses[12].id,
    teacherId: teacher2.id,
    validityPeriod: '2 năm',
    backgroundColor: '#1a2332',
    borderColor: '#42b883',
    borderStyle: 'solid',
    textColor: '#ffffff',
    templateStyle: 'modern',
    badgeStyle: 'star',
    status: TemplateStatus.PENDING,
    issuedCount: 0,
  });
  certTemplates.push(template7);

  // Template 8 - Approved, teacher2, AWS
  const template8 = await certificateTemplateRepo.save({
    title: 'Chứng chỉ AWS Solutions Architect',
    description: 'Chứng nhận kiến thức và kỹ năng thiết kế giải pháp trên nền tảng AWS Cloud.',
    courseId: courses[13].id,
    teacherId: teacher2.id,
    validityPeriod: '3 năm',
    backgroundColor: '#232f3e',
    borderColor: '#ff9900',
    borderStyle: 'double',
    textColor: '#ffffff',
    logoUrl: '/image/logo-ics.jpg',
    signatureUrl: '/image/signature-teacher2.png',
    templateStyle: 'classic',
    badgeStyle: 'shield',
    status: TemplateStatus.APPROVED,
    issuedCount: 4,
  });
  certTemplates.push(template8);

  // ========== EXAMS ==========
  console.log('📝 Creating exams...');
  const exams: Exam[] = [];

  // Exam 1 - Approved, React Fullstack
  const exam1 = await examRepo.save({
    title: 'Bài thi cuối khóa: Full-stack React & Node.js',
    description: 'Bài thi tổng hợp kiến thức Full-stack development với React và Node.js. Bao gồm câu hỏi về frontend, backend, database và deployment.',
    type: ExamType.OFFICIAL,
    status: ExamStatus.APPROVED,
    courseId: courses[0].id,
    teacherId: teacher.id,
    timeLimit: 90,
    passingScore: 70,
    maxAttempts: 3,
    shuffleQuestions: true,
    showCorrectAnswers: true,
    certificateTemplateId: template1.id,
    questions: [
      { id: 'q1', type: 'multiple_choice', text: 'React Hook nào được sử dụng để quản lý side effects?', options: ['useState', 'useEffect', 'useContext', 'useReducer'], correctAnswer: 'useEffect', points: 10 },
      { id: 'q2', type: 'multiple_choice', text: 'Middleware nào phổ biến nhất trong Express.js?', options: ['cors', 'helmet', 'morgan', 'Tất cả đều đúng'], correctAnswer: 'Tất cả đều đúng', points: 10 },
      { id: 'q3', type: 'true_false', text: 'MongoDB là cơ sở dữ liệu quan hệ (SQL).', correctAnswer: 'false', points: 5 },
      { id: 'q4', type: 'multiple_choice', text: 'Phương thức HTTP nào dùng để cập nhật dữ liệu?', options: ['GET', 'POST', 'PUT', 'DELETE'], correctAnswer: 'PUT', points: 10 },
      { id: 'q5', type: 'multiple_choice', text: 'JSX là gì?', options: ['Một framework mới', 'JavaScript Extension', 'JavaScript XML', 'Java Syntax Extension'], correctAnswer: 'JavaScript XML', points: 10 },
      { id: 'q6', type: 'true_false', text: 'useEffect chạy sau khi component render.', correctAnswer: 'true', points: 5 },
      { id: 'q7', type: 'multiple_choice', text: 'Redux Toolkit giúp gì?', options: ['Tối ưu UI', 'Quản lý state đơn giản hơn', 'Routing', 'Testing'], correctAnswer: 'Quản lý state đơn giản hơn', points: 10 },
      { id: 'q8', type: 'fill_in', text: 'Lệnh tạo project React mới là: npx create-react-___', correctAnswer: 'app', points: 10 },
      { id: 'q9', type: 'multiple_choice', text: 'Status code 404 có nghĩa là gì?', options: ['Server Error', 'Not Found', 'Unauthorized', 'Bad Request'], correctAnswer: 'Not Found', points: 10 },
      { id: 'q10', type: 'multiple_choice', text: 'Cơ chế nào giúp React tối ưu render?', options: ['Virtual DOM', 'Real DOM', 'Shadow DOM', 'Document Object'], correctAnswer: 'Virtual DOM', points: 10 },
    ],
  } as any);
  exams.push(exam1);

  // Exam 2 - Approved, Next.js
  const exam2 = await examRepo.save({
    title: 'Bài thi Next.js 14 Professional',
    description: 'Kiểm tra kiến thức về Next.js 14 bao gồm App Router, Server Components, Data Fetching và Deployment.',
    type: ExamType.OFFICIAL,
    status: ExamStatus.APPROVED,
    courseId: courses[1].id,
    teacherId: teacher.id,
    timeLimit: 60,
    passingScore: 75,
    maxAttempts: 2,
    shuffleQuestions: true,
    showCorrectAnswers: false,
    certificateTemplateId: template2.id,
    questions: [
      { id: 'q1', type: 'multiple_choice', text: 'Next.js 14 sử dụng router nào mặc định?', options: ['Pages Router', 'App Router', 'React Router', 'Custom Router'], correctAnswer: 'App Router', points: 10 },
      { id: 'q2', type: 'true_false', text: 'Server Components không thể sử dụng useState.', correctAnswer: 'true', points: 5 },
      { id: 'q3', type: 'multiple_choice', text: 'File nào dùng để định nghĩa layout trong App Router?', options: ['_app.tsx', 'layout.tsx', 'template.tsx', '_document.tsx'], correctAnswer: 'layout.tsx', points: 10 },
      { id: 'q4', type: 'multiple_choice', text: 'Directive "use client" dùng để làm gì?', options: ['Tối ưu SEO', 'Đánh dấu Client Component', 'Bật cache', 'Gọi API'], correctAnswer: 'Đánh dấu Client Component', points: 10 },
      { id: 'q5', type: 'fill_in', text: 'Hàm để fetch data ở server side trong App Router là ___', correctAnswer: 'fetch', points: 10 },
      { id: 'q6', type: 'multiple_choice', text: 'Streaming trong Next.js sử dụng component nào?', options: ['Suspense', 'ErrorBoundary', 'Portal', 'Fragment'], correctAnswer: 'Suspense', points: 10 },
      { id: 'q7', type: 'true_false', text: 'Next.js hỗ trợ static site generation (SSG).', correctAnswer: 'true', points: 5 },
      { id: 'q8', type: 'multiple_choice', text: 'Middleware trong Next.js chạy ở đâu?', options: ['Client', 'Edge Runtime', 'Node.js Runtime', 'Browser'], correctAnswer: 'Edge Runtime', points: 10 },
    ],
  } as any);
  exams.push(exam2);

  // Exam 3 - Pending, Machine Learning
  const exam3 = await examRepo.save({
    title: 'Bài thi Machine Learning A-Z',
    description: 'Bài thi tổng hợp về Machine Learning bao gồm các thuật toán cơ bản, feature engineering và model evaluation.',
    type: ExamType.OFFICIAL,
    status: ExamStatus.PENDING,
    courseId: courses[3].id,
    teacherId: teacher.id,
    timeLimit: 120,
    passingScore: 65,
    maxAttempts: 3,
    shuffleQuestions: true,
    showCorrectAnswers: true,
    questions: [
      { id: 'q1', type: 'multiple_choice', text: 'Supervised Learning là gì?', options: ['Học không giám sát', 'Học có giám sát', 'Học tăng cường', 'Học bán giám sát'], correctAnswer: 'Học có giám sát', points: 10 },
      { id: 'q2', type: 'true_false', text: 'Decision Tree có thể dùng cho cả classification và regression.', correctAnswer: 'true', points: 5 },
      { id: 'q3', type: 'multiple_choice', text: 'Overfitting xảy ra khi nào?', options: ['Model quá đơn giản', 'Model quá phức tạp', 'Data quá nhiều', 'Không đủ features'], correctAnswer: 'Model quá phức tạp', points: 10 },
      { id: 'q4', type: 'multiple_choice', text: 'Thuật toán nào dùng cho clustering?', options: ['Linear Regression', 'K-Means', 'Logistic Regression', 'SVM'], correctAnswer: 'K-Means', points: 10 },
      { id: 'q5', type: 'fill_in', text: 'Thư viện ML phổ biến nhất của Python là scikit-___', correctAnswer: 'learn', points: 10 },
    ],
  } as any);
  exams.push(exam3);

  // Exam 4 - Practice, TypeScript
  const exam4 = await examRepo.save({
    title: 'Bài thi thực hành TypeScript',
    description: 'Bài thi thực hành kiểm tra kiến thức TypeScript type system, generics và best practices.',
    type: ExamType.PRACTICE,
    status: ExamStatus.APPROVED,
    courseId: courses[2].id,
    teacherId: teacher.id,
    timeLimit: 45,
    passingScore: 60,
    maxAttempts: 5,
    shuffleQuestions: false,
    showCorrectAnswers: true,
    questions: [
      { id: 'q1', type: 'multiple_choice', text: 'Kiểu "any" trong TypeScript có nghĩa gì?', options: ['Không có kiểu', 'Chấp nhận mọi kiểu', 'Kiểu số', 'Kiểu chuỗi'], correctAnswer: 'Chấp nhận mọi kiểu', points: 10 },
      { id: 'q2', type: 'true_false', text: 'Interface có thể extend nhiều interface khác.', correctAnswer: 'true', points: 5 },
      { id: 'q3', type: 'multiple_choice', text: 'Generic type dùng ký hiệu gì phổ biến nhất?', options: ['<T>', '<G>', '<A>', '<X>'], correctAnswer: '<T>', points: 10 },
      { id: 'q4', type: 'fill_in', text: 'Từ khóa để khai báo enum trong TypeScript là ___', correctAnswer: 'enum', points: 10 },
    ],
  } as any);
  exams.push(exam4);

  // Exam 5 - Draft, DevOps
  const exam5 = await examRepo.save({
    title: 'Bài thi DevOps & Docker',
    description: 'Kiểm tra kiến thức về Docker, Kubernetes và CI/CD pipelines.',
    type: ExamType.OFFICIAL,
    status: ExamStatus.DRAFT,
    courseId: courses[9].id,
    teacherId: teacher.id,
    timeLimit: 75,
    passingScore: 70,
    maxAttempts: 2,
    shuffleQuestions: true,
    showCorrectAnswers: true,
    questions: [
      { id: 'q1', type: 'multiple_choice', text: 'Docker container khác gì với Virtual Machine?', options: ['Không khác', 'Nhẹ hơn, dùng chung kernel', 'Nặng hơn', 'Chạy chậm hơn'], correctAnswer: 'Nhẹ hơn, dùng chung kernel', points: 10 },
      { id: 'q2', type: 'fill_in', text: 'File cấu hình Docker được gọi là ___file', correctAnswer: 'Docker', points: 10 },
      { id: 'q3', type: 'true_false', text: 'Kubernetes có thể tự động scale pods.', correctAnswer: 'true', points: 5 },
    ],
  } as any);
  exams.push(exam5);

  // Exam 6 - Approved, teacher2, AWS
  const exam6 = await examRepo.save({
    title: 'Bài thi AWS Solutions Architect',
    description: 'Bài thi mô phỏng chứng chỉ AWS Solutions Architect - Associate.',
    type: ExamType.OFFICIAL,
    status: ExamStatus.APPROVED,
    courseId: courses[13].id,
    teacherId: teacher2.id,
    timeLimit: 130,
    passingScore: 72,
    maxAttempts: 2,
    shuffleQuestions: true,
    showCorrectAnswers: false,
    certificateTemplateId: template8.id,
    questions: [
      { id: 'q1', type: 'multiple_choice', text: 'S3 là viết tắt của gì?', options: ['Simple Storage Service', 'Secure Storage System', 'Standard Storage Solution', 'Scalable Storage Service'], correctAnswer: 'Simple Storage Service', points: 10 },
      { id: 'q2', type: 'multiple_choice', text: 'EC2 instance type nào tối ưu cho compute-intensive?', options: ['T3', 'M5', 'C5', 'R5'], correctAnswer: 'C5', points: 10 },
      { id: 'q3', type: 'true_false', text: 'Lambda function có thể chạy tối đa 15 phút.', correctAnswer: 'true', points: 5 },
      { id: 'q4', type: 'multiple_choice', text: 'Dịch vụ nào dùng cho database quan hệ trên AWS?', options: ['DynamoDB', 'RDS', 'ElastiCache', 'Redshift'], correctAnswer: 'RDS', points: 10 },
      { id: 'q5', type: 'fill_in', text: 'Dịch vụ DNS của AWS là Route ___', correctAnswer: '53', points: 10 },
    ],
  } as any);
  exams.push(exam6);

  // ========== EXAM ATTEMPTS ==========
  console.log('📊 Creating exam attempts...');
  
  // Student 1 đã thi exam1 (React Fullstack) - passed
  await examAttemptRepo.save({
    examId: exam1.id,
    studentId: student.id,
    answers: [
      { questionId: 'q1', answer: 'useEffect', isCorrect: true, earnedPoints: 10 },
      { questionId: 'q2', answer: 'Tất cả đều đúng', isCorrect: true, earnedPoints: 10 },
      { questionId: 'q3', answer: 'false', isCorrect: true, earnedPoints: 5 },
      { questionId: 'q4', answer: 'PUT', isCorrect: true, earnedPoints: 10 },
      { questionId: 'q5', answer: 'JavaScript XML', isCorrect: true, earnedPoints: 10 },
      { questionId: 'q6', answer: 'true', isCorrect: true, earnedPoints: 5 },
      { questionId: 'q7', answer: 'Quản lý state đơn giản hơn', isCorrect: true, earnedPoints: 10 },
      { questionId: 'q8', answer: 'app', isCorrect: true, earnedPoints: 10 },
      { questionId: 'q9', answer: 'Not Found', isCorrect: true, earnedPoints: 10 },
      { questionId: 'q10', answer: 'Real DOM', isCorrect: false, earnedPoints: 0 },
    ],
    score: 90,
    earnedPoints: 80,
    totalPoints: 90,
    status: ExamAttemptStatus.COMPLETED,
    passed: true,
    certificateIssued: true,
    startedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    completedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000 + 65 * 60 * 1000),
    timeSpent: 3900,
  } as any);

  // Student 1 đã thi exam2 (Next.js) - passed
  await examAttemptRepo.save({
    examId: exam2.id,
    studentId: student.id,
    answers: [
      { questionId: 'q1', answer: 'App Router', isCorrect: true, earnedPoints: 10 },
      { questionId: 'q2', answer: 'true', isCorrect: true, earnedPoints: 5 },
      { questionId: 'q3', answer: 'layout.tsx', isCorrect: true, earnedPoints: 10 },
      { questionId: 'q4', answer: 'Đánh dấu Client Component', isCorrect: true, earnedPoints: 10 },
      { questionId: 'q5', answer: 'fetch', isCorrect: true, earnedPoints: 10 },
      { questionId: 'q6', answer: 'ErrorBoundary', isCorrect: false, earnedPoints: 0 },
      { questionId: 'q7', answer: 'true', isCorrect: true, earnedPoints: 5 },
      { questionId: 'q8', answer: 'Edge Runtime', isCorrect: true, earnedPoints: 10 },
    ],
    score: 85.7,
    earnedPoints: 60,
    totalPoints: 70,
    status: ExamAttemptStatus.COMPLETED,
    passed: true,
    startedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    completedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000 + 45 * 60 * 1000),
    timeSpent: 2700,
  } as any);

  // Student 1 thi TypeScript practice - in progress (chưa hoàn thành)
  await examAttemptRepo.save({
    examId: exam4.id,
    studentId: student.id,
    answers: [
      { questionId: 'q1', answer: 'Chấp nhận mọi kiểu', isCorrect: true, earnedPoints: 10 },
    ],
    score: 0,
    earnedPoints: 10,
    totalPoints: 35,
    status: ExamAttemptStatus.IN_PROGRESS,
    passed: false,
    startedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    timeSpent: 600,
  } as any);

  // Student 2 thi exam1 - passed
  await examAttemptRepo.save({
    examId: exam1.id,
    studentId: student2.id,
    answers: [
      { questionId: 'q1', answer: 'useEffect', isCorrect: true, earnedPoints: 10 },
      { questionId: 'q2', answer: 'cors', isCorrect: false, earnedPoints: 0 },
      { questionId: 'q3', answer: 'false', isCorrect: true, earnedPoints: 5 },
      { questionId: 'q4', answer: 'PUT', isCorrect: true, earnedPoints: 10 },
      { questionId: 'q5', answer: 'JavaScript XML', isCorrect: true, earnedPoints: 10 },
      { questionId: 'q6', answer: 'true', isCorrect: true, earnedPoints: 5 },
      { questionId: 'q7', answer: 'Quản lý state đơn giản hơn', isCorrect: true, earnedPoints: 10 },
      { questionId: 'q8', answer: 'app', isCorrect: true, earnedPoints: 10 },
      { questionId: 'q9', answer: 'Bad Request', isCorrect: false, earnedPoints: 0 },
      { questionId: 'q10', answer: 'Virtual DOM', isCorrect: true, earnedPoints: 10 },
    ],
    score: 77.8,
    earnedPoints: 70,
    totalPoints: 90,
    status: ExamAttemptStatus.COMPLETED,
    passed: true,
    startedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    completedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 80 * 60 * 1000),
    timeSpent: 4800,
  } as any);

  // Student 3 thi exam6 (AWS) - timed out
  await examAttemptRepo.save({
    examId: exam6.id,
    studentId: student3.id,
    answers: [
      { questionId: 'q1', answer: 'Simple Storage Service', isCorrect: true, earnedPoints: 10 },
      { questionId: 'q2', answer: 'T3', isCorrect: false, earnedPoints: 0 },
    ],
    score: 22.2,
    earnedPoints: 10,
    totalPoints: 45,
    status: ExamAttemptStatus.TIMED_OUT,
    passed: false,
    startedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    completedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 130 * 60 * 1000),
    timeSpent: 7800,
  } as any);

  // ========== QUIZZES ==========
  console.log('🧩 Creating quizzes...');
  const quizzes: Quiz[] = [];

  // Quiz cho khóa React Fullstack  
  const quiz1 = await quizRepo.save({
    title: 'Quiz: React Hooks cơ bản',
    description: 'Kiểm tra kiến thức về React Hooks: useState, useEffect, useContext',
    courseId: courses[0].id,
    timeLimit: 15,
    passingScore: 70,
    maxAttempts: 5,
    showCorrectAnswers: true,
    shuffleQuestions: false,
    questions: [
      { id: 'q1', type: 'multiple_choice', text: 'useState trả về gì?', options: ['Một giá trị', 'Một mảng [value, setter]', 'Một object', 'Một function'], correctAnswer: 'Một mảng [value, setter]', points: 10 },
      { id: 'q2', type: 'true_false', text: 'useEffect chạy trước khi component mount.', correctAnswer: 'false', points: 5 },
      { id: 'q3', type: 'multiple_choice', text: 'Hook nào dùng để chia sẻ state giữa components?', options: ['useState', 'useEffect', 'useContext', 'useMemo'], correctAnswer: 'useContext', points: 10 },
    ],
  } as any);
  quizzes.push(quiz1);

  const quiz2 = await quizRepo.save({
    title: 'Quiz: Node.js & Express',
    description: 'Kiểm tra kiến thức về Node.js runtime và Express framework',
    courseId: courses[0].id,
    timeLimit: 20,
    passingScore: 60,
    maxAttempts: 3,
    showCorrectAnswers: true,
    shuffleQuestions: true,
    questions: [
      { id: 'q1', type: 'multiple_choice', text: 'Node.js dùng engine nào?', options: ['V8', 'SpiderMonkey', 'Chakra', 'JavaScriptCore'], correctAnswer: 'V8', points: 10 },
      { id: 'q2', type: 'true_false', text: 'Express.js là một micro-framework.', correctAnswer: 'true', points: 5 },
      { id: 'q3', type: 'fill_in', text: 'Lệnh cài Express: npm install ___', correctAnswer: 'express', points: 10 },
    ],
  } as any);
  quizzes.push(quiz2);

  const quiz3 = await quizRepo.save({
    title: 'Quiz: Next.js App Router',
    description: 'Kiểm tra hiểu biết về App Router trong Next.js 14',
    courseId: courses[1].id,
    timeLimit: 10,
    passingScore: 80,
    maxAttempts: 3,
    showCorrectAnswers: true,
    shuffleQuestions: false,
    questions: [
      { id: 'q1', type: 'multiple_choice', text: 'File nào là entry point của một route?', options: ['index.tsx', 'page.tsx', 'route.tsx', 'main.tsx'], correctAnswer: 'page.tsx', points: 10 },
      { id: 'q2', type: 'true_false', text: 'loading.tsx tự động tạo Suspense boundary.', correctAnswer: 'true', points: 5 },
    ],
  } as any);
  quizzes.push(quiz3);

  // ========== QUIZ ATTEMPTS ==========
  console.log('📊 Creating quiz attempts...');

  // Student thi quiz1 - passed
  await quizAttemptRepo.save({
    studentId: student.id,
    quizId: quiz1.id,
    answers: [
      { questionId: 'q1', answer: 'Một mảng [value, setter]', isCorrect: true },
      { questionId: 'q2', answer: 'false', isCorrect: true },
      { questionId: 'q3', answer: 'useContext', isCorrect: true },
    ],
    score: 100,
    passed: true,
    status: QuizAttemptStatus.COMPLETED,
    startedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
    completedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000 + 8 * 60 * 1000),
    timeSpent: 480,
  } as any);

  // Student thi quiz2 - failed
  await quizAttemptRepo.save({
    studentId: student.id,
    quizId: quiz2.id,
    answers: [
      { questionId: 'q1', answer: 'SpiderMonkey', isCorrect: false },
      { questionId: 'q2', answer: 'true', isCorrect: true },
      { questionId: 'q3', answer: 'express', isCorrect: true },
    ],
    score: 60,
    passed: false,
    status: QuizAttemptStatus.COMPLETED,
    startedAt: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000),
    completedAt: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000 + 12 * 60 * 1000),
    timeSpent: 720,
  } as any);

  // Student 2 thi quiz1 - passed
  await quizAttemptRepo.save({
    studentId: student2.id,
    quizId: quiz1.id,
    answers: [
      { questionId: 'q1', answer: 'Một mảng [value, setter]', isCorrect: true },
      { questionId: 'q2', answer: 'true', isCorrect: false },
      { questionId: 'q3', answer: 'useContext', isCorrect: true },
    ],
    score: 80,
    passed: true,
    status: QuizAttemptStatus.COMPLETED,
    startedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
    completedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000 + 10 * 60 * 1000),
    timeSpent: 600,
  } as any);

  // ========== SCHEDULE ITEMS ==========
  console.log('📅 Creating schedule items...');

  await scheduleRepo.save([
    {
      title: 'Học bài 10: Server Components',
      course: 'Next.js 14 - The Complete Guide',
      type: 'lesson',
      status: 'todo',
      time: '09:00',
      duration: '45 phút',
      dueDate: '2026-02-12',
      completed: false,
      important: true,
      description: 'Tìm hiểu sâu về Server Components và cách chúng hoạt động trong Next.js 14',
      tags: ['Next.js', 'React'],
    },
    {
      title: 'Làm quiz React Hooks',
      course: 'Lập trình Web Full-stack với React & Node.js',
      type: 'exam',
      status: 'completed',
      time: '14:00',
      duration: '15 phút',
      dueDate: '2026-02-10',
      completed: true,
      important: false,
      description: 'Quiz kiểm tra kiến thức về React Hooks cơ bản',
      tags: ['React', 'Quiz'],
    },
    {
      title: 'Thi cuối khóa Machine Learning',
      course: 'Machine Learning A-Z: Hands-On Python',
      type: 'exam',
      status: 'todo',
      time: '10:00',
      duration: '120 phút',
      dueDate: '2026-02-25',
      completed: false,
      important: true,
      description: 'Bài thi tổng hợp các thuật toán Machine Learning',
      tags: ['ML', 'Python', 'Exam'],
    },
    {
      title: 'Thực hành Docker containers',
      course: 'DevOps với Docker & Kubernetes',
      type: 'lesson',
      status: 'in-progress',
      time: '16:00',
      duration: '60 phút',
      dueDate: '2026-02-11',
      completed: false,
      important: false,
      description: 'Thực hành tạo và quản lý Docker containers',
      tags: ['Docker', 'DevOps'],
    },
    {
      title: 'Live session: Code review project',
      course: 'Lập trình Web Full-stack với React & Node.js',
      type: 'live',
      status: 'todo',
      time: '20:00',
      duration: '90 phút',
      dueDate: '2026-02-15',
      completed: false,
      important: true,
      description: 'Giảng viên review code và hỏi đáp trực tiếp',
      tags: ['Live', 'React', 'Code Review'],
    },
    {
      title: 'Ôn tập TypeScript Generics',
      course: 'TypeScript từ Zero đến Hero',
      type: 'lesson',
      status: 'todo',
      time: '08:00',
      duration: '30 phút',
      dueDate: '2026-02-13',
      completed: false,
      important: false,
      description: 'Ôn tập kiến thức về Generics, Conditional Types và Mapped Types',
      tags: ['TypeScript'],
    },
    {
      title: 'Học Data Visualization với Matplotlib',
      course: 'Data Science Bootcamp 2024',
      type: 'lesson',
      status: 'todo',
      time: '11:00',
      duration: '50 phút',
      dueDate: '2026-02-14',
      completed: false,
      important: false,
      description: 'Tạo biểu đồ đẹp và chuyên nghiệp với Matplotlib và Seaborn',
      tags: ['Python', 'Data Science'],
    },
    {
      title: 'Nộp bài tập Flutter UI',
      course: 'Flutter & Dart - Xây dựng ứng dụng iOS và Android',
      type: 'exam',
      status: 'todo',
      time: '23:59',
      duration: '—',
      dueDate: '2026-02-18',
      completed: false,
      important: true,
      description: 'Deadline nộp bài tập thiết kế giao diện Flutter app',
      tags: ['Flutter', 'Dart', 'Deadline'],
    },
  ]);

  // ========== SYSTEM SETTINGS - Bổ sung đầy đủ ==========
  console.log('⚙️ Creating system settings...');
  const settingsData = [
    { key: 'about_ics', value: 'ICS Learning là nền tảng học trực tuyến hàng đầu Việt Nam, cung cấp các khóa học chất lượng cao trong lĩnh vực Công nghệ thông tin và các ngành nghề liên quan.' },
    { key: 'mission', value: 'Sứ mệnh của ICS Learning là mang đến cơ hội học tập chất lượng cao, dễ tiếp cận cho mọi người, giúp phát triển kỹ năng và sự nghiệp trong lĩnh vực công nghệ.' },
    { key: 'vision', value: 'Trở thành nền tảng edtech số 1 Việt Nam, kết nối học viên với các giảng viên hàng đầu và tạo ra cộng đồng học tập sôi động.' },
    { key: 'supportEmail', value: 'support@icslearning.vn' },
    { key: 'businessEmail', value: 'business@icslearning.vn' },
    { key: 'phone', value: '0987654321' },
    { key: 'hotline', value: '1900-xxxx' },
    { key: 'address', value: '123 Đường ABC, Quận XYZ, TP. Hồ Chí Minh, Việt Nam' },
    { key: 'workingHours', value: 'Thứ 2 - Thứ 6: 8:00 - 17:00' },
    { key: 'facebook', value: 'https://facebook.com/icslearning' },
    { key: 'instagram', value: 'https://instagram.com/icslearning' },
    { key: 'youtube', value: 'https://youtube.com/icslearning' },
    { key: 'tiktok', value: 'https://tiktok.com/@icslearning' },
    { key: 'linkedin', value: 'https://linkedin.com/company/icslearning' },
    { key: 'primaryColor', value: '#3b82f6' },
    { key: 'accentColor', value: '#f59e0b' },
    { key: 'language', value: 'vi' },
    { key: 'maintenanceMode', value: 'false' },
    { key: 'emailNotifications', value: 'true' },
    { key: 'aiAssistantEnabled', value: 'true' },
  ];

  for (const setting of settingsData) {
    await systemSettingRepo.upsert(setting, ['key']);
  }

  console.log('✅ Database seeded successfully!');
  console.log('\n📊 Summary:');
  console.log(`- ${await userRepo.count()} users`);
  console.log(`- ${await categoryRepo.count()} categories`);
  console.log(`- ${await courseRepo.count()} courses`);
  console.log(`- ${await lessonRepo.count()} lessons`);
  console.log(`- ${await enrollmentRepo.count()} enrollments`);
  console.log(`- ${await reviewRepo.count()} reviews`);
  console.log(`- ${await paymentRepo.count()} payments`);
  console.log(`- ${await certificateRepo.count()} certificates`);
  console.log(`- ${await certificateTemplateRepo.count()} certificate templates`);
  console.log(`- ${await examRepo.count()} exams`);
  console.log(`- ${await examAttemptRepo.count()} exam attempts`);
  console.log(`- ${await quizRepo.count()} quizzes`);
  console.log(`- ${await quizAttemptRepo.count()} quiz attempts`);
  console.log(`- ${await scheduleRepo.count()} schedule items`);
  console.log(`- ${await dataSource.getRepository(Note).count()} notes`);
  console.log(`- ${await dataSource.getRepository(Wishlist).count()} wishlist items`);
  console.log(`- ${await dataSource.getRepository(Cart).count()} cart items`);
  console.log(`- ${await dataSource.getRepository(Coupon).count()} coupons`);
  console.log(`- ${await dataSource.getRepository(Announcement).count()} announcements`);
  console.log(`- ${await dataSource.getRepository(Discussion).count()} discussions`);
  console.log(`- ${await dataSource.getRepository(Assignment).count()} assignments`);
  console.log(`- ${await dataSource.getRepository(AssignmentSubmission).count()} submissions`);
  console.log(`- ${await dataSource.getRepository(Resource).count()} resources`);
  console.log(`- ${await dataSource.getRepository(Notification).count()} notifications`);
  console.log(`- ${await systemSettingRepo.count()} system settings`);
}

function getLessonTitle(index: number, courseTitle: string): string {
  const titles = [
    'Giới thiệu khóa học và lộ trình học',
    'Cài đặt môi trường phát triển',
    'Kiến thức nền tảng cần thiết',
    'Bài tập thực hành đầu tiên',
    'Deep dive vào core concepts',
    'Best practices và patterns',
    'Xây dựng dự án thực tế - Phần 1',
    'Xây dựng dự án thực tế - Phần 2',
    'Kiểm thử và Gỡ lỗi',
    'Kỹ thuật tối ưu hóa',
    'Bảo mật và Hiệu năng',
    'Các chủ đề nâng cao',
    'Tình huống thực tế',
    'Các lỗi thường gặp và cách tránh',
    'Mẹo & Thủ thuật từ chuyên gia',
    'Tích hợp với các công cụ khác',
    'Triển khai lên production',
    'Giám sát và bảo trì',
    'Dự án cuối cùng và tổng kết',
  ];
  return titles[index % titles.length];
}

function getReviewComment(rating: number, courseTitle: string): string {
  const comments = {
    5: [
      `Khóa học "${courseTitle}" thật sự tuyệt vời! Giảng viên giải thích rất dễ hiểu và chi tiết. Mình đã học được rất nhiều kiến thức thực tế và áp dụng ngay vào công việc.`,
      `Nội dung khóa học rất chất lượng, đáng đồng tiền bát gạo! Cảm ơn thầy đã tạo ra khóa học này.`,
      `Học xong khóa này mình đã tự tin hơn rất nhiều. Dự án thực tế rất hữu ích. Highly recommended!`,
      `Khóa học hay nhất mà mình từng học về chủ đề này. Giảng viên rất nhiệt tình và chuyên nghiệp.`,
      `Perfect! Mọi thứ đều được giải thích rất rõ ràng. Bài tập thực hành phong phú và sát với thực tế.`
    ],
    4: [
      `Khóa học tốt, nội dung chi tiết. Tuy nhiên có thể cải thiện thêm phần thực hành. Overall vẫn rất đáng học!`,
      `Rất hài lòng với khóa học này. Sẽ giới thiệu cho bạn bè. Chỉ mong có thêm nhiều project thực tế hơn.`,
      `Nội dung khá đầy đủ, giảng viên nhiệt tình. 4 sao vì còn thiếu một số topics nâng cao.`,
      `Khóa học chất lượng, worth the price! Học được nhiều kiến thức bổ ích.`,
    ],
  };
  const ratingComments = comments[rating as 4 | 5] || comments[4];
  return ratingComments[Math.floor(Math.random() * ratingComments.length)];
}

function getNoteContent(): string {
  const contents = [
    'Điểm này rất quan trọng cần ghi nhớ để áp dụng vào dự án thực tế.',
    'Best practice được giảng viên nhấn mạnh. Cần review lại phần này.',
    'Code example rất hay, cần lưu lại để tham khảo sau này.',
    'Phần này hơi khó, cần xem lại video và practice nhiều hơn.',
    'Tips rất hữu ích từ giảng viên, note lại để không quên.',
    'Common mistakes cần tránh khi làm việc với phần này.',
    'Performance optimization tip - rất quan trọng cho production.',
  ];
  return contents[Math.floor(Math.random() * contents.length)];
}
