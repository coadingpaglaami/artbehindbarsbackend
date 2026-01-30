-- CreateEnum
CREATE TYPE "Category" AS ENUM ('Religious', 'Non_Religious');

-- CreateTable
CREATE TABLE "Artist" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "lifeSentence" TEXT NOT NULL,
    "facilityName" TEXT NOT NULL,
    "inmateId" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "minReleaseDate" TIMESTAMP(3) NOT NULL,
    "maxReleaseDate" TIMESTAMP(3) NOT NULL,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Artist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Artwork" (
    "id" UUID NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "title" TEXT,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "category" "Category" NOT NULL,
    "buyItNowPrice" DOUBLE PRECISION NOT NULL,
    "startingBidPrice" DOUBLE PRECISION,
    "artistId" UUID,
    "uploadedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Artwork_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Artist" ADD CONSTRAINT "Artist_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Artwork" ADD CONSTRAINT "Artwork_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Artwork" ADD CONSTRAINT "Artwork_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
