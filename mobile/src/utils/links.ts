import { Alert, Linking } from "react-native";
import { normalizeEthiopianPhone } from "./phone";

async function open(url: string, fallbackMessage: string) {
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert(fallbackMessage);
  }
}

export function callPhone(phone: string, errorMessage: string) {
  const number = normalizeEthiopianPhone(phone) ?? phone;
  return open(`tel:${number}`, errorMessage);
}

/** Opens a Telegram chat by phone number (works when the person allows it). */
export function openTelegram(phone: string, errorMessage: string) {
  const number = normalizeEthiopianPhone(phone) ?? phone;
  return open(`https://t.me/${number.replace(/^\+?/, "+")}`, errorMessage);
}

export function openWebsite(url: string, errorMessage: string) {
  return open(url, errorMessage);
}
