-- CreateEnum
CREATE TYPE "AuctionStatus" AS ENUM ('Upcoming', 'Ongoing', 'Ended');

-- AlterTable
ALTER TABLE "Artwork" ADD COLUMN     "auctionStatus" "AuctionStatus" NOT NULL DEFAULT 'Upcoming';
