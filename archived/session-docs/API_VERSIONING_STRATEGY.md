# API Versioning Strategy

**Version**: 1.0
**Date**: November 4, 2025
**Status**: ✅ Implemented

---

## Overview

This document defines the API versioning strategy, deprecation policy, and migration process for the application API.

---

## Versioning Approach

### URL-Based Versioning (Primary)

All API endpoints include version in the URL path:

```
https://api.example.com/api/v1/videos
https://api.example.com/api/v2/videos
```

**Benefits**:
- ✅ Clear and explicit
- ✅ Easy to cache
- ✅ Works in all clients
- ✅ No special headers needed

### Header-Based Versioning (Fallback)

Optionally specify version via headers:

```http
X-API-Version: v1
# or
Accept: application/vnd.api+json;version=1
```

**Benefits**:
- ✅ Cleaner URLs
- ✅ Useful for SDKs
- ✅ Backward compatible

---

## Version Lifecycle

### 1. Active

**Status**: Fully supported, recommended for use

- ✅ All features available
- ✅ Bug fixes applied
- ✅ Security patches applied
- ✅ Performance improvements
- ✅ Full documentation

**Example**: Currently v1 and v2 are active

---

### 2. Deprecated

**Status**: Still functional but not recommended

**Triggers**:
- New version released with breaking changes
- Security concerns in old design
- Performance improvements in new version

**Client Experience**:
- ⚠️ API still works normally
- ⚠️ Response includes deprecation headers
- ⚠️ Warnings logged on server
- ⚠️ Migration guide available

**Headers Returned**:
```http
X-API-Version: v1
Deprecation: true
Sunset: Wed, 01 Jun 2026 00:00:00 GMT
Warning: 299 - "API version v1 is deprecated and will sunset on 2026-06-01"
Link: </docs/api/v1-to-v2-migration>; rel="migration-guide"
Link: </docs/api/v1/changelog>; rel="changelog"
```

**Support Level**:
- ✅ Critical bug fixes only
- ✅ Security patches
- ❌ No new features
- ❌ No performance improvements

**Timeline**: Deprecated for minimum 6 months before sunset

---

### 3. Sunset

**Status**: No longer available

**Client Experience**:
- ❌ API returns 410 Gone
- ❌ Error response with migration info
- ❌ No longer functional

**Response**:
```json
{
  "success": false,
  "error": {
    "code": "API_VERSION_SUNSET",
    "message": "API version v1 has been sunset and is no longer available",
    "sunsetDate": "2026-06-01",
    "migrationGuide": "/docs/api/v1-to-v2-migration",
    "currentVersion": "v2",
    "latestVersion": "v2"
  }
}
```

---

## Deprecation Policy

### Timeline

```
┌─────────────┬─────────────┬─────────────┬─────────────┐
│   Active    │  Deprecated │  Extended   │   Sunset    │
│  (ongoing)  │  (6 months) │ (optional)  │  (removed)  │
└─────────────┴─────────────┴─────────────┴─────────────┘
```

**Standard Timeline**:
1. **T+0**: New version released (e.g., v2)
2. **T+0**: Old version marked deprecated (e.g., v1)
3. **T+6 months**: Sunset date announced
4. **T+12 months**: Version sunset and removed

**Extended Timeline** (if needed):
- High-impact breaking changes
- Large customer base on old version
- Complex migration requirements

### Communication

**Channels**:
1. **API Response Headers** - Deprecation, Sunset, Warning
2. **Email Notifications** - To all API key holders
3. **Dashboard Warnings** - In admin portal
4. **API Documentation** - Changelog and migration guides
5. **Developer Blog** - Announcement posts

**Notification Schedule**:
- **T+0**: Deprecation announced
- **T+3 months**: First reminder
- **T+5 months**: Second reminder
- **T+11 months**: Final warning (1 month before sunset)
- **T+12 months**: Sunset activated

---

## Breaking vs Non-Breaking Changes

### Non-Breaking Changes (Same Version)

**Allowed**:
- ✅ Adding new endpoints
- ✅ Adding new optional fields to requests
- ✅ Adding new fields to responses
- ✅ Adding new query parameters (optional)
- ✅ Adding new HTTP methods to existing endpoints
- ✅ Improving error messages
- ✅ Performance improvements
- ✅ Bug fixes

**Example**:
```json
// v1 response
{
  "id": "123",
  "name": "Example"
}

// v1 response with new field (non-breaking)
{
  "id": "123",
  "name": "Example",
  "description": "New optional field"  // Added
}
```

---

### Breaking Changes (New Version Required)

**Breaking**:
- ❌ Removing endpoints
- ❌ Removing request/response fields
- ❌ Renaming fields
- ❌ Changing field types
- ❌ Making optional fields required
- ❌ Changing authentication method
- ❌ Changing HTTP status codes
- ❌ Changing error response format
- ❌ Changing URL structure

**Example** (requires new version):
```json
// v1 response
{
  "id": "123",
  "name": "Example"
}

// v2 response (breaking - field renamed)
{
  "id": "123",
  "displayName": "Example"  // "name" renamed to "displayName"
}
```

---

## Migration Process

### 1. Planning Phase

- [ ] Identify breaking changes
- [ ] Design new version API
- [ ] Create migration guide
- [ ] Update API documentation
- [ ] Test backward compatibility

### 2. Development Phase

