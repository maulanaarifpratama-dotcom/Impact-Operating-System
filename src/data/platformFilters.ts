export type FilterGateway = 'all' | 'goodstack' | 'techsoup' | 'direct' | 'both'
export type FilterPricing = 'all' | 'free' | 'discount' | 'credits' | 'admin_fee'
export type FilterCategory = 'all' | 'gateway' | 'ops' | 'marketing' | 'ai' | 'project_mgmt' | 'crm' | 'finance' | 'tech' | 'security' | 'legal' | 'storage' | 'event' | 'data' | 'website'
export type FilterSort = 'priority' | 'name_asc' | 'name_desc' | 'discount_high'

export const GATEWAY_FILTERS = [
  { id: 'all' as FilterGateway, label: 'Semua Gateway' },
  { id: 'goodstack' as FilterGateway, label: 'Via Goodstack' },
  { id: 'techsoup' as FilterGateway, label: 'Via TechSoup' },
  { id: 'both' as FilterGateway, label: 'Via Keduanya' },
  { id: 'direct' as FilterGateway, label: 'Langsung' },
]

export const PRICING_FILTERS = [
  { id: 'all' as FilterPricing, label: 'Semua Harga' },
  { id: 'free' as FilterPricing, label: 'Gratis', color: 'green' },
  { id: 'discount' as FilterPricing, label: 'Diskon', color: 'blue' },
  { id: 'credits' as FilterPricing, label: 'Credits', color: 'purple' },
  { id: 'admin_fee' as FilterPricing, label: 'Admin Fee', color: 'amber' },
]

export const CATEGORY_FILTERS = [
  { id: 'all' as FilterCategory, label: 'Semua Kategori' },
  { id: 'gateway' as FilterCategory, label: '🔑 Gateway' },
  { id: 'ops' as FilterCategory, label: '⚙️ Operasional' },
  { id: 'marketing' as FilterCategory, label: '📣 Marketing' },
  { id: 'ai' as FilterCategory, label: '🤖 AI Tools' },
  { id: 'project_mgmt' as FilterCategory, label: '📋 Project Mgmt' },
  { id: 'crm' as FilterCategory, label: '👥 CRM' },
  { id: 'finance' as FilterCategory, label: '💰 Finance' },
  { id: 'tech' as FilterCategory, label: '☁️ Cloud & Tech' },
  { id: 'security' as FilterCategory, label: '🔒 Security' },
  { id: 'legal' as FilterCategory, label: '📄 Legal & Dokumen' },
  { id: 'storage' as FilterCategory, label: '🗄️ Storage' },
  { id: 'event' as FilterCategory, label: '🎟️ Event' },
  { id: 'data' as FilterCategory, label: '📊 Data & Analitik' },
  { id: 'website' as FilterCategory, label: '🌐 Website' },
]

export const SORT_OPTIONS = [
  { id: 'priority' as FilterSort, label: 'Prioritas' },
  { id: 'name_asc' as FilterSort, label: 'A → Z' },
  { id: 'name_desc' as FilterSort, label: 'Z → A' },
  { id: 'discount_high' as FilterSort, label: 'Diskon Terbesar' },
]
