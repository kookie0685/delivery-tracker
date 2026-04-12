import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, getAllowedRoute, useAuth } from "@/lib/auth";
import Index from "./pages/Index";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import "./App.css";
import { Role } from "@/lib/delivery-tracker";

const queryClient = new QueryClient();

const ProtectedRoute = ({ role }: { role: Role }) => {
  const { authState, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        Loading Delivery Tracker...
      </div>
    );
  }

  if (!authState) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (authState.role !== role) {
    return <Navigate to={getAllowedRoute(authState.role, location.pathname)} replace />;
  }

  const nextPath = getAllowedRoute(authState.role, location.pathname);
  if (nextPath !== location.pathname) {
    return <Navigate to={nextPath} replace />;
  }

  return <Index />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/admin" element={<ProtectedRoute role="admin" />} />
            <Route path="/driver" element={<ProtectedRoute role="driver" />} />
            <Route path="/finance" element={<ProtectedRoute role="finance" />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
