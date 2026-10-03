# i18n

The mobile app supports multiple languages. Backend is locale-agnostic except:
- Tenant config may include `locale` and `tz`.
- Future email/push templates should load strings based on tenant `locale`.

Directory suggestion (app side):
```
app/i18n/
  en.json
  fr.json
  es.json
```

Backend may later expose `/i18n/:locale` if we centralize strings.
