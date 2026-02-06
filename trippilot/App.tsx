import React, { useEffect, useState } from "react";
import { HomeView } from "./components/views/HomeView";
import { MapSelectionView } from "./components/views/MapSelectionView";
import { RouteComparisonView } from "./components/views/RouteComparisonView";
import { TimelineView } from "./components/views/TimelineView";
import { SummaryView } from "./components/views/SummaryView";
import { MyTripsView } from "./components/views/MyTripsView";
import { Place } from "./data";
import { decodeSharePayload } from "./utils/shareLink";
import { recordRecentlyViewed } from "./utils/recentlyViewed";
import { restoreTripFromSharePayload } from "./utils/restoreFromShare";
import { useAuth } from "./contexts/AuthContext";
import { useI18n } from "./i18n/react";
import {
  loadCloudTripState,
  saveCloudTripState,
} from "./services/firebase/tripStore";
import { CommunityView } from "./components/views/CommunityView";
import { MobileTabBar } from "./components/MobileTabBar";

export type ViewState =
  | "home"
  | "map"
  | "route"
  | "timeline"
  | "summary"
  | "community";
export type TravelMode = "TRANSIT" | "DRIVING" | "WALKING";

const App: React.FC = () => {
  const { user } = useAuth();
  const { l, locale } = useI18n();
  const [view, setView] = useState<ViewState>("home");
  const [myTrip, setMyTrip] = useState<Place[]>([]);
  const [travelMode, setTravelMode] = useState<TravelMode>("TRANSIT");
  const [routeResult, setRouteResult] = useState<any[]>([]); // Array of results (for multi-leg transit)

  const localTripKey = "trippilot_local_state_v1";
  const legacyLocalTripKey = "tripoptimizer_local_state_v1";

  const isPermissionDenied = (e: any) => {
    const code = String(e?.code || "");
    const msg = String(e?.message || "");
    return (
      code === "permission-denied" ||
      msg.includes("Missing or insufficient permissions")
    );
  };

  useEffect(() => {
    try {
      document.title = l(
        "TripPilot：从想法到路线，一键可执行",
        "TripPilot: from idea to an executable itinerary",
      );
    } catch {
      // Ignore
    }
  }, [locale, l]);

  // Lifted state for Trip Settings
  const [departureTime, setDepartureTime] = useState<string>(() => {
    // Default to current time formatted for input type="datetime-local"
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });

  const handleAddPlace = (place: Place) => {
    recordRecentlyViewed(place);
    // Prevent duplicates
    if (!myTrip.some((p) => p.id === place.id)) {
      setMyTrip((prev) => [...prev, place]);
    }
  };

  const handleRemovePlace = (id: string) => {
    setMyTrip((prev) => prev.filter((p) => p.id !== id));
  };

  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const share = url.searchParams.get("share");
      if (!share) return;

      const payload = decodeSharePayload(share);
      if (!payload) return;

      const restored = restoreTripFromSharePayload(payload);
      setMyTrip(restored.myTrip);
      setTravelMode(restored.travelMode);
      setDepartureTime(restored.departureTime);
      setRouteResult([]);
      setView(restored.myTrip.length > 1 ? "route" : "home");
    } catch {
      // Ignore invalid share URLs.
    }
    // Only run on initial load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const hasShare = Boolean(url.searchParams.get("share"));
      if (hasShare) return;

      const raw =
        localStorage.getItem(localTripKey) ||
        localStorage.getItem(legacyLocalTripKey);
      if (!raw) return;
      const parsed: any = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return;
      if (!Array.isArray(parsed.myTrip)) return;
      if (typeof parsed.travelMode !== "string") return;
      if (typeof parsed.departureTime !== "string") return;

      setMyTrip(parsed.myTrip);
      setTravelMode(parsed.travelMode as TravelMode);
      setDepartureTime(parsed.departureTime);
      setRouteResult([]);

      // One-time migration: copy legacy key to the new key.
      try {
        if (
          !localStorage.getItem(localTripKey) &&
          localStorage.getItem(legacyLocalTripKey)
        ) {
          localStorage.setItem(localTripKey, raw);
          localStorage.removeItem(legacyLocalTripKey);
        }
      } catch {
        // Ignore
      }
    } catch {
      // Ignore invalid local state.
    }
    // Only run on initial load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;

    const hasShareParam = (() => {
      try {
        const url = new URL(window.location.href);
        return Boolean(url.searchParams.get("share"));
      } catch {
        return false;
      }
    })();

    const run = async () => {
      if (!user?.id) return;
      if (user?.isAnonymous) return;
      if (hasShareParam) return;

      try {
        const state = await loadCloudTripState(user.id);
        if (!state || cancelled) return;

        setMyTrip(Array.isArray(state.myTrip) ? state.myTrip : []);
        setTravelMode(state.travelMode as TravelMode);
        setDepartureTime(state.departureTime);
        setRouteResult([]);
      } catch (e) {
        if (!isPermissionDenied(e)) {
          console.warn("Failed to load cloud trip state", e);
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.isAnonymous]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(
          localTripKey,
          JSON.stringify({ version: 1, myTrip, travelMode, departureTime }),
        );
      } catch {
        // Ignore
      }

      const hasShareParam = (() => {
        try {
          const url = new URL(window.location.href);
          return Boolean(url.searchParams.get("share"));
        } catch {
          return false;
        }
      })();

      // Cloud sync is best-effort and requires permissive rules.
      if (!user?.id) return;
      if (user?.isAnonymous) return;
      if (hasShareParam) return;

      void saveCloudTripState(user.id, {
        version: 1,
        myTrip,
        travelMode,
        departureTime,
      }).catch((e) => {
        if (!isPermissionDenied(e)) {
          console.warn("Failed to save cloud trip state", e);
        }
      });
    }, 700);

    return () => window.clearTimeout(timer);
  }, [user?.id, user?.isAnonymous, myTrip, travelMode, departureTime]);

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      {view === "home" && (
        <HomeView
          onNavigate={setView}
          myTrip={myTrip}
          setMyTrip={setMyTrip}
          onAddPlace={handleAddPlace}
          onRemovePlace={handleRemovePlace}
          departureTime={departureTime}
          setDepartureTime={setDepartureTime}
        />
      )}
      {view === "map" && (
        <MapSelectionView
          onNavigate={setView}
          myTrip={myTrip}
          onAddPlace={handleAddPlace}
          onRemovePlace={handleRemovePlace}
        />
      )}
      {view === "route" && (
        <RouteComparisonView
          onNavigate={setView}
          travelMode={travelMode}
          setTravelMode={setTravelMode}
          myTrip={myTrip}
          setMyTrip={setMyTrip}
          setRouteResult={setRouteResult}
          routeResult={routeResult}
          departureTime={departureTime}
          setDepartureTime={setDepartureTime}
        />
      )}
      {view === "timeline" && (
        <TimelineView
          onNavigate={setView}
          myTrip={myTrip}
          travelMode={travelMode}
          routeResult={routeResult}
        />
      )}
      {view === "summary" && (
        <MyTripsView
          onNavigate={setView}
          setMyTrip={setMyTrip}
          setTravelMode={setTravelMode}
          setDepartureTime={setDepartureTime}
          setRouteResult={setRouteResult}
        />
      )}
      {view === "community" && (
        <CommunityView
          onNavigate={setView}
          setMyTrip={setMyTrip}
          setTravelMode={setTravelMode}
          setDepartureTime={setDepartureTime}
          setRouteResult={setRouteResult}
        />
      )}

      <MobileTabBar view={view} onNavigate={setView} />
    </div>
  );
};

export default App;
