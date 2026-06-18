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

export interface CarbonFactor {
  id: string;

  category: CarbonCategory;

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
  // TRANSPORT
  {
    id: 'transport_motor',
    category: 'transport',
    name: 'Motorcycle',
    name_id: 'Sepeda Motor',
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
    name: 'Car',
    name_id: 'Mobil',
    factor: 0.21,
    unit: 'kg_co2_per_km',
    unit_label: 'kg CO₂/km',
    default_quantity_label: 'km',
    source: 'IPCC / Indonesia estimate',
    year: 2023,
    confidence: 'medium',
    is_reduction: false,
  },
  // EVENTS
  {
    id: 'event_offline_training',
    category: 'events',
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
  // ENVIRONMENT (NEGATIVE)
  {
    id: 'environment_tree',
    category: 'environment',
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
  // ENERGY
  {
    id: 'energy_pln',
    category: 'energy',
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
