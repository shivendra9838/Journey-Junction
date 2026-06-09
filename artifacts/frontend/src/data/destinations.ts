export interface HighlightItem { icon: string; label: string; value: string; }
export interface ActivityItem { title: string; category: string; duration: string; price: string; image: string; badge: string | null; }
export interface HotelItem { name: string; stars: number; price: string; perNight: string; image: string; tag: string; }
export interface TransportPlanItem { tier: "VVIP" | "VIP" | "Normal" | string; title: string; vehicles: string; price: string; description: string; image?: string; }
export interface MealPlanItem { tier: "VVIP" | "VIP" | "Normal" | string; title: string; includes: string; price: string; description: string; image?: string; }
export interface FlightItem { from: string; code: string; flag: string; airline: string; duration: string; frequency: string; price: string; direct: boolean; }
export interface TrainItem { from: string; duration: string; type: string; operator: string; price: string; icon: string; note: string; }
export interface TransferItem { type: string; desc: string; duration: string; price: string; icon: string; recommended: boolean; }
export interface WeatherMonth { month: string; high: number; low: number; rain: number; sun: number; crowd: number; }
export interface Season { label: string; months: string; color: string; ring: string; text: string; bg: string; border: string; icon: string; desc: string; }
export type TripType = "Couple" | "Solo" | "Family" | "Business";
export interface Review { id: string; name: string; location: string; avatar: string; tripType: TripType; date: string; rating: number; title: string; review: string; photos: string[]; helpful: number; }
export interface QuickAddItem { id: string; name: string; type: "activity" | "hotel" | "transport"; duration: string; price: number; emoji: string; }
export interface MapPoint { to: string; dist: string; time: string; color: string; }
export interface BotReplies { default: string; hotel: string; activity: string; weather: string; price: string; food: string; }

export interface DestinationData {
  id: string;
  name: string;
  city: string;
  state: string;
  country: string;
  region: string;
  tagline: string;
  rating: number;
  reviews: number;
  latitude?: number;
  longitude?: number;
  climateLabel: string;
  heroImage: string;
  gallery: string[];
  highlights: HighlightItem[];
  about: {
    label: string;
    heading: string;
    para1: string;
    para2: string;
    tags: string[];
    ctaHeading: string;
    ctaDesc: string;
  };
  activities: ActivityItem[];
  hotels: HotelItem[];
  transports?: TransportPlanItem[];
  meals?: MealPlanItem[];
  flightIntro: string;
  flights: FlightItem[];
  flightTip: string;
  trainIntro: string;
  trains: TrainItem[];
  trainTip: string;
  airportName: string;
  airportCode: string;
  transferIntro: string;
  transfers: TransferItem[];
  transferTip: string;
  mapPoints: MapPoint[];
  weatherData: WeatherMonth[];
  seasons: Season[];
  reviewsData: Review[];
  communityPhotos: string[];
  quickAdds: QuickAddItem[];
  botReplies: BotReplies;
}

export const DESTINATIONS: DestinationData[] = [];

export function getDestinationById(id: string): DestinationData | null {
  return null;
}
