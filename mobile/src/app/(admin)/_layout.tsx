import { Redirect, Slot } from "expo-router";
import { useAuth } from "@/auth/AuthProvider";
import { HOME, sideOf } from "@/utils/roles";

export default function AdminArea() {
  const { account } = useAuth();
  const side = sideOf(account);
  if (side !== "admin") return <Redirect href={HOME[side]} />;
  return <Slot />;
}
