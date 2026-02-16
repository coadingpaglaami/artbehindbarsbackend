/*
  Warnings:

  - You are about to drop the column `pairKey` on the `Chat` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Chat_pairKey_key";

-- AlterTable
ALTER TABLE "Chat" DROP COLUMN "pairKey";
