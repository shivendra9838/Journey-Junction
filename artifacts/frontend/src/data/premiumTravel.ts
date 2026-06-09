export interface TravelPackage {
  id: string;
  title: string;
  destination: string;
  duration: string;
  rating: number;
  price: string;
  coverImage: string;
  highlights: string[];
}

export interface BlogPost {
  id: string;
  title: string;
  image: string;
  readTime: string;
  author: string;
  category: string;
  excerpt: string;
}

export interface TravellerMoment {
  id: string;
  user: string;
  destination: string;
  image: string;
  likes: string;
  tag: string;
}

export const heroSlides = [
  {
    name: "Goa",
    label: "Beach escapes",
    image: "/images/unsplash-be41aa2e4372.jpg",
  },
  {
    name: "Kerala",
    label: "Backwaters",
    image: "/images/unsplash-7916115aeef0.jpg",
  },
  {
    name: "Kashmir",
    label: "Mountain journeys",
    image: "/images/unsplash-67cfe84b31d8.jpg",
  },
  {
    name: "Rajasthan",
    label: "Royal heritage",
    image: "/images/unsplash-7ad0e26a32dc.jpg",
  },
];

export const travelPackages: TravelPackage[] = [
  {
    id: "goa-escape",
    title: "Goa Escape",
    destination: "Goa",
    duration: "4D/3N",
    rating: 4.8,
    price: "INR 12,999",
    coverImage: "/images/unsplash-be41aa2e4372.jpg",
    highlights: ["Beach resort stay", "Dolphin cruise", "Old Goa walk"],
  },
  {
    id: "kerala-backwaters",
    title: "Kerala Backwaters",
    destination: "Kerala",
    duration: "6D/5N",
    rating: 4.9,
    price: "INR 24,999",
    coverImage: "/images/unsplash-7916115aeef0.jpg",
    highlights: ["Houseboat night", "Spice plantation", "Munnar tea trails"],
  },
  {
    id: "kashmir-paradise",
    title: "Kashmir Paradise",
    destination: "Kashmir",
    duration: "7D/6N",
    rating: 4.9,
    price: "INR 31,999",
    coverImage: "/images/unsplash-67cfe84b31d8.jpg",
    highlights: ["Dal Lake stay", "Gulmarg day trip", "Pahalgam valley"],
  },
  {
    id: "royal-rajasthan",
    title: "Royal Rajasthan",
    destination: "Rajasthan",
    duration: "5D/4N",
    rating: 4.8,
    price: "INR 19,499",
    coverImage: "/images/unsplash-7ad0e26a32dc.jpg",
    highlights: ["Jaipur forts", "Desert camp", "Heritage haveli"],
  },
];

export const fullIndiaMapPath = "M209 25C230 42 260 39 281 27C297 19 316 30 323 49C329 70 356 75 377 91C397 106 397 133 378 151C363 165 370 185 391 193C423 207 461 199 485 219C502 234 490 258 463 262C431 269 405 263 382 280C365 293 369 318 386 333C408 352 410 380 388 397C366 414 329 399 308 419C287 440 298 476 277 494C258 511 235 505 224 529C214 550 220 585 198 604C179 588 170 557 155 532C140 508 107 495 97 462C88 433 110 412 102 385C96 364 70 351 62 326C53 298 75 279 81 253C89 224 67 204 72 175C77 146 111 139 121 111C129 87 114 58 139 41C159 27 187 43 209 25Z";

export const mapRegions = [
  {
    id: "north",
    name: "North",
    fullName: "North India",
    query: "North India",
    count: 5,
    fill: "#f59e0b",
    hoverFill: "#d97706",
    label: { x: 230, y: 101 },
    path: "M115 21H385V169C336 149 286 146 239 164C192 183 151 162 110 139Z",
    destinations: ["Uttarakhand", "Kashmir", "Rajasthan", "Himachal Pradesh", "Delhi"],
  },
  {
    id: "west",
    name: "West",
    fullName: "West India",
    query: "West Coast",
    count: 4,
    fill: "#0ea5e9",
    hoverFill: "#0284c7",
    label: { x: 138, y: 284 },
    path: "M66 131C120 164 181 176 239 164C220 207 207 257 202 315C196 374 205 419 231 465C176 449 125 414 96 357C61 288 52 207 66 131Z",
    destinations: ["Goa", "Mumbai", "Gujarat", "Rajasthan"],
  },
  {
    id: "east",
    name: "East",
    fullName: "East India",
    query: "East India",
    count: 3,
    fill: "#f43f5e",
    hoverFill: "#e11d48",
    label: { x: 300, y: 291 },
    path: "M239 164C288 145 337 151 384 173C371 220 357 267 369 322C381 377 356 424 303 423C258 422 222 384 202 315C207 257 220 207 239 164Z",
    destinations: ["Kolkata", "Odisha", "Bihar"],
  },
  {
    id: "south",
    name: "South",
    fullName: "South India",
    query: "South India",
    count: 4,
    fill: "#10b981",
    hoverFill: "#059669",
    label: { x: 205, y: 486 },
    path: "M202 315C237 340 282 366 309 419C292 450 263 472 246 509C233 536 233 575 204 610C180 584 168 544 151 512C130 475 94 457 82 414C98 372 141 339 202 315Z",
    destinations: ["Kerala", "Tamil Nadu", "Karnataka", "Andhra Pradesh"],
  },
  {
    id: "north-east",
    name: "North East",
    fullName: "North East India",
    query: "North East",
    count: 3,
    fill: "#8b5cf6",
    hoverFill: "#7c3aed",
    label: { x: 431, y: 233 },
    path: "M374 178C411 167 467 178 494 211C518 240 493 270 458 276C426 281 405 302 377 287C349 273 351 197 374 178Z",
    destinations: ["Meghalaya", "Assam", "Sikkim"],
  },
];

