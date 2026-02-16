/*
  Warnings:

  - A unique constraint covering the columns `[pairKey]` on the table `Chat` will be added. If there are existing duplicate values, this will fail.
  - Made the column `pairKey` on table `Chat` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Chat" ALTER COLUMN "pairKey" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Chat_pairKey_key" ON "Chat"("pairKey");
