import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateQuizQuestionsAndAnswersTables1740000000022
  implements MigrationInterface
{
  private async resolveQuizSchema(queryRunner: QueryRunner): Promise<string> {
    const result = await queryRunner.query(`
      SELECT COALESCE(
        (
          SELECT table_schema
          FROM information_schema.tables
          WHERE table_name = 'quizzes'
          ORDER BY
            CASE table_schema
              WHEN 'learning' THEN 0
              WHEN current_schema() THEN 1
              WHEN 'public' THEN 2
              ELSE 3
            END
          LIMIT 1
        ),
        'public'
      ) AS schema
    `);

    const schema = result?.[0]?.schema;
    return typeof schema === 'string' && schema.trim() ? schema : 'public';
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    const schema = await this.resolveQuizSchema(queryRunner);
    const quizzesTable = `"${schema}"."quizzes"`;
    const quizQuestionsTable = `"${schema}"."quiz_questions"`;
    const quizAnswersTable = `"${schema}"."quiz_answers"`;

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ${quizQuestionsTable} (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "quizId" uuid NOT NULL,
        "contentHtml" text NOT NULL,
        "image" text,
        "difficulty" integer,
        "topic" varchar(255),
        "learningObj" text,
        "globalObj" text,
        "questionOrder" integer NOT NULL DEFAULT 1,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ${quizAnswersTable} (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "questionId" uuid NOT NULL,
        "content" text NOT NULL,
        "isCorrect" boolean NOT NULL DEFAULT false,
        "answerOrder" integer NOT NULL DEFAULT 1,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_quiz_questions_quizId" ON ${quizQuestionsTable} USING btree ("quizId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_quiz_questions_questionOrder" ON ${quizQuestionsTable} USING btree ("questionOrder")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_quiz_answers_questionId" ON ${quizAnswersTable} USING btree ("questionId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_quiz_answers_answerOrder" ON ${quizAnswersTable} USING btree ("answerOrder")`,
    );

    await queryRunner.query(
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_quiz_questions_quizId') THEN ALTER TABLE ${quizQuestionsTable} ADD CONSTRAINT "FK_quiz_questions_quizId" FOREIGN KEY ("quizId") REFERENCES ${quizzesTable}("id") ON DELETE CASCADE; END IF; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_quiz_answers_questionId') THEN ALTER TABLE ${quizAnswersTable} ADD CONSTRAINT "FK_quiz_answers_questionId" FOREIGN KEY ("questionId") REFERENCES ${quizQuestionsTable}("id") ON DELETE CASCADE; END IF; END $$`,
    );

    // Backfill normalized tables from existing legacy quizzes.questions JSON.
    await queryRunner.query(`
      WITH parsed AS (
        SELECT
          q.id AS quiz_id,
          elem,
          ordinality::int AS question_order
        FROM ${quizzesTable} q
        CROSS JOIN LATERAL jsonb_array_elements(
          CASE
            WHEN q."questions" IS NULL OR btrim(q."questions") = '' THEN '[]'::jsonb
            ELSE q."questions"::jsonb
          END
        ) WITH ORDINALITY AS e(elem, ordinality)
      )
      INSERT INTO ${quizQuestionsTable} (
        "quizId",
        "contentHtml",
        "image",
        "difficulty",
        "topic",
        "learningObj",
        "globalObj",
        "questionOrder"
      )
      SELECT
        p.quiz_id,
        COALESCE(
          NULLIF(p.elem->>'content_html', ''),
          NULLIF(p.elem->>'contentHtml', ''),
          NULLIF(p.elem->>'content', ''),
          NULLIF(p.elem->>'question', ''),
          'Question ' || p.question_order::text
        ) AS content_html,
        NULLIF(p.elem->>'image', ''),
        CASE WHEN (p.elem->>'difficulty') ~ '^[0-9]+$' THEN (p.elem->>'difficulty')::int ELSE NULL END,
        NULLIF(p.elem->>'topic', ''),
        NULLIF(COALESCE(p.elem->>'learningObj', p.elem->>'learning_obj'), ''),
        NULLIF(COALESCE(p.elem->>'globalObj', p.elem->>'global_obj'), ''),
        p.question_order
      FROM parsed p
      WHERE NOT EXISTS (
        SELECT 1
        FROM ${quizQuestionsTable} qq
        WHERE qq."quizId" = p.quiz_id AND qq."questionOrder" = p.question_order
      );
    `);

    await queryRunner.query(`
      WITH parsed AS (
        SELECT
          q.id AS quiz_id,
          elem,
          ordinality::int AS question_order
        FROM ${quizzesTable} q
        CROSS JOIN LATERAL jsonb_array_elements(
          CASE
            WHEN q."questions" IS NULL OR btrim(q."questions") = '' THEN '[]'::jsonb
            ELSE q."questions"::jsonb
          END
        ) WITH ORDINALITY AS e(elem, ordinality)
      ),
      options_cte AS (
        SELECT
          p.quiz_id,
          p.question_order,
          p.elem,
          opt.value AS option_text,
          opt.ordinality::int AS answer_order
        FROM parsed p
        CROSS JOIN LATERAL jsonb_array_elements_text(COALESCE(p.elem->'options', '[]'::jsonb)) WITH ORDINALITY AS opt(value, ordinality)
      )
      INSERT INTO ${quizAnswersTable} (
        "questionId",
        "content",
        "isCorrect",
        "answerOrder"
      )
      SELECT
        qq.id,
        o.option_text,
        CASE
          WHEN jsonb_typeof(o.elem->'correctAnswers') = 'array'
            AND (o.elem->'correctAnswers') ? ((o.answer_order - 1)::text)
            THEN true
          WHEN (o.elem->>'correctAnswer') ~ '^[0-9]+$'
            AND (o.elem->>'correctAnswer')::int = (o.answer_order - 1)
            THEN true
          ELSE false
        END AS is_correct,
        o.answer_order
      FROM options_cte o
      INNER JOIN ${quizQuestionsTable} qq
        ON qq."quizId" = o.quiz_id
       AND qq."questionOrder" = o.question_order
      WHERE NOT EXISTS (
        SELECT 1
        FROM ${quizAnswersTable} qa
        WHERE qa."questionId" = qq.id AND qa."answerOrder" = o.answer_order
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "learning"."quiz_answers" CASCADE');
    await queryRunner.query('DROP TABLE IF EXISTS "learning"."quiz_questions" CASCADE');
    await queryRunner.query('DROP TABLE IF EXISTS "public"."quiz_answers" CASCADE');
    await queryRunner.query('DROP TABLE IF EXISTS "public"."quiz_questions" CASCADE');
  }
}
