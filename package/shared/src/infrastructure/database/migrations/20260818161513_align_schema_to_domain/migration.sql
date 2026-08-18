-- AlterEnum
ALTER TYPE "TaskType" RENAME VALUE 'FETCH_MESSAGES' TO 'IMPORT_MESSAGES';
ALTER TYPE "TaskType" RENAME VALUE 'REBUILD_THREADS' TO 'BUILD_THREADS';

-- AlterEnum
ALTER TYPE "TaskStatus" RENAME VALUE 'DONE' TO 'COMPLETED';

-- AlterTable
ALTER TABLE "Message" DROP COLUMN "recipients";
ALTER TABLE "Message" DROP COLUMN "metadata";
ALTER TABLE "Message" ALTER COLUMN "subject" DROP NOT NULL;

-- CreateTable
CREATE TABLE "MessageToMessageReference" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "referencedMessageId" TEXT NOT NULL,

    CONSTRAINT "MessageToMessageReference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MessageToMessageReference_messageId_referencedMessageId_key" ON "MessageToMessageReference"("messageId", "referencedMessageId");

-- AddForeignKey
ALTER TABLE "MessageToMessageReference" ADD CONSTRAINT "MessageToMessageReference_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageToMessageReference" ADD CONSTRAINT "MessageToMessageReference_referencedMessageId_fkey" FOREIGN KEY ("referencedMessageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;