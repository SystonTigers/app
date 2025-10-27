# Error Codes Reference

## Overview

Structured error codes for debugging and monitoring. All errors follow the format: `ERR_{COMPONENT}_{NUMBER}`

## Error Code Format

```
ERR_BACKEND_001
│   │        │
│   │        └─ Sequential number
│   └────────── Component identifier
└────────────── Error prefix
```

## Backend API Errors (ERR_BACKEND_*)

### Authentication (001-099)

| Code | Message | Cause | Resolution |
|------|---------|-------|------------|
| ERR_BACKEND_001 | Missing Authorization header | No JWT token in request | Include `Authorization: Bearer TOKEN` header |
| ERR_BACKEND_002 | Invalid JWT token | Token malformed or expired | Refresh authentication, get new token |
| ERR_BACKEND_003 | JWT signature verification failed | Token signed with wrong secret | Check JWT_SECRET configuration |
| ERR_BACKEND_004 | Insufficient permissions | User role lacks required access | Check user role and endpoint requirements |
| ERR_BACKEND_005 | Tenant not found in JWT | JWT missing tenant_id claim | Re-authenticate with valid tenant |

### Tenant Management (100-199)

| Code | Message | Cause | Resolution |
|------|---------|-------|------------|
| ERR_BACKEND_100 | Tenant not found | Invalid tenant_id | Verify tenant exists, check spelling |
| ERR_BACKEND_101 | Tenant already exists | Duplicate tenant_id | Choose different tenant_id |
| ERR_BACKEND_102 | Tenant creation failed | KV write error | Check KV binding, retry |
| ERR_BACKEND_103 | Invalid tenant configuration | Missing required fields | Provide all required tenant fields |
| ERR_BACKEND_104 | Tenant deletion failed | Active resources exist | Delete all tenant resources first |

### Video Processing (200-299)

| Code | Message | Cause | Resolution |
|------|---------|-------|------------|
| ERR_BACKEND_200 | Video upload failed | R2 write error | Check R2 binding, verify quota |
| ERR_BACKEND_201 | File size exceeds limit | Video >500MB | Compress video, reduce size |
| ERR_BACKEND_202 | Invalid video format | Unsupported file type | Use MP4, MOV, or AVI format |
| ERR_BACKEND_203 | Video not found | Invalid video_id | Verify video_id exists |
| ERR_BACKEND_204 | Processing queue full | >100 jobs queued | Wait and retry, scale workers |
| ERR_BACKEND_205 | Upload incomplete | Network interruption | Retry upload from beginning |
| ERR_BACKEND_206 | Video metadata invalid | Missing required fields | Include tenant, user_id in upload |

### Feed & Events (300-399)

| Code | Message | Cause | Resolution |
|------|---------|-------|------------|
| ERR_BACKEND_300 | Post creation failed | KV write error | Check KV binding, retry |
| ERR_BACKEND_301 | Post not found | Invalid post_id | Verify post exists |
| ERR_BACKEND_302 | Event creation failed | Validation error | Check event schema |
| ERR_BACKEND_303 | Event not found | Invalid event_id | Verify event exists |
| ERR_BACKEND_304 | RSVP failed | User already RSVP'd | Update existing RSVP instead |
| ERR_BACKEND_305 | Invalid date format | Malformed date string | Use ISO 8601 format (YYYY-MM-DD) |

### Fixtures & Results (400-499)

| Code | Message | Cause | Resolution |
|------|---------|-------|------------|
| ERR_BACKEND_400 | Fixture creation failed | Validation error | Check fixture schema |
| ERR_BACKEND_401 | Fixture not found | Invalid fixture_id | Verify fixture exists |
| ERR_BACKEND_402 | Result submission failed | Match not started | Wait until match time |
| ERR_BACKEND_403 | Duplicate fixture | Same teams, date exists | Update existing fixture |

### Rate Limiting (500-599)

| Code | Message | Cause | Resolution |
|------|---------|-------|------------|
| ERR_BACKEND_500 | Rate limit exceeded | Too many requests | Wait and retry with backoff |
| ERR_BACKEND_501 | Upload quota exceeded | Too many uploads today | Wait until quota resets |
| ERR_BACKEND_502 | Storage quota exceeded | Tenant storage full | Delete old content or upgrade |

## Apps Script Errors (ERR_SCRIPT_*)

### Historical Import (001-099)

| Code | Message | Cause | Resolution |
|------|---------|-------|------------|
| ERR_SCRIPT_001 | CSV file not found | Invalid file ID or path | Verify Google Drive file ID |
| ERR_SCRIPT_002 | CSV parse error | Malformed CSV data | Check CSV formatting |
| ERR_SCRIPT_003 | Missing required column | CSV lacks expected column | Add missing columns to CSV |
| ERR_SCRIPT_004 | Invalid date format | Date can't be parsed | Use DD/MM/YYYY format |
| ERR_SCRIPT_005 | Duplicate row detected | Row already imported | Skip or update existing |
| ERR_SCRIPT_006 | Backend import failed | API returned error | Check backend logs, retry |
| ERR_SCRIPT_007 | Validation failed | Data doesn't meet schema | Fix data and re-import |

