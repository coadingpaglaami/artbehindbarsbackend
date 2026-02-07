/*
  Warnings:

  - Added the required column `videoUrl` to the `Post` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "imageUrl" TEXT[],
ADD COLUMN     "videoUrl" TEXT NOT NULL;
