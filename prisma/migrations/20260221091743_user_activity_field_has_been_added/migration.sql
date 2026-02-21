-- CreateEnum
CREATE TYPE "IsActive" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPEND');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('BUY_PRODUCT', 'CREATE_POST', 'COMMENT', 'LIKE', 'BID', 'SEND_FANMAIL');

-- CreateEnum
CREATE TYPE "UserActivityType" AS ENUM ('BUY_PRODUCT', 'CREATE_POST', 'COMMENT', 'LIKE', 'BID', 'SEND_FANMAIL');

-- CreateTable
CREATE TABLE "UserActivity" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" "ActivityType" NOT NULL,
    "refId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PointTransaction" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "activity" "UserActivityType" NOT NULL,
    "points" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PointTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserActivity_userId_idx" ON "UserActivity"("userId");

-- CreateIndex
CREATE INDEX "UserActivity_createdAt_idx" ON "UserActivity"("createdAt");

-- CreateIndex
CREATE INDEX "PointTransaction_userId_idx" ON "PointTransaction"("userId");

-- AddForeignKey
ALTER TABLE "UserActivity" ADD CONSTRAINT "UserActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointTransaction" ADD CONSTRAINT "PointTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
