-- CreateEnum
CREATE TYPE "FanMailStatus" AS ENUM ('PENDING', 'REPLIED', 'CLOSED');

-- CreateTable
CREATE TABLE "FanMail" (
    "id" UUID NOT NULL,
    "artistId" UUID NOT NULL,
    "senderUserId" UUID NOT NULL,
    "subject" TEXT,
    "message" TEXT NOT NULL,
    "status" "FanMailStatus" NOT NULL DEFAULT 'PENDING',
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "repliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FanMail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FanMailReply" (
    "id" UUID NOT NULL,
    "fanMailId" UUID NOT NULL,
    "adminId" UUID NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FanMailReply_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FanMail_artistId_idx" ON "FanMail"("artistId");

-- CreateIndex
CREATE INDEX "FanMail_senderUserId_idx" ON "FanMail"("senderUserId");

-- AddForeignKey
ALTER TABLE "FanMail" ADD CONSTRAINT "FanMail_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FanMail" ADD CONSTRAINT "FanMail_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FanMailReply" ADD CONSTRAINT "FanMailReply_fanMailId_fkey" FOREIGN KEY ("fanMailId") REFERENCES "FanMail"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FanMailReply" ADD CONSTRAINT "FanMailReply_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
