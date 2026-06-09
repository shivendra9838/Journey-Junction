import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import DestinationPage from "@/pages/DestinationPage";
import HomePage from "@/pages/HomePage";
import PlanMyTripPage from "@/pages/PlanMyTripPage";
import WishlistPage from "@/pages/WishlistPage";
import ProfilePage from "@/pages/ProfilePage";
import AdminPage from "@/pages/AdminPage";
import DashboardPage from "@/pages/DashboardPage";
import DestinationsPage from "@/pages/DestinationsPage";
import PackagesPage from "@/pages/PackagesPage";
import ComparePage from "@/pages/ComparePage";
import BlogsPage from "@/pages/BlogsPage";
import Phase1PlatformPage from "@/pages/Phase1PlatformPage";
import PaymentSuccessPage from "@/pages/PaymentSuccessPage";
import PaymentCancelPage from "@/pages/PaymentCancelPage";
import OurTeamPage from "@/pages/OurTeamPage";
import { WishlistProvider } from "@/context/WishlistContext";
import { UserProvider, useUser } from "@/context/UserContext";
import SignInModal from "@/components/SignInModal";
import { SupportWidget } from "@/components/SupportWidget";
import { useEffect, useState } from "react";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/plan-trip" component={PlanMyTripPage} />
      <Route path="/wishlist" component={WishlistPage} />
      <Route path="/dashboard" component={DashboardPage} />
      <Route path="/profile" component={ProfilePage} />
      <Route path="/admin" component={AdminPage} />
      <Route path="/packages" component={PackagesPage} />
      <Route path="/compare" component={ComparePage} />
      <Route path="/blogs" component={BlogsPage} />
      <Route path="/phase1" component={Phase1PlatformPage} />
      <Route path="/payment/success" component={PaymentSuccessPage} />
      <Route path="/payment/cancel" component={PaymentCancelPage} />
      <Route path="/team" component={OurTeamPage} />
      <Route path="/destinations">
        {() => <DestinationsPage />}
      </Route>
      <Route path="/destinations/:stateSlug/:destinationSlug">
        {(params) => <DestinationPage destinationId={params?.destinationSlug ?? ""} />}
      </Route>
      <Route path="/destinations/:stateSlug">
        {(params) => <DestinationsPage stateSlug={params?.stateSlug} />}
      </Route>
      <Route path="/destination/:id">
        {(params) => <DestinationPage destinationId={params?.id ?? "goa"} />}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <UserProvider>
          <WishlistProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
              <TimedSignInPrompt />
              <SupportWidget />
            </WouterRouter>
            <Toaster />
          </WishlistProvider>
        </UserProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

function TimedSignInPrompt() {
  const { user, loading } = useUser();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (loading || user) return;
    const path = window.location.pathname;
    if (path === "/admin" || path === "/profile") return;

    const dismissedAt = Number(sessionStorage.getItem("wandr_signin_prompt_dismissed_at") ?? 0);
    if (Date.now() - dismissedAt < 10 * 60 * 1000) return;

    const timer = window.setTimeout(() => setOpen(true), 3500);
    return () => window.clearTimeout(timer);
  }, [loading, user]);

  function handleClose() {
    sessionStorage.setItem("wandr_signin_prompt_dismissed_at", String(Date.now()));
    setOpen(false);
  }

  if (!open || user) return null;
  return <SignInModal onClose={handleClose} />;
}
