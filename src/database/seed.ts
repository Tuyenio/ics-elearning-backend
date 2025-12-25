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
import { Note } from '../notes/entities/note.entity';
import { Wishlist } from '../wishlists/entities/wishlist.entity';
import { Cart } from '../cart/entities/cart.entity';
import { Coupon, CouponType, CouponStatus } from '../coupons/entities/coupon.entity';
import { Announcement, AnnouncementPriority } from '../announcements/entities/announcement.entity';
import { Discussion } from '../discussions/entities/discussion.entity';
import { Assignment, AssignmentStatus, AssignmentSubmission, SubmissionStatus } from '../assignments/entities/assignment.entity';
import { Resource, ResourceType } from '../resources/entities/resource.entity';
import { Notification, NotificationType, NotificationStatus } from '../notifications/entities/notification.entity';

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
  const cartRepo = dataSource.getRepository(Cart);
  const couponRepo = dataSource.getRepository(Coupon);
  const announcementRepo = dataSource.getRepository(Announcement);
  const discussionRepo = dataSource.getRepository(Discussion);
  const assignmentRepo = dataSource.getRepository(Assignment);
  const submissionRepo = dataSource.getRepository(AssignmentSubmission);
  const resourceRepo = dataSource.getRepository(Resource);
  const notificationRepo = dataSource.getRepository(Notification);

  // Clear existing data
  console.log('🗑️  Clearing existing data...');
  
  // Use CASCADE to handle foreign key constraints
  const tables = [
    'certificates',
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

  const students: User[] = [student]; // Array for compatibility with existing code

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

  // Create Enrollments, Progress, Reviews, Payments for the student
  console.log('📊 Creating enrollments and progress for student...');
  
  // Student enrolls in 8 courses (most of them)
  const enrolledCoursesCount = 8;
  const enrolledCourses = courses.slice(0, enrolledCoursesCount);
  const enrollments: any[] = [];

  for (let courseIndex = 0; courseIndex < enrolledCourses.length; courseIndex++) {
    const course = enrolledCourses[courseIndex];
    
    // Create Payment
    const payment = await paymentRepo.save({
      transactionId: `TXN${Date.now()}${courseIndex}${course.id.substring(0, 6)}`,
      studentId: student.id,
      courseId: course.id,
      amount: course.price,
      discountAmount: course.price - course.discountPrice,
      finalAmount: course.discountPrice,
      currency: 'VND',
      status: PaymentStatus.COMPLETED,
      paymentMethod: [PaymentMethod.CREDIT_CARD, PaymentMethod.WALLET, PaymentMethod.QR_CODE][courseIndex % 3],
      paidAt: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000), // Last 60 days
      paymentGatewayId: `GW${Date.now()}${courseIndex}`,
      metadata: {
        paymentMethod: 'Online',
        bankCode: courseIndex % 2 === 0 ? 'VCB' : 'TCB',
      }
    });

    // Create Enrollment with varying progress
    const progress = courseIndex < 3 ? 100 : courseIndex < 5 ? Math.floor(50 + Math.random() * 50) : Math.floor(Math.random() * 50);
    const isCompleted = progress >= 90;
    const enrollment = await enrollmentRepo.save({
      studentId: student.id,
      courseId: course.id,
      status: isCompleted ? EnrollmentStatus.COMPLETED : EnrollmentStatus.ACTIVE,
      progress,
      completedAt: isCompleted ? new Date() : undefined,
      lastAccessedAt: new Date(Date.now() - Math.random() * 3 * 24 * 60 * 60 * 1000), // Last 3 days
    } as any);
    enrollments.push(enrollment);
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
          completedAt: new Date(Date.now() - (lessons.length - j) * 24 * 60 * 60 * 1000),
        });
      } else if (j === completedLessons) {
        // Current lesson in progress
        await lessonProgressRepo.save({
          enrollmentId: enrollment.id,
          lessonId: lessons[j].id,
          isCompleted: false,
          progress: Math.floor(Math.random() * 80),
          lastPosition: Math.floor(lessons[j].duration * Math.random() * 0.8),
          completedAt: undefined,
        } as any);
      }
    }

    // Create Review if course is completed
    if (isCompleted) {
      const rating = 4 + Math.floor(Math.random() * 2); // 4 or 5 stars
      await reviewRepo.save({
        studentId: student.id,
        courseId: course.id,
        rating,
        comment: getReviewComment(rating, course.title),
        isVerifiedPurchase: true,
        isPublished: true,
        helpfulCount: Math.floor(Math.random() * 50),
      });

      await courseRepo.increment({ id: course.id }, 'reviewCount', 1);
      
      // Update course rating
      const reviews = await reviewRepo.find({ where: { courseId: course.id } });
      const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
      await courseRepo.update(course.id, { rating: Math.round(avgRating * 10) / 10 });

      // Create Certificate
      await certificateRepo.save({
        certificateNumber: `ICS-CERT-${Date.now()}-${courseIndex}`,
        studentId: student.id,
        courseId: course.id,
        enrollmentId: enrollment.id,
        issueDate: new Date(),
        pdfUrl: `/certificates/${enrollment.id}.pdf`,
        imageUrl: `/certificates/${enrollment.id}.jpg`,
        metadata: {
          courseName: course.title,
          studentName: student.name,
          completionDate: new Date().toISOString(),
          instructor: teacher.name,
        }
      });
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
        content: `Ghi chú quan trọng cho bài "${lesson.title}": ${getNoteContent()}`,
        timestamp: Math.floor(lesson.duration * Math.random()),
      });
    }
  }

  // Create wishlist for student
  console.log('❤️ Creating wishlist...');
  const wishlistCourses = courses.slice(enrolledCoursesCount, enrolledCoursesCount + 3);
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

  // Create Notifications
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
  ]);

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
