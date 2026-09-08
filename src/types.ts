export interface LatLng {
  lat: number;
  lng: number;
}

export interface PathPoint extends LatLng {
  timestamp: number;
}

export interface CapturedArea {
  id: string;
  points: LatLng[];
  areaSqMiles: number;
  timestamp: number;
}

export type GamePhase = 'IDLE' | 'TRACKING' | 'ANCHORED';

export interface SetupChecklistItem {
  id: string;
  category: 'Tooling' | 'Hardware' | 'Meta AI App' | 'Developer Mode' | 'HTTPS Hosting' | 'Verification';
  title: string;
  detail: string;
  status: 'pending' | 'verified' | 'action_needed';
}
