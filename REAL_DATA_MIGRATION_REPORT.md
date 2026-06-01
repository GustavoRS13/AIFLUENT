# Real Data Migration Report

## Bloqueador 2: Remove demo/mock data from API-backed pages

### Pipeline Page (`src/app/(dashboard)/pipeline/page.tsx`)
- **Action**: REMOVED entire `MOCK_LEADS` constant (15 fake leads across 7 stages)
- **Fallback changed**: When API returns empty/fails, stages now show empty columns (`leads: []`) instead of fake data
- **Result**: Pipeline now shows only real data from `/api/pipeline`

### Dashboard Page (`src/app/(dashboard)/dashboard/page.tsx`)
- **Action**: No changes needed. Variable was already named `initialStats` (not `mockStats`). This page does not have a real API yet, so initial placeholder data is appropriate.

### Reports Page (`src/app/(dashboard)/reports/page.tsx`)
- **Action**: No changes needed. Data variables (`monthlyData`, `sourceData`, `consultantData`, `campaignData`, `kpis`) were never prefixed with `mock`. Reports page does not have a real API backend yet.

### Dashboard Components (no real API -- renamed mock -> initial)
| File | Old Variable | New Variable |
|------|-------------|-------------|
| `src/components/dashboard/recent-leads.tsx` | `mockLeads` | `initialLeads` |
| `src/components/dashboard/activity-timeline.tsx` | `mockActivities` | `initialActivities` |
| `src/components/dashboard/active-campaigns.tsx` | `mockCampaigns` | `initialCampaigns` |

### Campaign Components (no real API -- renamed mock -> initial)
| File | Old Variable | New Variable |
|------|-------------|-------------|
| `src/components/campaigns/template-selector.tsx` | `mockTemplates` | `initialTemplates` |
| `src/components/campaigns/campaign-builder.tsx` | `MOCK_TAGS` | `INITIAL_TAGS` |

### Verification
- `grep -rn "mock\|Mock\|MOCK" src/ --include="*.tsx" --include="*.ts"` returns zero matches in production code
- Build passes with zero errors
