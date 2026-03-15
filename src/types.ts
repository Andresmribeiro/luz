export interface Point {
  lat: number;
  lng: number;
  id: string;
  timestamp: number;
  data?: any;
}

export interface PropertyPolygon {
  id: string;
  name: string;
  coordinates: [number, number][];
  area: number; // in hectares
  crop?: string;
  lastAnalysis?: string;
}

export interface SoilSample {
  id: string;
  pointId: string;
  ph: number;
  organicMatter: number;
  clay: number;
  phosphorus: number;
  potassium: number;
  aluminum: number;
  timestamp: number;
}

export interface WeatherData {
  temp: number;
  condition: string;
  city: string;
  humidity: number;
  windSpeed: number;
}
