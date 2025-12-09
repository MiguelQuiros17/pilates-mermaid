-- SQL script to delete all Spanish (es-CR) localization strings from the database
-- Run this in your database management tool (SQL Server Management Studio, Azure Data Studio, etc.)

-- First, find the Spanish culture ID
SELECT Id, Culture, IsDefault 
FROM LocalizationCultures 
WHERE Culture = 'es-CR';

-- Delete all Spanish localization strings
-- Replace {SPANISH_CULTURE_ID} with the actual ID from the query above
DELETE FROM LocalizationStrings 
WHERE LocalizationCultureId = (SELECT Id FROM LocalizationCultures WHERE Culture = 'es-CR');

-- Verify deletion
SELECT COUNT(*) as RemainingSpanishStrings
FROM LocalizationStrings 
WHERE LocalizationCultureId = (SELECT Id FROM LocalizationCultures WHERE Culture = 'es-CR');

