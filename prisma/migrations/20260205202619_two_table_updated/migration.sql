-- AlterTable
ALTER TABLE "Artwork" ALTER COLUMN "startingBidPrice" SET DEFAULT 0;

-- CreateTable
CREATE TABLE "Auction" (
    "id" UUID NOT NULL,
    "artworkId" UUID NOT NULL,
    "startPrice" DOUBLE PRECISION NOT NULL,
    "currentPrice" DOUBLE PRECISION NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "status" "AuctionStatus" NOT NULL DEFAULT 'Upcoming',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Auction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuctionBid" (
    "id" UUID NOT NULL,
    "auctionId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "bidPrice" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuctionBid_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Auction_artworkId_key" ON "Auction"("artworkId");

-- AddForeignKey
ALTER TABLE "Auction" ADD CONSTRAINT "Auction_artworkId_fkey" FOREIGN KEY ("artworkId") REFERENCES "Artwork"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuctionBid" ADD CONSTRAINT "AuctionBid_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "Auction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuctionBid" ADD CONSTRAINT "AuctionBid_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
