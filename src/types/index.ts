// ── Lead ────────────────────────────────────────────────────────────────────

export type LeadTemperature = 'cold' | 'warm' | 'hot'

export type LeadSource =
  | 'instagram'
  | 'facebook'
  | 'google'
  | 'whatsapp'
  | 'event'
  | 'website'
  | 'referral'
  | 'manual'
  | 'import'
  | 'meta_ads'
  | 'facebook_lead_ad'

export type LeadStatus =
  | 'new'
  | 'contacted'
  | 'qualified'
  | 'negotiating'
  | 'converted'
  | 'lost'

// ── Campaign ────────────────────────────────────────────────────────────────

export type CampaignStatus =
  | 'draft'
  | 'scheduled'
  | 'sending'
  | 'completed'
  | 'paused'
  | 'cancelled'

export type CampaignChannel = 'whatsapp' | 'sms' | 'email' | 'instagram' | 'messenger'

// ── Message ─────────────────────────────────────────────────────────────────

export type MessageDirection = 'inbound' | 'outbound'

// ── User ────────────────────────────────────────────────────────────────────

export type UserRole = 'admin' | 'manager' | 'agent'

// ── Task ────────────────────────────────────────────────────────────────────

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'

// ── Pipeline ────────────────────────────────────────────────────────────────

export interface PipelineStageConfig {
  id: string
  name: string
  color: string
  order: number
  isWon: boolean
  isLost: boolean
}

// ── Dashboard ───────────────────────────────────────────────────────────────

export interface DashboardStats {
  totalLeads: number
  newLeadsToday: number
  conversionRate: number
  activeDeals: number
  totalRevenue: number
  campaignsSent: number
  responseRate: number
  avgResponseTime: number
}

// ── Kanban ───────────────────────────────────────────────────────────────────

export interface KanbanCard {
  id: string
  name: string
  photo: string | null
  phone: string | null
  whatsapp: string | null
  email: string | null
  source: LeadSource
  consultant: string | null
  lastInteraction: string | null
  temperature: LeadTemperature
  aiScore: number | null
  tags: string[]
  courseInterest: string | null
  status: LeadStatus
  entryDate: string
}

// ── Campaign Metrics ────────────────────────────────────────────────────────

export interface CampaignMetrics {
  totalSent: number
  delivered: number
  read: number
  replied: number
  failed: number
  deliveryRate: number
  readRate: number
  responseRate: number
}

// ── Conversation (Unified Inbox) ────────────────────────────────────────────

export type ConversationChannel = 'whatsapp' | 'instagram' | 'messenger' | 'email'

export type ConversationStatus = 'open' | 'pending' | 'resolved' | 'closed'

export interface InboxConversation {
  id: string
  channel: ConversationChannel
  status: ConversationStatus
  lead: {
    id: string
    name: string
    avatar?: string
    phone?: string
    email?: string
  }
  assignee?: { id: string; name: string; avatar?: string }
  lastMessage: string
  lastMessageAt: string
  unreadCount: number
  aiSuggestion?: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
}

export interface ConversationMsg {
  id: string
  direction: MessageDirection
  content: string
  contentType: 'text' | 'image' | 'audio' | 'video' | 'document'
  mediaUrl?: string
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed'
  aiGenerated: boolean
  createdAt: string
  sender?: { id: string; name: string }
}

// ── Phone Call ──────────────────────────────────────────────────────────────

export type CallDirection = 'inbound' | 'outbound'
export type CallStatus = 'initiated' | 'ringing' | 'in_progress' | 'completed' | 'missed' | 'failed'

export interface PhoneCallRecord {
  id: string
  direction: CallDirection
  status: CallStatus
  phoneNumber: string
  leadName?: string
  duration?: number
  recordingUrl?: string
  transcription?: string
  aiSummary?: string
  aiSentiment?: 'positive' | 'neutral' | 'negative'
  startedAt: string
  endedAt?: string
}

// ── Automation ──────────────────────────────────────────────────────────────

export type AutomationTrigger =
  | 'new_lead'
  | 'lead_status_change'
  | 'no_response'
  | 'form_submission'
  | 'meta_ad_lead'
  | 'scheduled'
  | 'tag_added'

export type AutomationStepType =
  | 'send_whatsapp'
  | 'send_email'
  | 'send_sms'
  | 'wait'
  | 'condition'
  | 'assign_user'
  | 'add_tag'
  | 'update_lead'
  | 'ai_response'
  | 'notify_team'

export interface AutomationFlowConfig {
  id: string
  name: string
  description?: string
  trigger: AutomationTrigger
  isActive: boolean
  lastRunAt?: string
  runCount: number
  steps: AutomationStepConfig[]
}

export interface AutomationStepConfig {
  id: string
  type: AutomationStepType
  order: number
  config?: Record<string, unknown>
  delay: number
  delayUnit: 'minutes' | 'hours' | 'days'
  condition?: string
}

// ── Meta Ads ────────────────────────────────────────────────────────────────

export type MetaAdsPlatform = 'facebook' | 'instagram' | 'audience_network'
export type MetaAdsObjective = 'lead_generation' | 'conversions' | 'traffic' | 'awareness' | 'engagement'
export type MetaAdsStatus = 'draft' | 'active' | 'paused' | 'completed' | 'error'

export interface MetaAdsCampaignData {
  id: string
  name: string
  platform: MetaAdsPlatform
  objective: MetaAdsObjective
  status: MetaAdsStatus
  budget: number
  budgetType: 'daily' | 'lifetime'
  spend: number
  impressions: number
  clicks: number
  leads: number
  conversions: number
  cpc?: number
  cpl?: number
  ctr?: number
  roas?: number
  startDate?: string
  endDate?: string
}

// ── Gamification ────────────────────────────────────────────────────────────

export interface AchievementData {
  id: string
  name: string
  description: string
  icon: string
  category: 'sales' | 'communication' | 'speed' | 'consistency'
  threshold: number
  xpReward: number
  unlocked: boolean
  unlockedAt?: string
  progress: number
}

export interface UserRanking {
  userId: string
  name: string
  avatar?: string
  xp: number
  level: number
  leadsConverted: number
  revenue: number
  tasksCompleted: number
  responseTime: number
  rank: number
}

// ── Filter / Sort helpers ───────────────────────────────────────────────────

export interface LeadFilters {
  source: LeadSource | null
  temperature: LeadTemperature | null
  status: LeadStatus | null
  consultant: string | null
  tags: string[]
  search: string
  dateRange: { from: string | null; to: string | null }
}

export type SortOrder = 'asc' | 'desc'

export type ViewMode = 'table' | 'grid' | 'kanban'
