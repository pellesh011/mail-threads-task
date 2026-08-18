-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('FETCH_MESSAGES', 'REBUILD_THREADS');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'RUNNING', 'DONE', 'FAILED');

-- CreateTable
CREATE TABLE "Provider" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Provider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "sender" TEXT NOT NULL,
    "recipients" JSONB NOT NULL,
    "subject" TEXT NOT NULL,
    "sentAt" TIMESTAMPTZ NOT NULL,
    "parentId" TEXT,
    "threadId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageReference" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,

    CONSTRAINT "MessageReference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Thread" (
    "id" TEXT NOT NULL,
    "subject" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Thread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThreadReference" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,

    CONSTRAINT "ThreadReference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "type" "TaskType" NOT NULL,
    "data" JSONB NOT NULL,
    "status" "TaskStatus" NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RawMessage" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "externalId" TEXT,
    "payload" JSONB NOT NULL,
    "receivedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMPTZ,
    "messageId" TEXT,

    CONSTRAINT "RawMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Provider_name_key" ON "Provider"("name");

-- CreateIndex
CREATE UNIQUE INDEX "MessageReference_providerId_externalId_key" ON "MessageReference"("providerId", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "ThreadReference_providerId_externalId_key" ON "ThreadReference"("providerId", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "RawMessage_messageId_key" ON "RawMessage"("messageId");

-- CreateIndex
CREATE UNIQUE INDEX "RawMessage_providerId_externalId_key" ON "RawMessage"("providerId", "externalId");

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "Thread"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageReference" ADD CONSTRAINT "MessageReference_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageReference" ADD CONSTRAINT "MessageReference_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThreadReference" ADD CONSTRAINT "ThreadReference_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "Thread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThreadReference" ADD CONSTRAINT "ThreadReference_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RawMessage" ADD CONSTRAINT "RawMessage_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RawMessage" ADD CONSTRAINT "RawMessage_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;
