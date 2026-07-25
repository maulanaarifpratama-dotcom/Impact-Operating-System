export type CarbonUnit =
  | 'kg_co2_per_unit'
  | 'kg_co2_per_km'
  | 'kg_co2_per_kwh'
  | 'kg_co2_per_event'

export type CarbonCategory =
  | 'transport'
  | 'events'
  | 'environment'
  | 'energy'
  | 'procurement'

export type CarbonScope = 'scope_1' | 'scope_2' | 'scope_3';

export interface CarbonFactor {
  id: string;

  category: CarbonCategory;
  default_scope: CarbonScope;

  name: string;
  name_id: string;

  factor: number;
  unit: CarbonUnit;
  unit_label: string;
  default_quantity_label: string;

  source: string;
  year: number;
  confidence: 'low' | 'medium' | 'high';

  is_reduction: boolean;

  tags?: string[];
  notes?: string;
}

export const CARBON_FACTORS_INDONESIA: CarbonFactor[] = [
  // TRANSPORT (Scope 1: Direct emissions from owned/controlled vehicles)
  {
    id: 'transport_motor',
    category: 'transport',
    default_scope: 'scope_1',
    name: 'Motorcycle',
    name_id: 'Sepeda Motor (Operasional)',
    factor: 0.10,
    unit: 'kg_co2_per_km',
    unit_label: 'kg CO₂/km',
    default_quantity_label: 'km',
    source: 'GHG Protocol / Indonesia adjusted',
    year: 2023,
    confidence: 'medium',
    is_reduction: false,
    tags: ['transport', 'field'],
  },
  {
    id: 'transport_car',
    category: 'transport',
    default_scope: 'scope_1',
    name: 'Car',
    name_id: 'Mobil Operasional',
    factor: 0.21,
    unit: 'kg_co2_per_km',
    unit_label: 'kg CO₂/km',
    default_quantity_label: 'km',
    source: 'IPCC / Indonesia estimate',
    year: 2023,
    confidence: 'medium',
    is_reduction: false,
  },
  // EVENTS (Scope 3: Value chain / business travel / participant travel)
  {
    id: 'event_offline_training',
    category: 'events',
    default_scope: 'scope_3',
    name: 'Offline Training',
    name_id: 'Pelatihan Offline',
    factor: 2.0,
    unit: 'kg_co2_per_event',
    unit_label: 'kg CO₂/event',
    default_quantity_label: 'event',
    source: 'GHG Protocol Scope 3',
    year: 2023,
    confidence: 'low',
    is_reduction: false,
  },
  {
    id: 'event_webinar',
    category: 'events',
    default_scope: 'scope_3',
    name: 'Webinar',
    name_id: 'Pelatihan Online',
    factor: 0.1,
    unit: 'kg_co2_per_event',
    unit_label: 'kg CO₂/event',
    default_quantity_label: 'event',
    source: 'Estimated digital footprint',
    year: 2023,
    confidence: 'low',
    is_reduction: false,
  },
  // ENVIRONMENT (Scope 3: GHG Removal / Value Chain Offset)
  {
    id: 'environment_tree',
    category: 'environment',
    default_scope: 'scope_3',
    name: 'Tree Planting',
    name_id: 'Penanaman Pohon',
    factor: -5.0,
    unit: 'kg_co2_per_unit',
    unit_label: 'kg CO₂/unit',
    default_quantity_label: 'pohon',
    source: 'IPCC / forestry estimates',
    year: 2020,
    confidence: 'medium',
    is_reduction: true,
  },
  // ENERGY (Scope 2: Purchased electricity)
  {
    id: 'energy_pln',
    category: 'energy',
    default_scope: 'scope_2',
    name: 'Electricity PLN',
    name_id: 'Listrik PLN',
    factor: 0.87,
    unit: 'kg_co2_per_kwh',
    unit_label: 'kg CO₂/kWh',
    default_quantity_label: 'kWh',
    source: 'ESDM Indonesia 2023',
    year: 2023,
    confidence: 'high',
    is_reduction: false,
  }
];

export const CARBON_FACTOR_MAP = Object.fromEntries(
  CARBON_FACTORS_INDONESIA.map(f => [f.id, f])
);
