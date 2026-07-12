"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function VaultIndex() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/vault/photos");
  }, [router]);
  return null;
}
