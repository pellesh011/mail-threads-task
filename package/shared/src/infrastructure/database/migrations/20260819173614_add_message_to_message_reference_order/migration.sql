-- AlterTable
ALTER TABLE "MessageToMessageReference" ADD COLUMN "order" INTEGER;
UPDATE "MessageToMessageReference" SET "order" = 0;
ALTER TABLE "MessageToMessageReference" ALTER COLUMN "order" SET NOT NULL;