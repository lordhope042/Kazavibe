-- CreateTable
CREATE TABLE "Feedback" (
    "id"        TEXT         NOT NULL,
    "userId"    TEXT         NOT NULL,
    "category"  TEXT         NOT NULL,
    "message"   TEXT         NOT NULL,
    "rating"    INTEGER,
    "page"      TEXT,
    "handled"   BOOLEAN      NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Feedback_handled_createdAt_idx" ON "Feedback"("handled", "createdAt");

-- CreateIndex
CREATE INDEX "Feedback_userId_createdAt_idx" ON "Feedback"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
