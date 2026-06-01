# RBAC Permission Matrix Report

## Overview
The RBAC (Role-Based Access Control) system defines three roles: **admin**, **gestor**, and **operador**.

## Permission Matrix

| Permission | Admin | Gestor | Operador |
|---|---|---|---|
| **Pages** | | | |
| page:dashboard | Yes | Yes | Yes |
| page:leads | Yes | Yes | Yes |
| page:pipeline | Yes | Yes | Yes |
| page:deals | Yes | Yes | Yes |
| page:inbox | Yes | Yes | Yes |
| page:whatsapp | Yes | Yes | Yes |
| page:campaigns | Yes | Yes | No |
| page:disparos | Yes | Yes | No |
| page:templates | Yes | Yes | No |
| page:meta-ads | Yes | Yes | No |
| page:automations | Yes | Yes | No |
| page:tasks | Yes | Yes | Yes |
| page:productivity | Yes | Yes | Yes |
| page:team | Yes | No | No |
| page:reports | Yes | Yes | No |
| page:settings | Yes | No | No |
| page:security | Yes | No | No |
| page:integrations | Yes | No | No |
| page:ai-assistant | Yes | Yes | No |
| **Actions** | | | |
| action:create-lead | Yes | Yes | Yes |
| action:delete-lead | Yes | Yes | No |
| action:create-campaign | Yes | Yes | No |
| action:manage-team | Yes | No | No |
| action:manage-settings | Yes | No | No |
| action:export-data | Yes | Yes | No |
| action:seed-data | Yes | No | No |

## Implementation
- File: `src/lib/rbac.ts`
- The `hasPermission(role, permission)` function checks if a given role has access to a specific permission.
- The old `canAccess()` function in `src/lib/auth.ts` used a hierarchy model; the new RBAC uses explicit permission lists per resource.

## Role Descriptions
- **admin**: Full access to all features, settings, team management, and data operations.
- **gestor**: Access to operational features, campaigns, reports, and AI assistant. Cannot manage team, settings, security, or integrations.
- **operador**: Limited to core operational pages (dashboard, leads, pipeline, deals, inbox, whatsapp, tasks, productivity). Cannot access campaigns, reports, settings, or administrative features.
