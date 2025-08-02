# Fixing Outdated Glyph Counts

Your glyph documents have outdated denormalized counts that don't match the actual view/like/download collections. Here are your options to fix this:

## Option 1: Run One-Time Migration Script (RECOMMENDED)

### Windows:
```cmd
cd Backend
run_migration.bat
```

### Mac/Linux:
```bash
cd Backend
python migrate_counts.py
```

This script will:
- ✅ Count all actual views/likes/downloads from collections
- ✅ Update all glyph documents with correct counts
- ✅ Process in batches to handle large datasets
- ✅ Show progress and verify results
- ✅ Add `lastCountSync` timestamp to track when sync happened

## Option 2: Use Admin API Endpoint

### Sync All Glyphs (50 at a time):
```bash
POST /api/admin/sync-glyph-counts
Authorization: Bearer <your-admin-token>
Content-Type: application/json

{}
```

### Sync Specific Glyph:
```bash
POST /api/admin/sync-glyph-counts
Authorization: Bearer <your-admin-token>
Content-Type: application/json

{
  "glyphId": "your-glyph-id"
}
```

### Sync Custom Batch Size:
```bash
POST /api/admin/sync-glyph-counts
Authorization: Bearer <your-admin-token>
Content-Type: application/json

{
  "batchSize": 100
}
```

## Option 3: Frontend Admin Tool

You can call the sync endpoint from your admin panel:

```javascript
// In your admin component
const syncCounts = async () => {
  try {
    const response = await apiClient.request('/admin/sync-glyph-counts', {
      method: 'POST',
      body: JSON.stringify({ batchSize: 50 })
    });
    console.log('Sync result:', response);
  } catch (error) {
    console.error('Sync failed:', error);
  }
};
```

## What Happens After Sync?

1. **Immediate Fix**: All glyph counts will show correct numbers
2. **Real-time Updates**: New views/likes/downloads will update counts automatically
3. **Performance**: Fast loading since counts are stored in glyph documents
4. **Accuracy**: Counts stay current through incremental updates

## Verification

After running the sync, you can verify it worked by:

1. **Check Admin Logs**: The migration script shows before/after counts
2. **Compare Frontend**: Glyph cards should show updated numbers
3. **API Verification**: Use `/api/get-glyph/<id>/real-counts` to double-check

## Prevention

To prevent this issue in the future:
- ✅ All new views/likes/downloads automatically update denormalized counts
- ✅ Batch operations ensure atomic updates
- ✅ Admin sync endpoint available for periodic maintenance
- ✅ Real-time verification endpoint for critical accuracy needs

## Troubleshooting

**Migration fails?**
- Check Firebase credentials are set up correctly
- Ensure you have admin permissions
- Run with smaller batch sizes if hitting rate limits

**Some counts still wrong?**
- Run the verification function in the migration script
- Check for any error messages in the logs
- Use the real-time counts endpoint to see actual vs denormalized

**Performance issues after sync?**
- This should actually improve performance since we're back to single queries
- Monitor the logs for any unusual query patterns
