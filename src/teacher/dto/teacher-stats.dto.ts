export interface TeacherDashboardStats {
  totalRevenue: number;
  totalStudents: number;
  totalCourses: number;
  averageRating: number;
  revenueGrowth: number;
  studentGrowth: number;
  revenueChart: {
    labels: string[];
    data: number[];
  };
  studentChart: {
    labels: string[];
    data: number[];
  };
  weeklyPerformance: {
    day: string;
    revenue: number;
    target: number;
  }[];
  courseDistribution: {
    name: string;
    value: number;
  }[];
  recentEnrollments: {
    id: string;
    studentName: string;
    courseName: string;
    createdAt: Date;
    status?: string;
  }[];
}

export interface EarningsData {
  totalEarnings: number;
  pendingEarnings: number;
  paidEarnings: number;
  byCourse: {
    courseId: string;
    courseName: string;
    earnings: number;
    enrollments: number;
  }[];
}
