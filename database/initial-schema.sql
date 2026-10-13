-- iSYS v0.1 initial schema for Neon SQL Editor.
-- Execute once on an EMPTY development database.
CREATE TABLE IF NOT EXISTS "Building" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "address" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE TABLE IF NOT EXISTS "Task" (
  "id" TEXT PRIMARY KEY,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "completed" BOOLEAN NOT NULL DEFAULT FALSE,
  "buildingId" TEXT NOT NULL REFERENCES "Building"("id") ON DELETE CASCADE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS "Key" (
  "id" TEXT PRIMARY KEY,
  "label" TEXT NOT NULL,
  "holder" TEXT,
  "buildingId" TEXT NOT NULL REFERENCES "Building"("id") ON DELETE CASCADE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS "Inspection" (
  "id" TEXT PRIMARY KEY,
  "notes" TEXT,
  "inspectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "buildingId" TEXT NOT NULL REFERENCES "Building"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "Task_buildingId_idx" ON "Task"("buildingId");
CREATE INDEX IF NOT EXISTS "Key_buildingId_idx" ON "Key"("buildingId");
CREATE INDEX IF NOT EXISTS "Inspection_buildingId_idx" ON "Inspection"("buildingId");
