import type { ComponentProps } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";

export type IconName = ComponentProps<typeof Ionicons>["name"];

export function Icon(props: ComponentProps<typeof Ionicons>) {
  return <Ionicons size={20} {...props} />;
}
