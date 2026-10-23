/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Language = 'en' | 'hi' | 'mr' | 'gu' | 'pa' | 'ta' | 'te' | 'kn' | 'bn';

export type UserRole = 'farmer' | 'drone_pilot' | 'outlet_manager' | 'admin' | 'guest';

export interface Farm {
  id: string;
  name: string;
  location: string;
  area: number;
  areaUnit: 'acre' | 'hectare' | 'guntha';
  crop: string;
  sowingDate: string;
  irrigationType: 'drip' | 'sprinkler' | 'flood' | 'rainfed';
  latestHealthScore: number;
  lastScanDate: string;
  nextScanDate: string;
  activeAlertsCount: number;
  boundary: { lat: number; lng: number }[];
}

export interface Booking {
  id: string;
  farmId: string;
  farmName: string;
  crop: string;
  serviceType: 'basic' | 'ai_report' | 'sensor_confirm' | 'reinspection' | 'seasonal' | 'emergency';
  area: number;
  price: number;
  outletId: string;
  dateTime: string;
  timeSlot: string;
  operatorId: string;
  operatorName: string;
  status: 'pending' | 'confirmed' | 'assigned' | 'travelling' | 'started' | 'uploading' | 'completed' | 'cancelled';
  paymentMethod: 'upi' | 'cash' | 'card' | 'netbanking' | 'wallet' | 'fpc';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  travelFee: number;
  areaCharge: number;
  sensorFee: number;
  discount: number;
}

export interface SensorData {
  moisture: number;
  nitrogen: 'Low' | 'Medium' | 'High';
  phosphorus: 'Low' | 'Medium' | 'High';
  potassium: 'Low' | 'Medium' | 'High';
  pH: number;
  airTemp: number;
  soilTemp: number;
  humidity: number;
  rainfall: number;
  leafWetness: number;
  lastUpdated: string;
}

export interface Alert {
  id: string;
  title: string;
  description: string;
  severity: 'info' | 'attention' | 'high' | 'critical';
  zone: string;
  time: string;
  completed?: boolean;
}

export interface ZoneInfo {
  id: string;
  name: string;
  healthScore: number;
  area: string;
  status: 'healthy' | 'good' | 'observation' | 'stressed' | 'critical' | 'unscanned';
  droneImage: string;
  defectRegion?: string;
  probableCause?: string;
  confidence?: number;
  sensorMoisture?: number;
  sensorNitrogen?: string;
  recommendedAction?: string;
}

export interface Expert {
  id: string;
  name: string;
  qualification: string;
  specialization: string;
  languages: string[];
  availability: string;
  rating: number;
  fee: number;
  avatar: string;
}

export interface GovernmentScheme {
  id: string;
  name: string;
  eligibility: string;
  benefits: string;
  documents: string[];
  deadline: string;
}

export interface MandiPrice {
  id: string;
  crop: string;
  mandi: string;
  priceRange: string;
  trend: 'up' | 'down' | 'stable';
  lastUpdated: string;
}

export interface ExpenseLog {
  id: string;
  farmId: string;
  category: 'seeds' | 'fertilisers' | 'pesticides' | 'labour' | 'irrigation' | 'drone' | 'equipment' | 'transport' | 'other';
  amount: number;
  date: string;
  notes?: string;
}
