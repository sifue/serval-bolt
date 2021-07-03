-- CreateTable
CREATE TABLE "Goodcounts" (
    "userId" VARCHAR(255) NOT NULL,
    "goodcount" INTEGER NOT NULL,

    PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "Goodreactions" (
    "itemUserId" VARCHAR(255) NOT NULL,
    "reactionUserId" VARCHAR(255) NOT NULL,
    "itemChannel" VARCHAR(255) NOT NULL,
    "itmeType" VARCHAR(255) NOT NULL,
    "itemTs" VARCHAR(255) NOT NULL,
    "eventTs" VARCHAR(255) NOT NULL,

    PRIMARY KEY ("itemUserId","reactionUserId","itemChannel","itmeType","itemTs")
);

-- CreateIndex
CREATE INDEX "Goodcounts.goodcount_index" ON "Goodcounts"("goodcount");

-- CreateIndex
CREATE INDEX "Goodreactions.eventTs_index" ON "Goodreactions"("eventTs");
