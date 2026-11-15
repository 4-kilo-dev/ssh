import { useCallback, useEffect, useRef } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { useAuth } from "@/auth/AuthProvider";
import { sideOf } from "@/utils/roles";

/**
 * Lets a guest start an action (send a booking request, send a message) and
 * finishes it automatically right after they sign in — so signing in never
 * makes them start over.
 *
 * Returns `run()`: runs the action now if signed in, otherwise opens Sign in
 * and runs it once a customer account is signed in.
 */
export function useAfterSignIn(action: () => void) {
  const { account } = useAuth();
  const router = useRouter();
  const pending = useRef(false);
  const actionRef = useRef(action);

  useEffect(() => {
    actionRef.current = action;
  });

  useEffect(() => {
    if (account && pending.current) {
      pending.current = false;
      if (sideOf(account) === "customer") actionRef.current();
    }
  }, [account]);

  // If they came back without signing in, forget the pending action.
  useFocusEffect(
    useCallback(() => {
      if (!account) pending.current = false;
    }, [account])
  );

  return useCallback(() => {
    if (account) {
      actionRef.current();
    } else {
      pending.current = true;
      router.push("/sign-in");
    }
  }, [account, router]);
}
