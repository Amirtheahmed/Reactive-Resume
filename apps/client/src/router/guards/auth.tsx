import { createSearchParams, Navigate, Outlet, useLocation } from "react-router";

import { useUser } from "@/client/services/user";

export const AuthGuard = () => {
  const location = useLocation();
  const { user, loading } = useUser();

  if (loading) return null;

  if (user) {
    return <Outlet />;
  }

  const searchParams = createSearchParams({
    redirect: location.pathname + location.search,
  });

  return <Navigate replace to={`/auth/login?${searchParams.toString()}`} />;
};
