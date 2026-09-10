-- CreateTable
CREATE TABLE "ResultFile" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "fileKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "uploaded_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResultFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ResultFile_created_at_idx" ON "ResultFile"("created_at");

-- CreateIndex
CREATE INDEX "ResultFile_uploaded_by_id_idx" ON "ResultFile"("uploaded_by_id");

-- AddForeignKey
ALTER TABLE "ResultFile" ADD CONSTRAINT "ResultFile_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;