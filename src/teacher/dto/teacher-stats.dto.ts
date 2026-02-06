export interface TeacherDashboardStats {
  totalRevenue: number;
  totalStudents: number;
  totalCourses: number;
  activeCourses: number;
  totalViews: number;
  averageRating: number;
  completionRate: number;
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
  coursePerformance: {
    id: string;
    title: string;
    students: number;
    revenue: number;
    rating: number;
    completionRate: number;
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
  payments: {
    id: string;
    studentName: string;
    studentEmail: string;
    courseName: string;
    courseId: string;
    amount: number;
    method: string;
    status: string;
    date: Date;
    transactionId: string;
  }[];
}
