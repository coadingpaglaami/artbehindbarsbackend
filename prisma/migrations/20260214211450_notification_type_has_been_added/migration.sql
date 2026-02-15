-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('PAYMENT', 'LIKE', 'COMMENT', 'ADMIN', 'INFO');

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "type" "NotificationType" NOT NULL DEFAULT 'INFO';
