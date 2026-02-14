-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_artworkId_fkey";

-- AlterTable
ALTER TABLE "Auction" ADD COLUMN     "winnerId" UUID;

-- AlterTable
ALTER TABLE "Order" ALTER COLUMN "artworkId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Auction" ADD CONSTRAINT "Auction_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_artworkId_fkey" FOREIGN KEY ("artworkId") REFERENCES "Artwork"("id") ON DELETE SET NULL ON UPDATE CASCADE;
