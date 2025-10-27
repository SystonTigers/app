Absolutely. Here’s **#1: the Make.com blueprint pack** (lean, <1k ops/month) + exactly how/where to save everything in your repo.

I’ve given you **six importable blueprints** (one per scenario) *and* a **bundle.json** if you want them all in one go. They’re templated with env-style placeholders so you can reuse them for any tenant.

---

# Where to save the docs/files in your repo

Yes—save that last big plan in your repo so it’s the “single source of truth.”

**Suggested structure:**

```
/docs/
  BLUEPRINT_V7_MASTER.md                ← the big plan you liked
  MAKE/
    README.md                           ← how to import, env vars, ops math
    bundle.json                         ← all scenarios together (optional)
    live_match_update.json
    league_table_sync.json
    daily_posts.json
    fixture_countdown.json
    throwback_thursday.json
    usage_counter_example.json
```

**Filenames to use:**

* `docs/BLUEPRINT_V7_MASTER.md`  ← the long spec you approved (my previous message)
* `docs/MAKE/README.md`           ← quick import steps + env
* `docs/MAKE/*.json`              ← the scenario blueprints below

---

# docs/MAKE/README.md (drop this in)

```md
# Make.com Blueprints — v7.0 (Starter Tier, ≤1,000 ops/month)

## Env variables to set (Make → Variables)
- BASE_API: https://api.yourdomain.com
- TENANT: syston (or any team id)
- GITHUB_REPO: yourorg/yourpagesrepo          # only if you still write to GitHub; else ignore
- GITHUB_TOKEN: ghp_xxx                        # if using GitHub writes
- SOCIAL_POST_WEBHOOK: {{optional URL}}       # if you auto-post via Worker
- LIVE_UPDATE_PATH: /events/live
- USAGE_ALLOWED_PATH: /usage/make/allowed
- USAGE_INCREMENT_PATH: /usage/make/increment
- RENDER_PATH: /render
- TABLE_PATH: /league/table
- BIRTHDAYS_PATH: /birthdays/today            # your Worker endpoint for today’s birthdays
- QUOTES_PATH: /quotes/today                  # your Worker endpoint for today’s quote
- FIXTURES_PATH: /fixtures/next               # returns next fixture within N hours
- THROWBACK_PATH: /media/random               # returns a random historical image URL

> All HTTP modules should include header `X-Tenant: {{TENANT}}` for multi-tenant routing.

## Scenarios included
1. Live Match Update (Webhook → Worker → optional GitHub/R2)  
2. League Table Sync (6-hour cron, hash change only)  
3. Daily Posts (birthdays + quotes @06:00)  
4. Fixture Countdown (08:00, match within 24h)  
5. Throwback Thursday (Thu 19:00)  
6. Usage Counter (first step for every scenario)

## Ops math (typical month)
- League Table: ~120 runs × 4 ops ≈ 480
- Daily Posts: 30 runs × 3 ops ≈ 90
- Countdown: 8–16 runs × 3 ops ≈ 24–48
- Throwback: 4 runs × 3 ops ≈ 12
- Live Updates: ~30 runs × 3 ops ≈ 90
**Total:** ~700–800 ops (safe under 1,000)

## Import
- In Make.com: Scenarios → Import Blueprint → pick each *.json OR `bundle.json`.
- After import: set the Scheduling times and activate.
```

---

# docs/MAKE/bundle.json (all-in-one; Make accepts multiple scenarios)

```json
{
  "metadataVersion": "2.2",
  "name": "Syston v7 — Starter Bundle",
  "description": "Six low-op scenarios with usage guard, tenant-aware.",
  "scenarios": [
    {{LIVE_MATCH_UPDATE_JSON}},
    {{LEAGUE_TABLE_SYNC_JSON}},
    {{DAILY_POSTS_JSON}},
    {{FIXTURE_COUNTDOWN_JSON}},
    {{THROWBACK_THURSDAY_JSON}},
    {{USAGE_COUNTER_EXAMPLE_JSON}}
  ]
}
```

