import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddIsFavoriteToNotes1817011200000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumn(
            "notes",
            new TableColumn({
                name: "isFavorite",
                type: "boolean",
                default: false,
                isNullable: false,
            })
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn("notes", "isFavorite");
    }

}
