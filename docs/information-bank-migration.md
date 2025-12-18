# Information Bank Migration Guide

## Overview

The Information Bank has been significantly enhanced to provide a more structured and organized way to store your professional information. This guide explains the changes and how to migrate from the old custom sections to the new structured sections.

## What Changed

### Before (v4.x and earlier)
The Information Bank only supported:
- **Basics** - Name, email, phone, location, etc.
- **Summary** - Professional summary
- **Custom Sections** - Free-form sections with just a name and content

All other information (work experience, education, certifications, etc.) had to be stored in generic "custom sections" which lost all structure and couldn't be properly utilized by AI features.

### After (v5.x and later)
The Information Bank now supports all standard resume sections:

| Section | Description | Title Display | Description Display |
|---------|-------------|---------------|---------------------|
| **Basics** | Personal information | - | - |
| **Summary** | Professional summary | - | - |
| **Profiles** | Social media & professional networks | Network name | Username |
| **Experience** | Work history | Company | Position |
| **Education** | Academic background | Institution | Area of study |
| **Skills** | Technical & professional skills | Skill name | Description/Keywords |
| **Languages** | Languages spoken | Language | Fluency level |
| **Certifications** | Professional certifications | Name | Issuer |
| **Awards** | Honors & recognition | Title | Awarder |
| **Projects** | Personal & professional projects | Name | Description |
| **Publications** | Articles, papers, books | Name | Publisher |
| **Volunteering** | Community involvement | Organization | Position |
| **Interests** | Hobbies & interests | Name | Keywords |
| **References** | Professional references | Name | Relationship |

## Benefits of the New Structure

1. **Better AI Generation** - Structured data allows AI to generate more accurate and tailored resumes and cover letters.

2. **Improved Autofill** - The browser extension can now accurately fill job application forms with your structured data.

3. **Consistency** - Your Information Bank now mirrors the structure of your resumes, making it easier to manage.

4. **Validation** - Each section has proper validation (e.g., URLs, dates) to ensure data quality.

## Migration Steps

### Automatic Migration
There is no automatic migration. Your existing custom sections remain intact and accessible in the "Legacy Custom Sections" accordion at the bottom of the Information Bank page.

### Manual Migration

To migrate your data from custom sections to the new structured sections:

1. **Navigate to Information Bank**
   - Go to Dashboard → Information Bank

2. **Identify Custom Sections to Migrate**
   - Scroll to the bottom of the page
   - Expand the "Legacy Custom Sections" accordion
   - Review each custom section

3. **Create Structured Entries**
   - For each piece of information in a custom section, create a new entry in the appropriate structured section
   - Example: If you have a custom section called "Work History" with job details, create entries in the new "Experience" section instead

4. **Copy Information**
   - Open the dialog for the appropriate section
   - Fill in the structured fields (company, position, date, etc.)
   - Save the entry

5. **Delete Legacy Custom Sections**
   - Once all data is migrated, you can delete the old custom sections
   - Click the trash icon on each custom section

### Example Migration

**Before (Custom Section):**
```
Section Name: "My Jobs"
Content: "Software Engineer at Acme Corp (2020-2023) - Built web applications..."
```

**After (Experience Section):**
```
Company: Acme Corp
Position: Software Engineer
Date: 2020 - 2023
Summary: Built web applications...
```

## Legacy Custom Sections

The legacy custom sections feature is now deprecated but remains functional for backward compatibility:

- ⚠️ **Deprecated** - Custom sections will not receive new features
- ✅ **Still Works** - Existing custom sections continue to function
- ❌ **Not Recommended** - New data should be added to structured sections
- 🤖 **Limited AI Support** - AI features work best with structured data

### Deprecation Warning

When you have legacy custom sections, you'll see a warning message:

> "Custom sections are deprecated. Please use the structured sections above for better AI generation and autofill support."

## FAQ

### Q: Will my existing custom sections be deleted?
**A:** No. Your existing custom sections remain intact. You can continue to view and edit them in the "Legacy Custom Sections" accordion.

### Q: Can I still create new custom sections?
**A:** Yes, but it's not recommended. The option to add custom sections is still available in the legacy accordion, but new data should be added to the appropriate structured sections for best results.

### Q: Will AI features work with my custom sections?
**A:** AI features can read custom section content, but structured data produces significantly better results. Structured sections provide context (e.g., "this is a company name" vs "this is a job title") that helps AI generate more accurate content.

### Q: How do I know which section to use?
**A:** Use the section that best matches your data:
- Job/employment history → **Experience**
- Schools/degrees → **Education**  
- Courses/certifications → **Certifications**
- Technical abilities → **Skills**
- LinkedIn/GitHub → **Profiles**
- Portfolio/open source → **Projects**

### Q: Can I undo if I delete a custom section by mistake?
**A:** No, deleting custom sections is permanent. We recommend keeping backups before migration.

## Support

If you encounter issues during migration:
1. Check the [GitHub Issues](https://github.com/AmruthPillai/Reactive-Resume/issues) for known problems
2. Create a new issue with the "information-bank" label if you find a bug
3. Join our [Discord community](https://discord.gg/reactive-resume) for help

---

*Last updated: December 2024*