> Replace the `{{...}}` markers by pasting the full JSON blocks below. If Make balks at bundles, just import each scenario file individually.

---

# docs/MAKE/live_match_update.json

```json
{
  "metadataVersion": "2.2",
  "name": "Live Match Update → Worker (+optional GitHub/R2)",
  "flow": {
    "root": {
      "module": {
        "id": 1,
        "name": "Webhook (Live Update)",
        "type": "hook",
        "config": {
          "label": "live-update-{{TENANT}}"
        },
        "next": {
          "module": {
            "id": 2,
            "name": "Usage Allowed?",
            "type": "http:get",
            "config": {
              "url": "{{BASE_API}}{{USAGE_ALLOWED_PATH}}",
              "headers": { "X-Tenant": "{{TENANT}}" }
            },
            "filter": {
              "type": "jsonpath",
              "path": "$.allowed",
              "equals": true
            },
            "next": {
              "module": {
                "id": 3,
                "name": "POST /events/live",
                "type": "http:post",
                "config": {
                  "url": "{{BASE_API}}{{LIVE_UPDATE_PATH}}",
                  "headers": { "X-Tenant": "{{TENANT}}", "Content-Type": "application/json" },
                  "body": "{ \"update\": {{1.output.body}} }"
                },
                "next": {
                  "module": {
                    "id": 4,
                    "name": "Increment Usage",
                    "type": "http:post",
                    "config": {
                      "url": "{{BASE_API}}{{USAGE_INCREMENT_PATH}}",
                      "headers": { "X-Tenant": "{{TENANT}}", "Content-Type": "application/json" },
                      "body": "{ \"scenario\":\"live_update\" }"
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
```

---

# docs/MAKE/league_table_sync.json

```json
{
  "metadataVersion": "2.2",
  "name": "League Table Sync (6h, hash-guard)",
  "flow": {
    "root": {
      "module": {
        "id": 1,
        "name": "Scheduler (every 6h)",
        "type": "cron",
        "config": { "cron": "0 */6 * * *" },
        "next": {
          "module": {
            "id": 2,
            "name": "Usage Allowed?",
            "type": "http:get",
            "config": {
              "url": "{{BASE_API}}{{USAGE_ALLOWED_PATH}}",
              "headers": { "X-Tenant": "{{TENANT}}" }
            },
            "filter": { "type": "jsonpath", "path": "$.allowed", "equals": true },
            "next": {
              "module": {
                "id": 3,
                "name": "GET /league/table",
                "type": "http:get",
                "config": {
                  "url": "{{BASE_API}}{{TABLE_PATH}}",
                  "headers": { "X-Tenant": "{{TENANT}}" }
                },
                "next": {
                  "module": {
                    "id": 4,
                    "name": "Hash changed?",
                    "type": "function",
                    "config": {
                      "code": "const crypto = require('crypto');\nconst body = input(3).body || '';\nconst hash = crypto.createHash('md5').update(typeof body==='string'?body:JSON.stringify(body)).digest('hex');\nconst prev = memory.get('lastHash') || '';\nif(hash===prev){ flow.stop(); }\nmemory.set('lastHash', hash);\nreturn {hash};"
                    },
                    "next": {
                      "module": {
                        "id": 5,
                        "name": "POST /render (Table Graphic)",
                        "type": "http:post",
                        "config": {
                          "url": "{{BASE_API}}{{RENDER_PATH}}",
                          "headers": { "X-Tenant": "{{TENANT}}", "Content-Type": "application/json" },
                          "body": "{ \"templateId\":\"league-table-v1\",\"data\": {{3.output.body}} }"
                        },
                        "next": {
                          "module": {
                            "id": 6,
                            "name": "Increment Usage",
                            "type": "http:post",
                            "config": {
                              "url": "{{BASE_API}}{{USAGE_INCREMENT_PATH}}",
                              "headers": { "X-Tenant": "{{TENANT}}", "Content-Type": "application/json" },
                              "body": "{ \"scenario\":\"league_table_sync\" }"
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
```

