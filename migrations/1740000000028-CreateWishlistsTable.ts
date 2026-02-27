import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWishlistsTable1740000000028 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "wishlists" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "studentId" uuid NOT NULL,
        "courseId" uuid NOT NULL,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_wishlists_courseId') THEN ALTER TABLE \"wishlists\" ADD CONSTRAINT \"FK_wishlists_courseId\" FOREIGN KEY (\"courseId\") REFERENCES \"courses\"(\"id\") ON DELETE CASCADE; END IF; END $$");
    await queryRunner.query("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_wishlists_studentId') THEN ALTER TABLE \"wishlists\" ADD CONSTRAINT \"FK_wishlists_studentId\" FOREIGN KEY (\"studentId\") REFERENCES \"users\"(\"id\") ON DELETE CASCADE; END IF; END $$");
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_7e8bcc5c1ff10ae3aae0f551c9" ON "wishlists" USING btree ("studentId")');
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_432a76f72b5d6a760bcaf46997" ON "wishlists" USING btree ("courseId")');
    await queryRunner.query('CREATE UNIQUE INDEX IF NOT EXISTS "IDX_e281767f57b46cfb35bea5362a" ON "wishlists" USING btree ("studentId", "courseId")');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "wishlists" CASCADE');
  }
}
