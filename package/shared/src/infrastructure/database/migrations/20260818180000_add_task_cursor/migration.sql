-- AlterTable
ALTER TABLE "Task" ADD COLUMN "cursor" TEXT;

-- Backfill existing rows from the data payload.
-- The cursor for a task is nullable; a task with no cursor was the initial
-- (feed start) task or the sentinel carried in data as null.
UPDATE "Task"
SET "cursor" = NULLIF(data->>'cursor', '')
WHERE "cursor" IS NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Task_providerId_cursor_key" ON "Task"("providerId", "cursor");