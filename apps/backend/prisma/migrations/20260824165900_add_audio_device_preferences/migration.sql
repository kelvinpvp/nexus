-- AlterTable
ALTER TABLE "UserPreference" ADD COLUMN "audioInputDeviceId" TEXT,
                             ADD COLUMN "audioOutputDeviceId" TEXT,
                             ADD COLUMN "noiseSuppressionEnabled" BOOLEAN NOT NULL DEFAULT true;
