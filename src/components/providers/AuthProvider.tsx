"use client";
import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useAuthStore } from "@/store/authStore";
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setLoading } = useAuthStore();
  useEffect(() => {
    useAuthStore.persist.rehydrate();
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const baseUser = {
          uid: firebaseUser.uid,
          email: firebaseUser.email!,
          displayName: firebaseUser.displayName || "Student",
          photoURL: firebaseUser.photoURL || undefined,
          gradeLevel: "undergrad" as const,
          studyGoals: [],
          createdAt: new Date(),
        };
        setUser(baseUser);
        setLoading(false);
        try {
          const profileRef = doc(db, "users", firebaseUser.uid);
          const profileDoc = await getDoc(profileRef);
          if (profileDoc.exists()) {
            const data = profileDoc.data();
            setUser({
              ...baseUser,
              displayName:
                firebaseUser.displayName || data.displayName || "Student",
              gradeLevel: data.gradeLevel || "undergrad",
              major: data.major,
              studyGoals: data.studyGoals || [],
              createdAt: data.createdAt?.toDate() || new Date(),
            });
          } else {
            await setDoc(profileRef, {
              displayName: baseUser.displayName,
              email: baseUser.email,
              gradeLevel: "undergrad",
              studyGoals: [],
              createdAt: serverTimestamp(),
            });
          }
        } catch {
          console.warn(
            "Firestore unavailable — running with auth-only profile. Create a Firestore database in Firebase Console to enable persistence.",
          );
        }
      } else {
        setUser(null);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [setUser, setLoading]);
  return <>{children}</>;
}