---

# docs/MAKE/daily_posts.json

```json
{
  "metadataVersion": "2.2",
  "name": "Daily Posts (06:00) — Birthdays + Quotes",
  "flow": {
    "root": {
      "module": {
        "id": 1,
        "name": "Scheduler (06:00)",
        "type": "cron",
        "config": { "cron": "0 6 * * *" },
        "next": {
          "module": {
            "id": 2,
            "name": "Usage Allowed?",
            "type": "http:get",
            "config": { "url": "{{BASE_API}}{{USAGE_ALLOWED_PATH}}", "headers": { "X-Tenant": "{{TENANT}}" } },
            "filter": { "type": "jsonpath", "path": "$.allowed", "equals": true },
            "next": {
              "module": {
                "id": 3,
                "name": "GET /birthdays/today",
                "type": "http:get",
                "config": { "url": "{{BASE_API}}{{BIRTHDAYS_PATH}}", "headers": { "X-Tenant": "{{TENANT}}" } },
                "next": {
                  "module": {
                    "id": 4,
                    "name": "If birthdays exist → render/post",
                    "type": "function",
                    "config": {
                      "code": "const list = input(3).body || [];\nif(!Array.isArray(list) || list.length===0){ return {skipBirthdays:true}; }\nreturn {skipBirthdays:false, birthdays:list};"
                    },
                    "next": {
                      "module": {
                        "id": 5,
                        "name": "Render Birthday Card(s)",
                        "type": "http:post",
                        "config": {
                          "url": "{{BASE_API}}{{RENDER_PATH}}",
                          "headers": { "X-Tenant": "{{TENANT}}", "Content-Type": "application/json" },
                          "body": "{ \"templateId\":\"birthday-v1\",\"data\": {{4.output.birthdays}} }"
                        },
                        "optional": true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      "sibling": {
        "module": {
          "id": 6,
          "name": "GET /quotes/today",
          "type": "http:get",
          "config": { "url": "{{BASE_API}}{{QUOTES_PATH}}", "headers": { "X-Tenant": "{{TENANT}}" } },
          "next": {
            "module": {
              "id": 7,
              "name": "Render Quote",
              "type": "http:post",
              "config": {
                "url": "{{BASE_API}}{{RENDER_PATH}}",
                "headers": { "X-Tenant": "{{TENANT}}", "Content-Type": "application/json" },
                "body": "{ \"templateId\":\"quote-v1\",\"data\": {{6.output.body}} }"
              },
              "next": {
                "module": {
                  "id": 8,
                  "name": "Increment Usage",
                  "type": "http:post",
                  "config": {
                    "url": "{{BASE_API}}{{USAGE_INCREMENT_PATH}}",
                    "headers": { "X-Tenant": "{{TENANT}}", "Content-Type": "application/json" },
                    "body": "{ \"scenario\":\"daily_posts\" }"
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
```

---

# docs/MAKE/fixture_countdown.json

