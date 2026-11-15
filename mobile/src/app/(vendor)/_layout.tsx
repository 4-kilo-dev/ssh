import { Redirect, Slot } from "expo-router";
import { useAuth } from "@/auth/AuthProvider";
import { HOME, sideOf } from "@/utils/roles";

export default function VendorArea() {
  const { account } = useAuth();
  const side = sideOf(account);
  if (side !== "vendor") return <Redirect href={HOME[side]} />;
  return <Slot />;
}