### Video Processing (100-199)

| Code | Message | Cause | Resolution |
|------|---------|-------|------------|
| ERR_SCRIPT_100 | Video file not found | Invalid Drive file ID | Verify video uploaded to Drive |
| ERR_SCRIPT_101 | Video metadata incomplete | Missing required fields | Fill all required metadata |
| ERR_SCRIPT_102 | JSON export failed | Can't write to Drive | Check Drive permissions |
| ERR_SCRIPT_103 | YouTube upload failed | API quota exceeded | Wait for quota reset |
| ERR_SCRIPT_104 | YouTube auth failed | Invalid OAuth token | Refresh YouTube credentials |
| ERR_SCRIPT_105 | Clip timestamp invalid | Start/end times incorrect | Verify timestamps in metadata |
| ERR_SCRIPT_106 | Drive organization failed | Folder permissions issue | Grant folder write access |

### Weekly Scheduler (200-299)

| Code | Message | Cause | Resolution |
|------|---------|-------|------------|
| ERR_SCRIPT_200 | Scheduler execution failed | Function threw exception | Check Apps Script logs |
| ERR_SCRIPT_201 | Webhook delivery failed | Make.com unreachable | Verify webhook URL, check Make.com |
| ERR_SCRIPT_202 | Birthday data missing | No birthdays in roster | Add birthdays to roster sheet |
| ERR_SCRIPT_203 | Quote rotation failed | Empty quotes sheet | Add quotes to sheet |
| ERR_SCRIPT_204 | Fixture data missing | No fixtures for week | Add fixtures or skip week |
| ERR_SCRIPT_205 | Invalid cron schedule | Trigger misconfigured | Fix trigger timing |

### Configuration (300-399)

| Code | Message | Cause | Resolution |
|------|---------|-------|------------|
| ERR_SCRIPT_300 | Missing script property | Required config missing | Set in Project Settings |
| ERR_SCRIPT_301 | Invalid API URL | Malformed backend URL | Fix BACKEND_API_URL property |
| ERR_SCRIPT_302 | Invalid webhook URL | Malformed Make.com URL | Fix WEBHOOK_URL property |
| ERR_SCRIPT_303 | Missing API credentials | No auth token set | Set BACKEND_API_KEY property |

## Video Processing Errors (ERR_VIDEO_*)

### highlights_bot (001-099)

| Code | Message | Cause | Resolution |
|------|---------|-------|------------|
| ERR_VIDEO_001 | FFmpeg not installed | Missing dependency | Install FFmpeg: `apt-get install ffmpeg` |
| ERR_VIDEO_002 | Invalid video codec | Unsupported format | Convert to H.264 MP4 |
| ERR_VIDEO_003 | AI model not found | YOLOv8 model missing | Download model: `python download_model.py` |
| ERR_VIDEO_004 | Detection failed | No events detected | Lower confidence threshold or check video |
| ERR_VIDEO_005 | Clip generation failed | FFmpeg error | Check input video integrity |
| ERR_VIDEO_006 | Config file invalid | YAML syntax error | Validate config.yaml syntax |
| ERR_VIDEO_007 | Insufficient memory | OOM during processing | Increase RAM or reduce resolution |
| ERR_VIDEO_008 | GPU not available | CUDA not found | Use CPU mode or install CUDA |

### Docker Processor (100-199)

| Code | Message | Cause | Resolution |
|------|---------|-------|------------|
| ERR_VIDEO_100 | Worker startup failed | Container crashed | Check Docker logs, fix config |
| ERR_VIDEO_101 | Queue connection failed | Redis unreachable | Verify Redis running |
| ERR_VIDEO_102 | Job timeout | Processing >1 hour | Increase timeout or scale workers |
| ERR_VIDEO_103 | Storage mount failed | Volume not accessible | Check Docker volume mounts |
| ERR_VIDEO_104 | Health check failed | Worker unresponsive | Restart worker container |
| ERR_VIDEO_105 | Webhook notification failed | Can't reach callback URL | Verify webhook URL reachable |

## Mobile App Errors (ERR_MOBILE_*)

### Network (001-099)

| Code | Message | Cause | Resolution |
|------|---------|-------|------------|
| ERR_MOBILE_001 | Network unavailable | No internet connection | Check device connectivity |
| ERR_MOBILE_002 | API request timeout | Backend slow or down | Retry with exponential backoff |
| ERR_MOBILE_003 | SSL certificate error | HTTPS validation failed | Check server SSL certificate |
| ERR_MOBILE_004 | API version mismatch | Old app version | Update app from store |