- [ ] Implement new version endpoints
- [ ] Maintain old version endpoints
- [ ] Add version routing logic
- [ ] Implement deprecation headers
- [ ] Write integration tests

### 3. Communication Phase

- [ ] Announce new version
- [ ] Mark old version as deprecated
- [ ] Publish migration guide
- [ ] Email API users
- [ ] Update dashboard with warnings

### 4. Migration Phase

- [ ] Monitor old version usage
- [ ] Assist customers with migration
- [ ] Track migration progress
- [ ] Address migration blockers

### 5. Sunset Phase

- [ ] Final warning (1 month before)
- [ ] Sunset old version
- [ ] Remove old code (after grace period)
- [ ] Clean up documentation

---

## Version Compatibility Matrix

| Client Version | Supported API Versions | Recommended |
|----------------|------------------------|-------------|
| Mobile v1.0-1.5 | v1 only | ⚠️ Upgrade to v2 |
| Mobile v2.0+ | v1, v2 | ✅ v2 |
| Web v1.0+ | v1, v2 | ✅ v2 |
| Admin Dashboard | v1, v2 | ✅ v2 |
| Third-party SDKs | v1, v2 | ✅ v2 |

---

## Migration Guide Template

Each version migration should include:

### 1. What's New
- New features
- Performance improvements
- Bug fixes

### 2. Breaking Changes
- Detailed list of changes
- Before/after examples
- Impact assessment

### 3. Migration Steps
- Step-by-step instructions
- Code examples
- Testing checklist

### 4. Timeline
- Release date
- Deprecation date
- Sunset date

### 5. Support
- FAQ
- Common issues
- Contact information

---

## API Version Endpoint

### GET /api/versions

Returns information about all API versions:

```json
{
  "success": true,
  "data": {
    "versions": [
      {
        "version": "v1",
        "status": "deprecated",
        "releaseDate": "2025-01-01",
        "deprecationDate": "2025-06-01",
        "sunsetDate": "2026-06-01",
        "changelog": "/docs/api/v1/changelog",
        "migrationGuide": "/docs/api/v1-to-v2-migration"
      },
      {
        "version": "v2",
        "status": "active",
        "releaseDate": "2025-06-01",
        "changelog": "/docs/api/v2/changelog"
      }
    ],
    "current": "v1",
    "latest": "v2"
  }
}
```

---

## Implementation

### Automatic Version Detection

```typescript
import { extractAPIVersion, validateAPIVersionMiddleware } from './services/apiVersioning';

// In your router
const version = extractAPIVersion(req);
const versionError = validateAPIVersionMiddleware(req);
if (versionError) {
  return versionError; // Returns 400 or 410
}
```

### Adding Deprecation Headers

```typescript
import { addVersionHeaders } from './services/apiVersioning';

// Before returning response
let response = await handleRequest(req);
response = addVersionHeaders(response, version);
return response;
```

### Checking Version in Code

```typescript
const version = extractAPIVersion(req);

if (version === 'v1') {
  // Legacy logic
  return handleV1Request(req);
} else if (version === 'v2') {
  // New logic
  return handleV2Request(req);
}
```

---

## Monitoring & Analytics

### Metrics to Track

1. **Version Usage**
   - Requests per version
   - Unique clients per version
   - Response times per version

2. **Deprecation Warnings**
   - Deprecated version usage count
   - Top deprecated endpoint users
   - Migration progress percentage

3. **Sunset Impact**
   - Clients still on sunset version
   - Failed requests due to sunset
   - Support tickets related to migration

### Dashboards

Create dashboards showing:
- API version distribution
- Deprecated endpoint usage trends
- Migration completion rate
- Sunset countdown

---

## Best Practices

### For API Developers

1. **Version Early** - Include version from day 1
2. **Document Everything** - Comprehensive docs for each version
3. **Be Conservative** - Avoid breaking changes when possible
4. **Communicate Clearly** - Give plenty of notice
5. **Support Migration** - Provide tools and assistance
6. **Monitor Usage** - Track which versions are used
7. **Test Thoroughly** - Ensure versions don't interfere

### For API Consumers

1. **Always Specify Version** - Don't rely on defaults
2. **Watch for Headers** - Monitor Deprecation/Sunset headers
3. **Plan Migrations** - Don't wait until last minute
4. **Test in Staging** - Validate new version before production
5. **Update Documentation** - Keep internal docs current
6. **Subscribe to Updates** - Watch for API announcements

---

## FAQ

**Q: What if I don't specify a version?**
A: Defaults to current version (v1). Always specify version explicitly.

**Q: How long do you support old versions?**
A: Minimum 6 months after deprecation, often 12 months total.

**Q: Can I use multiple versions simultaneously?**
A: Yes, specify version per-request. Useful during migration.

**Q: What if I miss the sunset deadline?**
A: Your API calls will fail with 410 Gone. Migrate ASAP.

**Q: Do you backport features to old versions?**
A: No, only critical bug fixes and security patches.

**Q: How do I know when a version is deprecated?**
A: Check response headers (Deprecation, Sunset, Warning).

---

## Changelog

### v1.0 - 2025-11-04
- Initial versioning strategy documented
- Implemented version detection and headers
- Created deprecation policy

---

**Maintained by**: Engineering Team
**Last Updated**: November 4, 2025
**Next Review**: May 2026
