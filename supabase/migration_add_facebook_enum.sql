-- =============================================================================
-- MIGRATION: Add 'Facebook' to contact_platform enum
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- Safe to run multiple times — IF NOT EXISTS prevents duplicate errors
-- =============================================================================

-- Add Facebook to the enum if it doesn't already exist
ALTER TYPE contact_platform ADD VALUE IF NOT EXISTS 'Facebook';

-- Verify the enum values after migration:
-- SELECT enum_range(NULL::contact_platform);
