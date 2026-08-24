-- CreateEnum
CREATE TYPE "GifProviderType" AS ENUM ('GIPHY', 'TENOR');

-- CreateTable
CREATE TABLE "FavoriteGif" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "GifProviderType" NOT NULL,
    "providerGifId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "previewUrl" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FavoriteGif_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FavoriteGif_userId_provider_providerGifId_key" ON "FavoriteGif"("userId", "provider", "providerGifId");

-- AddForeignKey
ALTER TABLE "FavoriteGif" ADD CONSTRAINT "FavoriteGif_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
