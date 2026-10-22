import { Suspense, lazy, useEffect } from "react";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";

import { CookieConsent } from "./components/CookieConsent";
import { InstallPrompt } from "./components/InstallPrompt";
import { OfflineBanner } from "./components/OfflineBanner";
import { PageLoader } from "./components/PageLoader";
import { RequireAuth } from "./components/RequireAuth";
import { AppDataProvider } from "./context/AppDataProvider";
import { AuthProvider } from "./context/AuthProvider";
import { ThemeProvider } from "./context/ThemeProvider";
import { ToastProvider } from "./context/ToastProvider";
import { Auth } from "./pages/Auth";
import { Help } from "./pages/Help";
import { Landing } from "./pages/Landing";
import { NotFound } from "./pages/NotFound";
import { Workspace } from "./pages/Workspace";

// Pages secondaires chargées à la demande : le premier affichage reste léger.
const Carnet = lazy(() => import("./pages/Carnet").then((m) => ({ default: m.Carnet })));
const Documentation = lazy(() =>
  import("./pages/Documentation").then((m) => ({ default: m.Documentation })),
);
const Legal = lazy(() => import("./pages/Legal").then((m) => ({ default: m.Legal })));
const MotDePasseOublie = lazy(() =>
  import("./pages/MotDePasse").then((m) => ({ default: m.MotDePasseOublie })),
);
const Reinitialiser = lazy(() => import("./pages/MotDePasse").then((m) => ({ default: m.Reinitialiser })));
const Revisions = lazy(() => import("./pages/Revisions").then((m) => ({ default: m.Revisions })));
const Settings = lazy(() => import("./pages/Settings").then((m) => ({ default: m.Settings })));

function RetourEnHaut() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);
  return null;
}

export function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <AppDataProvider>
            <BrowserRouter>
              <RetourEnHaut />
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<Landing />} />
                  <Route path="/connexion" element={<Auth />} />
                  <Route
                    path="/atelier"
                    element={
                      <RequireAuth>
                        <Workspace />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/carnet"
                    element={
                      <RequireAuth>
                        <Carnet />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/reglages"
                    element={
                      <RequireAuth>
                        <Settings />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/revisions"
                    element={
                      <RequireAuth>
                        <Revisions />
                      </RequireAuth>
                    }
                  />
                  <Route path="/documentation" element={<Documentation />} />
                  <Route path="/aide" element={<Help />} />
                  <Route path="/confidentialite" element={<Legal page="confidentialite" />} />
                  <Route path="/conditions" element={<Legal page="conditions" />} />
                  <Route path="/a-propos" element={<Legal page="a-propos" />} />
                  <Route path="/mot-de-passe-oublie" element={<MotDePasseOublie />} />
                  <Route path="/reinitialiser" element={<Reinitialiser />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
              <CookieConsent />
              <InstallPrompt />
              <OfflineBanner />
            </BrowserRouter>
          </AppDataProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
