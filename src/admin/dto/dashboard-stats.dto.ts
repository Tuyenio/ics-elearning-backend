export interface DashboardStats {
  totalRevenue: number;
  totalTeachers: number;
  totalStudents: number;
  totalCourses: number;
  revenueGrowth: number;
  teacherGrowth: number;
  studentGrowth: number;
  courseGrowth: number;
  revenueChart: {
    labels: string[];
    data: number[];
    teachers?: number[];
    students?: number[];
  };
  topCourses: {
    id: string;
    title: string;
    enrollments: number;
    revenue: number;
    thumbnail: string;
  }[];
  recentTransactions: {
    id: string;
    studentName: string;
    courseName: string;
    amount: number;
    status: string;
    createdAt: Date;
  }[];
  weeklyStats?: {
    day: string;
    activeUsers: number;
    newSignups: number;
  }[];
  categoryDistribution?: CategoryDistribution[];
  growthChart?: {
    month: string;
    teachers: number;
    students: number;
  }[];
}

export interface GrowthStats {
  teachersByMonth: {
    month: string;
    count: number;
  }[];
  studentsByMonth: {
    month: string;
    count: number;
  }[];
}

export interface CategoryDistribution {
  categoryName: string;
  courseCount: number;
  percentage: number;
}
