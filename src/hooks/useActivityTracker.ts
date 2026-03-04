import { useEffect, useRef } from "react";
import { useAuthStore } from "@/store/authStore";
export function useActivityTracker(idleTimeoutMinutes = 2) {
  const { addStudyMinutes } = useAuthStore();
  const lastActiveAt = useRef<number>(Date.now());
  const secondsElapsed = useRef<number>(0);
  useEffect(() => {
    const handleActivity = () => {
      lastActiveAt.current = Date.now();
    };
    window.addEventListener("mousemove", handleActivity);
    window.addEventListener("keydown", handleActivity);
    window.addEventListener("click", handleActivity);
    window.addEventListener("scroll", handleActivity);
    const checkInterval = setInterval(() => {
      const now = Date.now();
      const idleTimeMs = now - lastActiveAt.current;
      const idleThresholdMs = idleTimeoutMinutes * 60 * 1000;
      if (idleTimeMs < idleThresholdMs) {
        secondsElapsed.current += 1;
        if (secondsElapsed.current >= 60) {
          addStudyMinutes(1);
          secondsElapsed.current = 0;
        }
      }
    }, 1000);
    return () => {
      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("click", handleActivity);
      window.removeEventListener("scroll", handleActivity);
      clearInterval(checkInterval);
    };
  }, [idleTimeoutMinutes, addStudyMinutes]);
}
