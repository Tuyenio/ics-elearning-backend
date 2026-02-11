import { MigrationInterface, QueryRunner } from 'typeorm';

export class OptimizeDatabase1768189114437 implements MigrationInterface {
  name = 'OptimizeDatabase1768189114437';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "certificates" DROP CONSTRAINT "FK_23287b04f9c0072b935a2abd6fc"`,
    );
    await queryRunner.query(
      `ALTER TABLE "certificates" DROP CONSTRAINT "FK_dd01ec6501540780943fe16cf75"`,
    );
    await queryRunner.query(
      `ALTER TABLE "certificates" DROP CONSTRAINT "FK_e50e73bc3bdcfb0eb3d561f1494"`,
    );
    await queryRunner.query(
      `ALTER TABLE "enrollments" DROP CONSTRAINT "FK_60dd0ae4e21002e63a5fdefeec8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "enrollments" DROP CONSTRAINT "FK_bf3ba3dfa95e2df7388eb4589fd"`,
    );
    await queryRunner.query(
      `ALTER TABLE "lesson_progress" DROP CONSTRAINT "FK_df13299d2740b302dd44a368df9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" DROP CONSTRAINT "FK_01ad76b89c3d4f612209556e2c3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" DROP CONSTRAINT "FK_63a921d8859a586e1fc91ff4f5f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "wishlists" DROP CONSTRAINT "FK_432a76f72b5d6a760bcaf469973"`,
    );
    await queryRunner.query(
      `ALTER TABLE "wishlists" DROP CONSTRAINT "FK_7e8bcc5c1ff10ae3aae0f551c95"`,
    );
    await queryRunner.query(
      `ALTER TABLE "courses" DROP CONSTRAINT "FK_c730473dfb837b3e62057cd9447"`,
    );
    await queryRunner.query(
      `ALTER TABLE "courses" DROP CONSTRAINT "FK_f921bd9bb6d061b90d386fa3721"`,
    );
    await queryRunner.query(
      `ALTER TABLE "quiz_attempts" DROP CONSTRAINT "FK_23f2bbe9288b221b1b377372782"`,
    );
    await queryRunner.query(
      `ALTER TABLE "quiz_attempts" DROP CONSTRAINT "FK_30ae16bcedd2b2663686edfc7a8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "quizzes" DROP CONSTRAINT "FK_9021b7e89ea353c02a361a10b72"`,
    );
    await queryRunner.query(
      `ALTER TABLE "quizzes" DROP CONSTRAINT "FK_eba9ff0775c843581aab6916b32"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" DROP CONSTRAINT "FK_00097d3b3147848e3585aabb433"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" DROP CONSTRAINT "FK_b2731e10aef7f886a08c552290e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notes" DROP CONSTRAINT "FK_30fe52bc8cca36dcb2156cba325"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notes" DROP CONSTRAINT "FK_a3fca84a5e23e9f5eb39e45fbbb"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notes" DROP CONSTRAINT "FK_c4b5e5ac09bb41db7967ccfe34d"`,
    );
    await queryRunner.query(`ALTER TABLE "certificates" DROP COLUMN "status"`);
    await queryRunner.query(
      `CREATE TYPE "public"."certificates_status_enum" AS ENUM('approved', 'pending', 'rejected')`,
    );
    await queryRunner.query(
      `ALTER TABLE "certificates" ADD "status" "public"."certificates_status_enum" NOT NULL DEFAULT 'approved'`,
    );
    await queryRunner.query(
      `ALTER TABLE "courses" ALTER COLUMN "teacherId" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ALTER COLUMN "studentId" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ALTER COLUMN "courseId" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" DROP COLUMN "paymentMethod"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."payments_paymentmethod_enum" AS ENUM('credit_card', 'debit_card', 'paypal', 'bank_transfer', 'wallet', 'qr_code', 'vnpay', 'momo')`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ADD "paymentMethod" "public"."payments_paymentmethod_enum" NOT NULL DEFAULT 'bank_transfer'`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ace513fa30d485cfd25c11a9e4" ON "users" ("role") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3676155292d72c67cd4e090514" ON "users" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3a10aa36cee83153e97161ab26" ON "categories" ("order") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_77d4cad977bd471fb670059561" ON "categories" ("isActive") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_dd01ec6501540780943fe16cf7" ON "certificates" ("studentId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e50e73bc3bdcfb0eb3d561f149" ON "certificates" ("courseId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_23287b04f9c0072b935a2abd6f" ON "certificates" ("enrollmentId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_bf3ba3dfa95e2df7388eb4589f" ON "enrollments" ("studentId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_60dd0ae4e21002e63a5fdefeec" ON "enrollments" ("courseId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3816714ab4c719d70e6b848744" ON "enrollments" ("status") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_1566a16b6323a3e3ade31a02c9" ON "enrollments" ("studentId", "courseId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_5bc4ad7572c19f8c12a67fee6b" ON "lesson_progress" ("enrollmentId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_df13299d2740b302dd44a368df" ON "lesson_progress" ("lessonId") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_36b8a65b9550e0b692d83da75e" ON "lesson_progress" ("enrollmentId", "lessonId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1a9ff2409a84c76560ae8a9259" ON "lessons" ("courseId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_63a921d8859a586e1fc91ff4f5" ON "reviews" ("studentId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_01ad76b89c3d4f612209556e2c" ON "reviews" ("courseId") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_9dc6cea0801d7e741404263db1" ON "reviews" ("studentId", "courseId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7e8bcc5c1ff10ae3aae0f551c9" ON "wishlists" ("studentId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_432a76f72b5d6a760bcaf46997" ON "wishlists" ("courseId") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_e281767f57b46cfb35bea5362a" ON "wishlists" ("studentId", "courseId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_889f2701163f86b2faf62a6247" ON "courses" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_502e69f02ab55229854706b50c" ON "courses" ("isFeatured") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d0cbe84b6054560cd1fae8693e" ON "courses" ("isBestseller") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f921bd9bb6d061b90d386fa372" ON "courses" ("teacherId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c730473dfb837b3e62057cd944" ON "courses" ("categoryId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_65d16228cfa6e88403acc8d466" ON "resources" ("course_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8f294aae89a7693f9cec1a6723" ON "resources" ("lesson_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9cf8aa3e8c65a062c8634306fa" ON "resources" ("uploaded_by") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_30ae16bcedd2b2663686edfc7a" ON "quiz_attempts" ("studentId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_23f2bbe9288b221b1b37737278" ON "quiz_attempts" ("quizId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f1bce034c61d74e1f4089f09ee" ON "quiz_attempts" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9021b7e89ea353c02a361a10b7" ON "quizzes" ("courseId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_eba9ff0775c843581aab6916b3" ON "quizzes" ("lessonId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b2731e10aef7f886a08c552290" ON "payments" ("studentId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_00097d3b3147848e3585aabb43" ON "payments" ("courseId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_32b41cdb985a296213e9a928b5" ON "payments" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_692a909ee0fa9383e7859f9b40" ON "notifications" ("userId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_92f5d3a7779be163cbea7916c6" ON "notifications" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_78207b2dc2b0d717649e89d3fc" ON "notifications" ("userId", "status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c4b5e5ac09bb41db7967ccfe34" ON "notes" ("studentId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a3fca84a5e23e9f5eb39e45fbb" ON "notes" ("courseId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_30fe52bc8cca36dcb2156cba32" ON "notes" ("lessonId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1ba8ab6cfb5f36d71ee2a64a96" ON "exams" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3dcd9199b8cd801383e623c3d1" ON "exams" ("courseId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_698b8b125b1bf0e0d4a38bee30" ON "exams" ("teacherId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4eb0dd11d0191d842a8331e91d" ON "exam_attempts" ("examId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b3cfd8fad204570a1d44884689" ON "exam_attempts" ("studentId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3c879f018119b90478b258e674" ON "exam_attempts" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_86f683d676a567be37cc9c06c8" ON "discussions" ("course_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_79212043b84fa5438c38ce1438" ON "discussions" ("lesson_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_cedb0b583906c7f01fc7bd4972" ON "discussions" ("author_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a2559be8d2f054ea1ca1430229" ON "discussions" ("parent_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_17e3c64fa107ec738f0675f744" ON "discussions" ("course_id", "lesson_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_cbfc36859d6d455581303e8508" ON "coupons" ("course_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_dc1cf7573d95d72ac52fe10a97" ON "coupons" ("created_by") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ed793a952de93a5f8d5dfdace5" ON "coupons" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b8db82101e5aa99f402480de70" ON "coupons" ("valid_from") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a6bc1eaa0dcc36e7ba5d0cf7e5" ON "coupons" ("valid_until") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f091e86a234693a49084b4c2c8" ON "cart" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ccbdf937aeec8a8e8fb3c454d6" ON "cart" ("course_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_600e91deee5626edd37578886c" ON "cart" ("user_id", "course_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_33f833f305070d2d4e6305d8a0" ON "assignments" ("course_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c0fda9de424e0e719787f6b576" ON "assignments" ("lesson_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_03fa66c20619cbc55aa4ebc69b" ON "assignments" ("created_by") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d642b9992b07da1049da26758b" ON "assignments" ("due_date") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ce6063ba9705d8ce937dfee002" ON "assignments" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e8f5ed3ae7b8b9e1f18fe9bb15" ON "announcements" ("course_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0a13cf0aa1f1a2666699ff473f" ON "announcements" ("author_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_65c9e70d7b3e7fa38e12309808" ON "announcements" ("is_pinned") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_84dd29edae1c7db1083e4cec08" ON "announcements" ("is_published") `,
    );
    await queryRunner.query(
      `ALTER TABLE "certificates" ADD CONSTRAINT "FK_dd01ec6501540780943fe16cf75" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "certificates" ADD CONSTRAINT "FK_e50e73bc3bdcfb0eb3d561f1494" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "certificates" ADD CONSTRAINT "FK_23287b04f9c0072b935a2abd6fc" FOREIGN KEY ("enrollmentId") REFERENCES "enrollments"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "enrollments" ADD CONSTRAINT "FK_bf3ba3dfa95e2df7388eb4589fd" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "enrollments" ADD CONSTRAINT "FK_60dd0ae4e21002e63a5fdefeec8" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "lesson_progress" ADD CONSTRAINT "FK_df13299d2740b302dd44a368df9" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" ADD CONSTRAINT "FK_63a921d8859a586e1fc91ff4f5f" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" ADD CONSTRAINT "FK_01ad76b89c3d4f612209556e2c3" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "wishlists" ADD CONSTRAINT "FK_7e8bcc5c1ff10ae3aae0f551c95" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "wishlists" ADD CONSTRAINT "FK_432a76f72b5d6a760bcaf469973" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "courses" ADD CONSTRAINT "FK_f921bd9bb6d061b90d386fa3721" FOREIGN KEY ("teacherId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "courses" ADD CONSTRAINT "FK_c730473dfb837b3e62057cd9447" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "quiz_attempts" ADD CONSTRAINT "FK_30ae16bcedd2b2663686edfc7a8" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "quiz_attempts" ADD CONSTRAINT "FK_23f2bbe9288b221b1b377372782" FOREIGN KEY ("quizId") REFERENCES "quizzes"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "quizzes" ADD CONSTRAINT "FK_9021b7e89ea353c02a361a10b72" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "quizzes" ADD CONSTRAINT "FK_eba9ff0775c843581aab6916b32" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ADD CONSTRAINT "FK_b2731e10aef7f886a08c552290e" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ADD CONSTRAINT "FK_00097d3b3147848e3585aabb433" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "notes" ADD CONSTRAINT "FK_c4b5e5ac09bb41db7967ccfe34d" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "notes" ADD CONSTRAINT "FK_a3fca84a5e23e9f5eb39e45fbbb" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "notes" ADD CONSTRAINT "FK_30fe52bc8cca36dcb2156cba325" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "notes" DROP CONSTRAINT "FK_30fe52bc8cca36dcb2156cba325"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notes" DROP CONSTRAINT "FK_a3fca84a5e23e9f5eb39e45fbbb"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notes" DROP CONSTRAINT "FK_c4b5e5ac09bb41db7967ccfe34d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" DROP CONSTRAINT "FK_00097d3b3147848e3585aabb433"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" DROP CONSTRAINT "FK_b2731e10aef7f886a08c552290e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "quizzes" DROP CONSTRAINT "FK_eba9ff0775c843581aab6916b32"`,
    );
    await queryRunner.query(
      `ALTER TABLE "quizzes" DROP CONSTRAINT "FK_9021b7e89ea353c02a361a10b72"`,
    );
    await queryRunner.query(
      `ALTER TABLE "quiz_attempts" DROP CONSTRAINT "FK_23f2bbe9288b221b1b377372782"`,
    );
    await queryRunner.query(
      `ALTER TABLE "quiz_attempts" DROP CONSTRAINT "FK_30ae16bcedd2b2663686edfc7a8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "courses" DROP CONSTRAINT "FK_c730473dfb837b3e62057cd9447"`,
    );
    await queryRunner.query(
      `ALTER TABLE "courses" DROP CONSTRAINT "FK_f921bd9bb6d061b90d386fa3721"`,
    );
    await queryRunner.query(
      `ALTER TABLE "wishlists" DROP CONSTRAINT "FK_432a76f72b5d6a760bcaf469973"`,
    );
    await queryRunner.query(
      `ALTER TABLE "wishlists" DROP CONSTRAINT "FK_7e8bcc5c1ff10ae3aae0f551c95"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" DROP CONSTRAINT "FK_01ad76b89c3d4f612209556e2c3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" DROP CONSTRAINT "FK_63a921d8859a586e1fc91ff4f5f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "lesson_progress" DROP CONSTRAINT "FK_df13299d2740b302dd44a368df9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "enrollments" DROP CONSTRAINT "FK_60dd0ae4e21002e63a5fdefeec8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "enrollments" DROP CONSTRAINT "FK_bf3ba3dfa95e2df7388eb4589fd"`,
    );
    await queryRunner.query(
      `ALTER TABLE "certificates" DROP CONSTRAINT "FK_23287b04f9c0072b935a2abd6fc"`,
    );
    await queryRunner.query(
      `ALTER TABLE "certificates" DROP CONSTRAINT "FK_e50e73bc3bdcfb0eb3d561f1494"`,
    );
    await queryRunner.query(
      `ALTER TABLE "certificates" DROP CONSTRAINT "FK_dd01ec6501540780943fe16cf75"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_84dd29edae1c7db1083e4cec08"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_65c9e70d7b3e7fa38e12309808"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_0a13cf0aa1f1a2666699ff473f"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e8f5ed3ae7b8b9e1f18fe9bb15"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ce6063ba9705d8ce937dfee002"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_d642b9992b07da1049da26758b"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_03fa66c20619cbc55aa4ebc69b"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c0fda9de424e0e719787f6b576"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_33f833f305070d2d4e6305d8a0"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_600e91deee5626edd37578886c"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ccbdf937aeec8a8e8fb3c454d6"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f091e86a234693a49084b4c2c8"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_a6bc1eaa0dcc36e7ba5d0cf7e5"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b8db82101e5aa99f402480de70"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ed793a952de93a5f8d5dfdace5"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_dc1cf7573d95d72ac52fe10a97"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_cbfc36859d6d455581303e8508"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_17e3c64fa107ec738f0675f744"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_a2559be8d2f054ea1ca1430229"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_cedb0b583906c7f01fc7bd4972"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_79212043b84fa5438c38ce1438"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_86f683d676a567be37cc9c06c8"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3c879f018119b90478b258e674"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b3cfd8fad204570a1d44884689"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_4eb0dd11d0191d842a8331e91d"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_698b8b125b1bf0e0d4a38bee30"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3dcd9199b8cd801383e623c3d1"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_1ba8ab6cfb5f36d71ee2a64a96"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_30fe52bc8cca36dcb2156cba32"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_a3fca84a5e23e9f5eb39e45fbb"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c4b5e5ac09bb41db7967ccfe34"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_78207b2dc2b0d717649e89d3fc"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_92f5d3a7779be163cbea7916c6"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_692a909ee0fa9383e7859f9b40"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_32b41cdb985a296213e9a928b5"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_00097d3b3147848e3585aabb43"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b2731e10aef7f886a08c552290"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_eba9ff0775c843581aab6916b3"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_9021b7e89ea353c02a361a10b7"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f1bce034c61d74e1f4089f09ee"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_23f2bbe9288b221b1b37737278"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_30ae16bcedd2b2663686edfc7a"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_9cf8aa3e8c65a062c8634306fa"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_8f294aae89a7693f9cec1a6723"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_65d16228cfa6e88403acc8d466"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c730473dfb837b3e62057cd944"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f921bd9bb6d061b90d386fa372"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_d0cbe84b6054560cd1fae8693e"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_502e69f02ab55229854706b50c"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_889f2701163f86b2faf62a6247"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e281767f57b46cfb35bea5362a"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_432a76f72b5d6a760bcaf46997"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_7e8bcc5c1ff10ae3aae0f551c9"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_9dc6cea0801d7e741404263db1"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_01ad76b89c3d4f612209556e2c"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_63a921d8859a586e1fc91ff4f5"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_1a9ff2409a84c76560ae8a9259"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_36b8a65b9550e0b692d83da75e"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_df13299d2740b302dd44a368df"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_5bc4ad7572c19f8c12a67fee6b"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_1566a16b6323a3e3ade31a02c9"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3816714ab4c719d70e6b848744"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_60dd0ae4e21002e63a5fdefeec"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_bf3ba3dfa95e2df7388eb4589f"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_23287b04f9c0072b935a2abd6f"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e50e73bc3bdcfb0eb3d561f149"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_dd01ec6501540780943fe16cf7"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_77d4cad977bd471fb670059561"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3a10aa36cee83153e97161ab26"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3676155292d72c67cd4e090514"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ace513fa30d485cfd25c11a9e4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" DROP COLUMN "paymentMethod"`,
    );
    await queryRunner.query(`DROP TYPE "public"."payments_paymentmethod_enum"`);
    await queryRunner.query(
      `ALTER TABLE "payments" ADD "paymentMethod" character varying NOT NULL DEFAULT 'bank_transfer'`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ALTER COLUMN "courseId" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ALTER COLUMN "studentId" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "courses" ALTER COLUMN "teacherId" SET NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "certificates" DROP COLUMN "status"`);
    await queryRunner.query(`DROP TYPE "public"."certificates_status_enum"`);
    await queryRunner.query(
      `ALTER TABLE "certificates" ADD "status" character varying NOT NULL DEFAULT 'approved'`,
    );
    await queryRunner.query(
      `ALTER TABLE "notes" ADD CONSTRAINT "FK_c4b5e5ac09bb41db7967ccfe34d" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "notes" ADD CONSTRAINT "FK_a3fca84a5e23e9f5eb39e45fbbb" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "notes" ADD CONSTRAINT "FK_30fe52bc8cca36dcb2156cba325" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ADD CONSTRAINT "FK_b2731e10aef7f886a08c552290e" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ADD CONSTRAINT "FK_00097d3b3147848e3585aabb433" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "quizzes" ADD CONSTRAINT "FK_eba9ff0775c843581aab6916b32" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "quizzes" ADD CONSTRAINT "FK_9021b7e89ea353c02a361a10b72" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "quiz_attempts" ADD CONSTRAINT "FK_30ae16bcedd2b2663686edfc7a8" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "quiz_attempts" ADD CONSTRAINT "FK_23f2bbe9288b221b1b377372782" FOREIGN KEY ("quizId") REFERENCES "quizzes"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "courses" ADD CONSTRAINT "FK_f921bd9bb6d061b90d386fa3721" FOREIGN KEY ("teacherId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "courses" ADD CONSTRAINT "FK_c730473dfb837b3e62057cd9447" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "wishlists" ADD CONSTRAINT "FK_7e8bcc5c1ff10ae3aae0f551c95" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "wishlists" ADD CONSTRAINT "FK_432a76f72b5d6a760bcaf469973" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" ADD CONSTRAINT "FK_63a921d8859a586e1fc91ff4f5f" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" ADD CONSTRAINT "FK_01ad76b89c3d4f612209556e2c3" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "lesson_progress" ADD CONSTRAINT "FK_df13299d2740b302dd44a368df9" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "enrollments" ADD CONSTRAINT "FK_bf3ba3dfa95e2df7388eb4589fd" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "enrollments" ADD CONSTRAINT "FK_60dd0ae4e21002e63a5fdefeec8" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "certificates" ADD CONSTRAINT "FK_e50e73bc3bdcfb0eb3d561f1494" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "certificates" ADD CONSTRAINT "FK_dd01ec6501540780943fe16cf75" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "certificates" ADD CONSTRAINT "FK_23287b04f9c0072b935a2abd6fc" FOREIGN KEY ("enrollmentId") REFERENCES "enrollments"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
