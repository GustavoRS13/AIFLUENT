# Mock Data Report

## Summary
All mock data references across the codebase have been audited and categorized.

## Files with API-backed data (already fetching from API)

| File | Status | Notes |
|---|---|---|
| `src/app/(dashboard)/leads/page.tsx` | **API** | Fetches from `/api/leads`. No mock data present. |
| `src/app/(dashboard)/pipeline/page.tsx` | **API + Fallback** | Fetches from `/api/pipeline`. `MOCK_LEADS` used as fallback only when API returns empty or fails. Verified correct. |

## Files with demo data (frontend-only, no backend API yet)

| File | Variable(s) Renamed | Justification |
|---|---|---|
| `src/app/(dashboard)/dashboard/page.tsx` | `mockStats` -> `initialStats` | Dashboard stats are hardcoded. No `/api/dashboard` endpoint exists yet. |
| `src/app/(dashboard)/tasks/page.tsx` | `mockTasks` -> `initialTasks` | No `/api/tasks` endpoint. Frontend-only feature. |
| `src/app/(dashboard)/deals/page.tsx` | `mockDeals` -> `initialDeals` | No `/api/deals` endpoint. Frontend-only feature. |
| `src/app/(dashboard)/inbox/page.tsx` | `mockConversations` -> `initialConversations` | No `/api/inbox` endpoint. Frontend-only unified inbox. |
| `src/app/(dashboard)/whatsapp/page.tsx` | `mockConversations` -> `initialConversations`, `initialMockMessages` -> `initialMessages` | No `/api/whatsapp` endpoint. Frontend-only chat UI. |
| `src/app/(dashboard)/phone/page.tsx` | `mockCalls` -> `initialCalls` | No `/api/phone` endpoint. Frontend-only telephony UI. |
| `src/app/(dashboard)/ai-assistant/page.tsx` | `mockChat` -> `initialChat` | No `/api/ai-assistant` chat endpoint. Frontend-only AI chat demo. |
| `src/app/(dashboard)/automations/page.tsx` | `mockAutomations` -> `initialAutomations` | No `/api/automations` endpoint. Frontend-only automation list. |
| `src/app/(dashboard)/settings/page.tsx` | `mockTeamMembers` -> `initialTeamMembers` | No `/api/settings` endpoint. Frontend-only settings page. |
| `src/app/(dashboard)/integrations/page.tsx` | `mockIntegrations` -> `initialIntegrations` | No `/api/integrations` endpoint. Frontend-only integrations list. |
| `src/app/(dashboard)/productivity/page.tsx` | `mockRanking` -> `initialRanking`, `mockAchievements` -> `initialAchievements`, `mockGoals` -> `initialGoals` | No `/api/productivity` endpoint. Frontend-only gamification page. |
| `src/app/(dashboard)/disparos/page.tsx` | `mockLogs` -> `initialLogs`, `mockConsent` -> `initialConsent` | No `/api/disparos` endpoint for logs/consent. Campaigns data already uses `initialCampaigns`. |
| `src/components/campaigns/campaign-metrics.tsx` | `getMockMetrics` -> `getDemoMetrics` | Demo metrics generator for campaign visualization. |

## Files with demo data in campaigns page

| File | Variable(s) | Status |
|---|---|---|
| `src/app/(dashboard)/campaigns/page.tsx` | `initialCampaigns` | Renamed comment to "Initial demo data". API exists at `/api/campaigns` but page does not fetch from it yet (campaigns are managed client-side). Future: connect to API. |

## Pipeline page verification
The pipeline page at `src/app/(dashboard)/pipeline/page.tsx` correctly uses `MOCK_LEADS` as fallback only:
1. First attempts `fetch('/api/pipeline')`
2. If API returns stages with data, uses API data
3. Only falls back to `MOCK_LEADS` when API fails or returns empty
This behavior is correct and intentional.

## Convention applied
All renamed variables follow the pattern:
- `mock*` -> `initial*` or `demo*`
- Each variable has the comment: `// Initial demo data — replace with API when backend ready`
