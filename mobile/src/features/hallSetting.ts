import type { HallSetting } from "@/api/types";
import type { IconName } from "@/ui/Icon";

export const HALL_SETTINGS: HallSetting[] = ["indoor", "covered-outdoor", "uncovered-outdoor"];

export const SETTING_ICON: Record<HallSetting, IconName> = {
  indoor: "home-outline",
  "covered-outdoor": "umbrella-outline",
  "uncovered-outdoor": "sunny-outline",
};
