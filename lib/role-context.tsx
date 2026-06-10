"use client";

import { createContext, useContext } from "react";

import type { Role } from "@/features/team/types";

/**
 * Current-team role context (ARCHITECTURE.md §9.4). Role changes rarely, so
 * context is the right fit here (unlike app data, which uses TanStack Query).
 * The value is resolved once on the server (membership lookup) and passed to
 * the provider in the app layout.
 */
type RoleContextValue = {
  role: Role | null;
  teamId: string | null;
};

const RoleContext = createContext<RoleContextValue>({ role: null, teamId: null });

export function RoleProvider({
  role,
  teamId,
  children,
}: RoleContextValue & { children: React.ReactNode }) {
  return <RoleContext.Provider value={{ role, teamId }}>{children}</RoleContext.Provider>;
}

export function useCurrentRole(): RoleContextValue {
  return useContext(RoleContext);
}
