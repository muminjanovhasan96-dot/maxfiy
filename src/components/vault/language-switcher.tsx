"use client";
import { Check, Languages } from "lucide-react";
import { LANG_NAMES, LANGS, useLang, useLangStore } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({ align = "end" }: { align?: "start" | "end" | "center" }) {
  const lang = useLang();
  const setLang = useLangStore((s) => s.setLang);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Language">
          <Languages className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align}>
        {LANGS.map((l) => (
          <DropdownMenuItem
            key={l}
            onClick={() => setLang(l)}
            className={cn(lang === l && "text-primary")}
          >
            <Check className={cn("h-4 w-4", lang === l ? "opacity-100" : "opacity-0")} />
            {LANG_NAMES[l]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
