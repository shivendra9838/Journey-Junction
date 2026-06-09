import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Activity,
  BedDouble,
  Compass,
  Heart,
  KeyRound,
  LogOut,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Star,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  ActivityV1,
  DestinationV1,
  HotelV1,
  PhaseUser,
  ReviewV1,
  clearPhase1Tokens,
  getPhase1Tokens,
  normalizeList,
  phase1Fetch,
  setPhase1Tokens,
} from "@/lib/phase1Api";

type AuthResponse = { user: PhaseUser; accessToken: string; refreshToken: string; verificationToken?: string };
type DetailResponse = {
  destination: DestinationV1;
  nearbyDestinations: DestinationV1[];
  activities: ActivityV1[];
  hotels: HotelV1[];
  weather: { summary: string; bestTime?: string };
};

const emptyDestination = {
  name: "",
  slug: "",
  state: "",
  region: "",
  description: "",
  heroImage: "",
  gallery: "",
  bestTime: "",
  temperature: "",
  language: "Hindi, English",
  currency: "INR",
  latitude: "0",
  longitude: "0",
};

function toNumber(value: string, fallback = 0) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function splitCsv(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function ErrorLine({ value }: { value: unknown }) {
  if (!value) return null;
  const message = value instanceof Error ? value.message : String(value);
  return <div className="rounded-md border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{message}</div>;
}

function SectionTitle({ icon, title, detail }: { icon: React.ReactNode; title: string; detail: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-white">{icon}</div>
      <div>
        <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
        <p className="text-sm text-slate-500">{detail}</p>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text" }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-slate-700">
      {label}
      <Input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </label>
  );
}

export default function Phase1PlatformPage() {
  const queryClient = useQueryClient();
  const [authUser, setAuthUser] = useState<PhaseUser | null>(null);
  const [auth, setAuth] = useState({ name: "", email: "", phone: "", password: "" });
  const [tokenInput, setTokenInput] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [message, setMessage] = useState("");
  const [destinationForm, setDestinationForm] = useState(emptyDestination);
  const [selectedSlug, setSelectedSlug] = useState("");
  const [hotelForm, setHotelForm] = useState({ name: "", destinationId: "", description: "", images: "", amenities: "", address: "", pricePerNight: "2500", rating: "4.2" });
  const [activityForm, setActivityForm] = useState({ title: "", destinationId: "", description: "", duration: "2 hours", difficulty: "easy", images: "", price: "999" });
  const [wishlistDestinationId, setWishlistDestinationId] = useState("");
  const [reviewForm, setReviewForm] = useState({ destinationId: "", rating: "5", review: "", images: "" });
  const [searchQ, setSearchQ] = useState("");

  const hasToken = Boolean(getPhase1Tokens().accessToken);

  const destinations = useQuery({
    queryKey: ["phase1", "destinations"],
    queryFn: async () => normalizeList<DestinationV1>(await phase1Fetch("/destinations?limit=50")),
  });
  const hotels = useQuery({
    queryKey: ["phase1", "hotels"],
    queryFn: async () => normalizeList<HotelV1>(await phase1Fetch("/hotels?limit=50")),
  });
  const activities = useQuery({
    queryKey: ["phase1", "activities"],
    queryFn: async () => normalizeList<ActivityV1>(await phase1Fetch("/activities")),
  });
  const wishlist = useQuery({
    queryKey: ["phase1", "wishlist", hasToken],
    enabled: hasToken,
    queryFn: async () => normalizeList(await phase1Fetch("/wishlist")),
  });
  const reviews = useQuery({
    queryKey: ["phase1", "reviews"],
    queryFn: async () => normalizeList<ReviewV1>(await phase1Fetch("/reviews")),
  });
  const detail = useQuery({
    queryKey: ["phase1", "destination-detail", selectedSlug],
    enabled: selectedSlug.length > 0,
    queryFn: async () => phase1Fetch<DetailResponse>(`/destinations/${selectedSlug}`),
  });
  const search = useQuery({
    queryKey: ["phase1", "search", searchQ],
    enabled: searchQ.trim().length > 1,
    queryFn: async () => phase1Fetch<{ destinations: DestinationV1[]; hotels: HotelV1[]; activities: ActivityV1[] }>(`/search?q=${encodeURIComponent(searchQ)}`),
  });

  const selectedDestinationId = useMemo(() => destinations.data?.[0]?.id ?? "", [destinations.data]);

  const login = useMutation({
    mutationFn: (mode: "login" | "register") =>
      phase1Fetch<AuthResponse>(`/auth/${mode}`, {
        method: "POST",
        body: JSON.stringify(mode === "login" ? { email: auth.email, password: auth.password } : auth),
      }),
    onSuccess(data) {
      setPhase1Tokens(data);
      setAuthUser(data.user);
      setMessage(data.verificationToken ? `Verification token: ${data.verificationToken}` : "Signed in successfully");
    },
  });

  const refresh = useMutation({
    mutationFn: () => phase1Fetch<AuthResponse>("/auth/refresh", { method: "POST", body: JSON.stringify({ refreshToken: getPhase1Tokens().refreshToken }) }),
    onSuccess(data) {
      setPhase1Tokens(data);
      setAuthUser(data.user);
      setMessage("Token refreshed");
    },
  });

  const logout = useMutation({
    mutationFn: () => phase1Fetch("/auth/logout", { method: "POST", body: JSON.stringify({ refreshToken: getPhase1Tokens().refreshToken }) }),
    onSettled() {
      clearPhase1Tokens();
      setAuthUser(null);
      setMessage("Signed out");
      queryClient.invalidateQueries({ queryKey: ["phase1"] });
    },
  });

  const profile = useQuery({
    queryKey: ["phase1", "profile", hasToken],
    enabled: hasToken,
    queryFn: async () => phase1Fetch<{ user: PhaseUser }>("/profile"),
  });

  const createDestination = useMutation({
    mutationFn: () => phase1Fetch<{ destination: DestinationV1 }>("/destinations", {
      method: "POST",
      body: JSON.stringify({
        ...destinationForm,
        gallery: splitCsv(destinationForm.gallery),
        latitude: toNumber(destinationForm.latitude),
        longitude: toNumber(destinationForm.longitude),
      }),
    }),
    onSuccess(data) {
      setSelectedSlug(data.destination.slug);
      setDestinationForm(emptyDestination);
      queryClient.invalidateQueries({ queryKey: ["phase1", "destinations"] });
    },
  });

  const deleteDestination = useMutation({
    mutationFn: (id: string) => phase1Fetch(`/destinations/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["phase1", "destinations"] }),
  });

  const createHotel = useMutation({
    mutationFn: () => phase1Fetch("/hotels", {
      method: "POST",
      body: JSON.stringify({
        ...hotelForm,
        destinationId: hotelForm.destinationId || selectedDestinationId,
        images: splitCsv(hotelForm.images),
        amenities: splitCsv(hotelForm.amenities),
        pricePerNight: toNumber(hotelForm.pricePerNight),
        rating: toNumber(hotelForm.rating),
      }),
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["phase1", "hotels"] }),
  });

  const createActivity = useMutation({
    mutationFn: () => phase1Fetch("/activities", {
      method: "POST",
      body: JSON.stringify({
        ...activityForm,
        destinationId: activityForm.destinationId || selectedDestinationId,
        images: splitCsv(activityForm.images),
        price: toNumber(activityForm.price),
      }),
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["phase1", "activities"] }),
  });

  const addWishlist = useMutation({
    mutationFn: () => phase1Fetch("/wishlist", { method: "POST", body: JSON.stringify({ destinationId: wishlistDestinationId || selectedDestinationId }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["phase1", "wishlist"] }),
  });

  const createReview = useMutation({
    mutationFn: () => phase1Fetch("/reviews", {
      method: "POST",
      body: JSON.stringify({
        destinationId: reviewForm.destinationId || selectedDestinationId,
        rating: toNumber(reviewForm.rating, 5),
        review: reviewForm.review,
        images: splitCsv(reviewForm.images),
      }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["phase1", "reviews"] });
      queryClient.invalidateQueries({ queryKey: ["phase1", "destinations"] });
    },
  });

  const updateProfile = useMutation({
    mutationFn: (body: Partial<PhaseUser>) => phase1Fetch<{ user: PhaseUser }>("/profile", { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["phase1", "profile"] }),
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-6 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-950 text-white"><Compass size={22} /></div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Journey Junction Phase 1 Console</h1>
                <p className="text-sm text-slate-500">Screens for every production API module under /api/v1</p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={hasToken ? "default" : "secondary"}>{hasToken ? "Bearer token active" : "Not signed in"}</Badge>
            {authUser && <Badge variant="outline">{authUser.role}</Badge>}
            <Button variant="outline" size="sm" onClick={() => window.location.href = "/"}>Website</Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-6">
        {message && <div className="mb-4 rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div>}
        <Tabs defaultValue="auth" className="space-y-5">
          <TabsList className="grid h-auto w-full grid-cols-2 gap-1 bg-white p-1 md:grid-cols-8">
            <TabsTrigger value="auth">Auth</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="destinations">Destinations</TabsTrigger>
            <TabsTrigger value="hotels">Hotels</TabsTrigger>
            <TabsTrigger value="activities">Activities</TabsTrigger>
            <TabsTrigger value="wishlist">Wishlist</TabsTrigger>
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
            <TabsTrigger value="search">Search</TabsTrigger>
          </TabsList>

          <TabsContent value="auth">
            <Panel>
              <SectionTitle icon={<KeyRound size={18} />} title="Authentication" detail="Register, login, logout, refresh token, forgot/reset password, and email verification." />
              <div className="grid gap-4 md:grid-cols-4">
                <Field label="Name" value={auth.name} onChange={(name) => setAuth({ ...auth, name })} />
                <Field label="Email" value={auth.email} onChange={(email) => setAuth({ ...auth, email })} />
                <Field label="Phone" value={auth.phone} onChange={(phone) => setAuth({ ...auth, phone })} />
                <Field label="Password" type="password" value={auth.password} onChange={(password) => setAuth({ ...auth, password })} />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => login.mutate("register")}><Plus size={16} /> Register</Button>
                <Button variant="outline" onClick={() => login.mutate("login")}><KeyRound size={16} /> Login</Button>
                <Button variant="outline" onClick={() => refresh.mutate()}><RefreshCw size={16} /> Refresh</Button>
                <Button variant="outline" onClick={() => logout.mutate()}><LogOut size={16} /> Logout</Button>
                <Button variant="outline" onClick={async () => setMessage(JSON.stringify(await phase1Fetch("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email: auth.email }) })))}>Forgot Password</Button>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Reset / verification token" value={tokenInput} onChange={setTokenInput} />
                <Field label="New reset password" type="password" value={resetToken} onChange={setResetToken} />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={async () => setMessage(JSON.stringify(await phase1Fetch("/auth/reset-password", { method: "POST", body: JSON.stringify({ token: tokenInput, password: resetToken }) })))}>Reset Password</Button>
                <Button variant="outline" onClick={async () => setMessage(JSON.stringify(await phase1Fetch("/auth/verify-email", { method: "POST", body: JSON.stringify({ token: tokenInput }) })))}>Verify Email</Button>
                <Button variant="outline" onClick={async () => setMessage(JSON.stringify(await phase1Fetch("/auth/send-verification", { method: "POST" })))}>Send Verification</Button>
              </div>
              <ErrorLine value={login.error || refresh.error || logout.error} />
            </Panel>
          </TabsContent>

          <TabsContent value="profile">
            <Panel>
              <SectionTitle icon={<UserRound size={18} />} title="User Profile" detail="Get and update profile fields. Avatar upload endpoint is wired through /profile/avatar." />
              <div className="grid gap-4 md:grid-cols-3">
                <Info label="Name" value={profile.data?.user?.name ?? "-"} />
                <Info label="Email" value={profile.data?.user?.email ?? "-"} />
                <Info label="Verified" value={profile.data?.user?.isVerified ? "Yes" : "No"} />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => updateProfile.mutate({ bio: "I love immersive Indian travel.", city: "Delhi", country: "India", travelPreferences: ["heritage", "mountains"] })}>Update Sample Profile</Button>
                <Button variant="outline" onClick={() => profile.refetch()}>Reload Profile</Button>
              </div>
              <ErrorLine value={profile.error || updateProfile.error} />
            </Panel>
          </TabsContent>

          <TabsContent value="destinations">
            <Panel>
              <SectionTitle icon={<Compass size={18} />} title="Destinations" detail="Admin CRUD, search, filters, pagination, and optimized detail API." />
              <div className="grid gap-3 md:grid-cols-3">
                <Field label="Name" value={destinationForm.name} onChange={(name) => setDestinationForm({ ...destinationForm, name })} />
                <Field label="Slug" value={destinationForm.slug} onChange={(slug) => setDestinationForm({ ...destinationForm, slug })} />
                <Field label="State" value={destinationForm.state} onChange={(state) => setDestinationForm({ ...destinationForm, state })} />
                <Field label="Region" value={destinationForm.region} onChange={(region) => setDestinationForm({ ...destinationForm, region })} />
                <Field label="Hero image URL" value={destinationForm.heroImage} onChange={(heroImage) => setDestinationForm({ ...destinationForm, heroImage })} />
                <Field label="Gallery URLs" value={destinationForm.gallery} onChange={(gallery) => setDestinationForm({ ...destinationForm, gallery })} />
              </div>
              <Textarea value={destinationForm.description} onChange={(event) => setDestinationForm({ ...destinationForm, description: event.target.value })} placeholder="Complete destination description" />
              <Button onClick={() => createDestination.mutate()}><Plus size={16} /> Create Destination</Button>
              <ErrorLine value={destinations.error || createDestination.error || deleteDestination.error || detail.error} />
              <DataTable
                headers={["Name", "State", "Rating", "Actions"]}
                rows={(destinations.data ?? []).map((item) => [
                  <button className="font-semibold text-slate-900 hover:underline" onClick={() => setSelectedSlug(item.slug)}>{item.name}</button>,
                  item.state,
                  item.rating,
                  <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => setSelectedSlug(item.slug)}>Detail</Button><Button size="sm" variant="destructive" onClick={() => deleteDestination.mutate(item.id)}>Delete</Button></div>,
                ])}
              />
              {detail.data && <DetailCard detail={detail.data} />}
            </Panel>
          </TabsContent>

          <TabsContent value="hotels">
            <Panel>
              <SectionTitle icon={<BedDouble size={18} />} title="Hotels" detail="Admin CRUD with destination relation, filters, images, amenities and INR pricing." />
              <div className="grid gap-3 md:grid-cols-4">
                <Field label="Destination ID" value={hotelForm.destinationId} onChange={(destinationId) => setHotelForm({ ...hotelForm, destinationId })} placeholder={selectedDestinationId} />
                <Field label="Name" value={hotelForm.name} onChange={(name) => setHotelForm({ ...hotelForm, name })} />
                <Field label="Price per night" value={hotelForm.pricePerNight} onChange={(pricePerNight) => setHotelForm({ ...hotelForm, pricePerNight })} />
                <Field label="Amenities" value={hotelForm.amenities} onChange={(amenities) => setHotelForm({ ...hotelForm, amenities })} />
              </div>
              <Textarea value={hotelForm.description} onChange={(event) => setHotelForm({ ...hotelForm, description: event.target.value })} placeholder="Hotel description" />
              <Button onClick={() => createHotel.mutate()}><Plus size={16} /> Create Hotel</Button>
              <ErrorLine value={hotels.error || createHotel.error} />
              <DataTable headers={["Hotel", "Price", "Rating"]} rows={(hotels.data ?? []).map((item) => [item.name, `₹${item.pricePerNight}`, item.rating])} />
            </Panel>
          </TabsContent>

          <TabsContent value="activities">
            <Panel>
              <SectionTitle icon={<Activity size={18} />} title="Activities" detail="Admin CRUD with destination relation, duration, difficulty, images and price." />
              <div className="grid gap-3 md:grid-cols-4">
                <Field label="Destination ID" value={activityForm.destinationId} onChange={(destinationId) => setActivityForm({ ...activityForm, destinationId })} placeholder={selectedDestinationId} />
                <Field label="Title" value={activityForm.title} onChange={(title) => setActivityForm({ ...activityForm, title })} />
                <Field label="Difficulty" value={activityForm.difficulty} onChange={(difficulty) => setActivityForm({ ...activityForm, difficulty })} />
                <Field label="Price" value={activityForm.price} onChange={(price) => setActivityForm({ ...activityForm, price })} />
              </div>
              <Textarea value={activityForm.description} onChange={(event) => setActivityForm({ ...activityForm, description: event.target.value })} placeholder="Activity description" />
              <Button onClick={() => createActivity.mutate()}><Plus size={16} /> Create Activity</Button>
              <ErrorLine value={activities.error || createActivity.error} />
              <DataTable headers={["Activity", "Difficulty", "Price"]} rows={(activities.data ?? []).map((item) => [item.title, item.difficulty, `₹${item.price}`])} />
            </Panel>
          </TabsContent>

          <TabsContent value="wishlist">
            <Panel>
              <SectionTitle icon={<Heart size={18} />} title="Wishlist" detail="Add, remove, and list a user's destination wishlist." />
              <div className="flex flex-col gap-3 md:flex-row">
                <Input value={wishlistDestinationId} onChange={(event) => setWishlistDestinationId(event.target.value)} placeholder={selectedDestinationId || "Destination ID"} />
                <Button onClick={() => addWishlist.mutate()}><Heart size={16} /> Add Wishlist</Button>
              </div>
              <ErrorLine value={wishlist.error || addWishlist.error} />
              <pre className="max-h-96 overflow-auto rounded-lg bg-slate-950 p-4 text-xs text-slate-100">{JSON.stringify(wishlist.data ?? [], null, 2)}</pre>
            </Panel>
          </TabsContent>

          <TabsContent value="reviews">
            <Panel>
              <SectionTitle icon={<Star size={18} />} title="Reviews" detail="Create, list, update/delete ownership rules, and automatic destination rating recalculation." />
              <div className="grid gap-3 md:grid-cols-3">
                <Field label="Destination ID" value={reviewForm.destinationId} onChange={(destinationId) => setReviewForm({ ...reviewForm, destinationId })} placeholder={selectedDestinationId} />
                <Field label="Rating" value={reviewForm.rating} onChange={(rating) => setReviewForm({ ...reviewForm, rating })} />
                <Field label="Image URLs" value={reviewForm.images} onChange={(images) => setReviewForm({ ...reviewForm, images })} />
              </div>
              <Textarea value={reviewForm.review} onChange={(event) => setReviewForm({ ...reviewForm, review: event.target.value })} placeholder="Review text" />
              <Button onClick={() => createReview.mutate()}><Star size={16} /> Create Review</Button>
              <ErrorLine value={reviews.error || createReview.error} />
              <DataTable headers={["Destination", "Rating", "Review"]} rows={(reviews.data ?? []).map((item) => [String(item.destinationId), item.rating, item.review])} />
            </Panel>
          </TabsContent>

          <TabsContent value="search">
            <Panel>
              <SectionTitle icon={<Search size={18} />} title="Global Search" detail="Grouped search across destinations, hotels and activities." />
              <Input value={searchQ} onChange={(event) => setSearchQ(event.target.value)} placeholder="Search Agra, hotel, trek..." />
              <ErrorLine value={search.error} />
              <div className="grid gap-4 md:grid-cols-3">
                <SearchGroup title="Destinations" items={(search.data?.destinations ?? []).map((item) => item.name)} />
                <SearchGroup title="Hotels" items={(search.data?.hotels ?? []).map((item) => item.name)} />
                <SearchGroup title="Activities" items={(search.data?.activities ?? []).map((item) => item.title)} />
              </div>
            </Panel>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid gap-5 rounded-lg border bg-white p-5 shadow-sm">
      {children}
    </motion.section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-slate-50 p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-1 font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function DataTable({ headers, rows }: { headers: string[]; rows: React.ReactNode[][] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>{headers.map((header) => <TableHead key={header}>{header}</TableHead>)}</TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 ? (
          <TableRow><TableCell colSpan={headers.length} className="py-8 text-center text-slate-400">No records yet</TableCell></TableRow>
        ) : rows.map((row, index) => (
          <TableRow key={index}>{row.map((cell, cellIndex) => <TableCell key={cellIndex}>{cell}</TableCell>)}</TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function DetailCard({ detail }: { detail: DetailResponse }) {
  return (
    <div className="grid gap-4 rounded-lg border bg-slate-50 p-4 md:grid-cols-[220px_1fr]">
      <img src={detail.destination.heroImage} alt={detail.destination.name} className="aspect-[4/3] w-full rounded-md object-cover" />
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-semibold">{detail.destination.name}</h3>
          <Badge variant="outline">{detail.destination.state}</Badge>
          <Badge variant="secondary">{detail.weather.summary}</Badge>
        </div>
        <p className="mt-2 text-sm text-slate-600">{detail.destination.description}</p>
        <div className="mt-3 flex flex-wrap gap-2 text-sm text-slate-500">
          <span>{detail.nearbyDestinations.length} nearby</span>
          <span>{detail.activities.length} activities</span>
          <span>{detail.hotels.length} hotels</span>
        </div>
      </div>
    </div>
  );
}

function SearchGroup({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-lg border bg-slate-50 p-4">
      <div className="mb-3 flex items-center gap-2 font-semibold"><Shield size={15} /> {title}</div>
      <div className="grid gap-2 text-sm text-slate-600">
        {items.length === 0 ? <span className="text-slate-400">No matches</span> : items.map((item) => <span key={item}>{item}</span>)}
      </div>
    </div>
  );
}