### Video Upload (100-199)

| Code | Message | Cause | Resolution |
|------|---------|-------|------------|
| ERR_MOBILE_100 | Camera permission denied | User rejected permission | Grant camera access in settings |
| ERR_MOBILE_101 | Library permission denied | User rejected permission | Grant photo library access |
| ERR_MOBILE_102 | Recording failed | Device error | Restart app, check storage space |
| ERR_MOBILE_103 | Upload failed | Network interruption | Retry upload |
| ERR_MOBILE_104 | File too large | Video exceeds limit | Compress or trim video |

### Storage (200-299)

| Code | Message | Cause | Resolution |
|------|---------|-------|------------|
| ERR_MOBILE_200 | Local storage full | Device out of space | Free up storage space |
| ERR_MOBILE_201 | Cache write failed | Storage permission issue | Grant storage permission |

## Make.com Integration Errors (ERR_MAKE_*)

| Code | Message | Cause | Resolution |
|------|---------|-------|------------|
| ERR_MAKE_001 | Scenario execution failed | Error in Make.com flow | Check Make.com scenario logs |
| ERR_MAKE_002 | Social media auth failed | Expired OAuth token | Reconnect social account in Make.com |
| ERR_MAKE_003 | Rate limit exceeded | Too many posts | Reduce posting frequency |
| ERR_MAKE_004 | Invalid payload format | Unexpected JSON structure | Verify webhook payload schema |
| ERR_MAKE_005 | Twitter API error | X/Twitter service issue | Retry later or check Twitter status |
| ERR_MAKE_006 | Instagram API error | Instagram service issue | Retry later or check Instagram status |
| ERR_MAKE_007 | Facebook API error | Facebook service issue | Retry later or check Facebook status |

## Error Response Format

All API errors follow this JSON structure:

```json
{
  "success": false,
  "error": {
    "code": "ERR_BACKEND_201",
    "message": "File size exceeds limit",
    "details": "Maximum file size is 500MB. Your file is 750MB.",
    "timestamp": "2025-10-07T14:30:00Z",
    "request_id": "req_abc123",
    "docs_url": "https://docs.systonapp.com/errors/ERR_BACKEND_201"
  }
}
```

## Logging Best Practices

### Backend (Cloudflare Workers)
```javascript
console.error('ERR_BACKEND_201', {
  file_size: fileSize,
  max_size: MAX_SIZE,
  tenant: tenantId,
  user: userId,
  request_id: requestId
});
```

### Apps Script
```javascript
Logger.log('ERR_SCRIPT_001: ' + JSON.stringify({
  file_id: fileId,
  operation: 'CSV import',
  row: currentRow
}));
```

### Video Processing
```python
logger.error('ERR_VIDEO_001', extra={
    'video_id': video_id,
    'operation': 'ffmpeg_detect',
    'command': ffmpeg_cmd
})
```

## Error Monitoring

### Alerting Thresholds

| Error Type | Alert If |
|------------|----------|
| Authentication | >10/min |
| Video Upload | >5 failures/hour |
| Backend API | Error rate >2% |
| Apps Script | Any ERR_SCRIPT_3XX |
| Video Processing | >3 failures in queue |

### Error Dashboards

**Cloudflare**: Analytics → Logs → Filter by status 4XX/5XX
**Apps Script**: Apps Script → Executions → Filter by failed
**Docker**: `docker-compose logs --tail=100 | grep ERR_`
**Make.com**: Make.com → History → Filter by error

## Troubleshooting Guide

### "Video upload fails every time"
Check: ERR_BACKEND_200-206, ERR_MOBILE_100-104
1. Verify R2 bucket accessible
2. Check file size <500MB
3. Verify video format (MP4)
4. Test network connection
5. Check storage quota

### "Posts not appearing on social media"
Check: ERR_MAKE_001-007, ERR_SCRIPT_201
1. Verify Make.com scenario active
2. Check social media OAuth tokens
3. Verify webhook URL in config
4. Test webhook manually
5. Check rate limits

### "Historical import fails"
Check: ERR_SCRIPT_001-007
1. Verify CSV format matches template
2. Check required columns present
3. Verify date formats (DD/MM/YYYY)
4. Check for duplicate data
5. Verify backend API accessible

### "Birthday automation didn't run"
Check: ERR_SCRIPT_200-204
1. Check Apps Script trigger exists
2. Verify roster has birthdays
3. Check execution logs
4. Verify webhook URL works
5. Test function manually

## Support Resources

- **Documentation**: https://docs.systonapp.com
- **API Reference**: https://docs.systonapp.com/api
- **Community Forum**: https://community.systonapp.com
- **GitHub Issues**: https://github.com/SystonTigers/app/issues
- **Email Support**: support@systonapp.com