export const mapMarkers = [
  { id: "goa", name: "Goa", regionId: "west", x: 154, y: 401 },
  { id: "kerala", name: "Kerala", regionId: "south", x: 198, y: 552 },
  { id: "kashmir", name: "Kashmir", regionId: "north", x: 208, y: 54 },
  { id: "rajasthan", name: "Rajasthan", regionId: "west", x: 126, y: 206 },
  { id: "meghalaya", name: "Meghalaya", regionId: "north-east", x: 437, y: 231 },
  { id: "uttarakhand", name: "Uttarakhand", regionId: "north", x: 274, y: 137 },
];

export const mapBoundaryLines = [
  "M115 169C160 190 198 189 239 164C286 145 337 151 384 173",
  "M202 315C230 296 271 298 369 322",
  "M202 315C168 340 125 365 96 357",
  "M239 164C225 210 211 256 202 315",
  "M384 173C392 204 391 248 377 287",
  "M151 512C176 500 213 504 246 509",
];

export const travellerMoments: TravellerMoment[] = [
  { id: "m1", user: "Aarav Sharma", destination: "Goa", image: "/images/unsplash-451710d2942a.jpg", likes: "12.4K", tag: "Beach" },
  { id: "m2", user: "Meera Iyer", destination: "Kerala", image: "/images/unsplash-88294ae03d7b.jpg", likes: "9.8K", tag: "Backwaters" },
  { id: "m3", user: "Riya Kapoor", destination: "Kashmir", image: "/images/unsplash-67cfe84b31d8.png", likes: "18.1K", tag: "Mountains" },
  { id: "m4", user: "Kabir Khan", destination: "Rajasthan", image: "/images/unsplash-7ad0e26a32dc.jpg", likes: "8.7K", tag: "Heritage" },
  { id: "m5", user: "Nisha Rao", destination: "Rishikesh", image: "/images/unsplash-43236e822084.jpg", likes: "7.2K", tag: "Adventure" },
];

export const blogPosts: BlogPost[] = [
  {
    id: "best-time-india",
    title: "Best Time To Visit India By Region",
    image: "/images/unsplash-67cfe84b31d8.png",
    readTime: "6 min read",
    author: "Wandr Editorial",
    category: "Season Guide",
    excerpt: "A practical region-wise guide for choosing the right month for beaches, mountains, deserts and temples.",
  },
  {
    id: "goa-first-trip",
    title: "How To Plan Your First Goa Trip",
    image: "/images/unsplash-be41aa2e4372.jpg",
    readTime: "5 min read",
    author: "Neha S.",
    category: "Itinerary",
    excerpt: "Where to stay, what to skip, and how to balance beach time with food, markets and heritage.",
  },
  {
    id: "rajasthan-route",
    title: "A Royal Rajasthan Route For 5 Days",
    image: "/images/unsplash-7ad0e26a32dc.jpg",
    readTime: "7 min read",
    author: "Aman V.",
    category: "Road Trip",
    excerpt: "A compact Jaipur, Jodhpur and desert camp plan with realistic drive times and hotel zones.",
  },
];

export const comparisonRows = [
  { label: "Budget", goa: "INR 3,500-8,000/day", kerala: "INR 4,000-9,000/day" },
  { label: "Weather", goa: "Tropical, best Nov-Feb", kerala: "Humid, best Oct-Mar" },
  { label: "Nightlife", goa: "Excellent", kerala: "Quiet and relaxed" },
  { label: "Family Friendly", goa: "Very good", kerala: "Excellent" },
  { label: "Beaches", goa: "Best in class", kerala: "Calmer coastal stays" },
  { label: "Food", goa: "Seafood and cafes", kerala: "Sadya, seafood, spices" },
  { label: "Adventure", goa: "Water sports", kerala: "Treks, wildlife, kayaking" },
];
