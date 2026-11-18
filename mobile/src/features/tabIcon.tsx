import type { ColorValue } from "react-native";
import { Icon, type IconName } from "@/ui/Icon";

/** Tab bar icon: outline when idle, filled when selected. */
export function tabIcon(name: IconName, focusedName: IconName) {
  return function TabIcon({ color, focused }: { color: ColorValue; focused: boolean }) {
    return <Icon name={focused ? focusedName : name} size={24} color={color as string} />;
  };
}