```json
{
  "metadataVersion": "2.2",
  "name": "Fixture Countdown (08:00, next 24h)",
  "flow": {
    "root": {
      "module": {
        "id": 1,
        "name": "Scheduler (08:00)",
        "type": "cron",
        "config": { "cron": "0 8 * * *" },
        "next": {
          "module": {
            "id": 2,
            "name": "Usage Allowed?",
            "type": "http:get",
            "config": { "url": "{{BASE_API}}{{USAGE_ALLOWED_PATH}}", "headers": { "X-Tenant": "{{TENANT}}" } },
            "filter": { "type": "jsonpath", "path": "$.allowed", "equals": true },
            "next": {
              "module": {
                "id": 3,
                "name": "GET /fixtures/next",
                "type": "http:get",
                "config": { "url": "{{BASE_API}}{{FIXTURES_PATH}}", "headers": { "X-Tenant": "{{TENANT}}" } },
                "next": {
                  "module": {
                    "id": 4,
                    "name": "If within 24h → render",
                    "type": "function",
                    "config": {
                      "code": "const f = input(3).body; if(!f || !f.kickoffWithin24h){ flow.stop(); } return f;"
                    },
                    "next": {
                      "module": {
                        "id": 5,
                        "name": "Render Countdown",
                        "type": "http:post",
                        "config": {
                          "url": "{{BASE_API}}{{RENDER_PATH}}",
                          "headers": { "X-Tenant": "{{TENANT}}", "Content-Type": "application/json" },
                          "body": "{ \"templateId\":\"countdown-v1\",\"data\": {{4.output}} }"
                        },
                        "next": {
                          "module": {
                            "id": 6,
                            "name": "Increment Usage",
                            "type": "http:post",
                            "config": {
                              "url": "{{BASE_API}}{{USAGE_INCREMENT_PATH}}",
                              "headers": { "X-Tenant": "{{TENANT}}", "Content-Type": "application/json" },
                              "body": "{ \"scenario\":\"fixture_countdown\" }"
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
```

---

# docs/MAKE/throwback_thursday.json

```json
{
  "metadataVersion": "2.2",
  "name": "Throwback Thursday (19:00 Thu)",
  "flow": {
    "root": {
      "module": {
        "id": 1,
        "name": "Scheduler (Thu 19:00)",
        "type": "cron",
        "config": { "cron": "0 19 * * 4" },
        "next": {
          "module": {
            "id": 2,
            "name": "Usage Allowed?",
            "type": "http:get",
            "config": { "url": "{{BASE_API}}{{USAGE_ALLOWED_PATH}}", "headers": { "X-Tenant": "{{TENANT}}" } },
            "filter": { "type": "jsonpath", "path": "$.allowed", "equals": true },
            "next": {
              "module": {
                "id": 3,
                "name": "GET /media/random?type=photo",
                "type": "http:get",
                "config": { "url": "{{BASE_API}}{{THROWBACK_PATH}}?type=photo", "headers": { "X-Tenant": "{{TENANT}}" } },
                "next": {
                  "module": {
                    "id": 4,
                    "name": "Render Throwback",
                    "type": "http:post",
                    "config": {
                      "url": "{{BASE_API}}{{RENDER_PATH}}",
                      "headers": { "X-Tenant": "{{TENANT}}", "Content-Type": "application/json" },
                      "body": "{ \"templateId\":\"throwback-v1\",\"data\": {{3.output.body}} }"
                    },
                    "next": {
                      "module": {
                        "id": 5,
                        "name": "Increment Usage",
                        "type": "http:post",
                        "config": {
                          "url": "{{BASE_API}}{{USAGE_INCREMENT_PATH}}",
                          "headers": { "X-Tenant": "{{TENANT}}", "Content-Type": "application/json" },
                          "body": "{ \"scenario\":\"throwback_thursday\" }"
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
```

---

# docs/MAKE/usage_counter_example.json

```json
{
  "metadataVersion": "2.2",
  "name": "Usage Counter — Example (drop-in first step)",
  "notes": "You don't run this as a scenario; copy its first two HTTP modules into the start of EVERY scenario.",
  "flow": {
    "root": {
      "module": {
        "id": 1,
        "name": "Usage Allowed?",
        "type": "http:get",
        "config": {
          "url": "{{BASE_API}}{{USAGE_ALLOWED_PATH}}",
          "headers": { "X-Tenant": "{{TENANT}}" }
        },
        "filter": { "type": "jsonpath", "path": "$.allowed", "equals": true },
        "next": {
          "module": {
            "id": 2,
            "name": "Increment Usage",
            "type": "http:post",
            "config": {
              "url": "{{BASE_API}}{{USAGE_INCREMENT_PATH}}",
              "headers": { "X-Tenant": "{{TENANT}}", "Content-Type": "application/json" },
              "body": "{ \"scenario\":\"__SET_ME__\" }"
            }
          }
        }
      }
    }
  }
}
```

---

