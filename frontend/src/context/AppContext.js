import { createContext, useContext } from "react";

export const AppContext = createContext(null);

export function useAppContext() {
  return useContext(AppContext);
}

export function useToast() {
  const ctx = useContext(AppContext);
  return ctx?.addToast || (() => {});
}
