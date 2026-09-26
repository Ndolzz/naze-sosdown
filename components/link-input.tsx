"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { IconLink } from "@/components/icons/IconLink";

interface LinkInputProps {
  onSubmit: (url: string) => void;
  loading?: boolean;
}

export function LinkInput({ onSubmit, loading }: LinkInputProps) {
  const [value, setValue] = useState("");

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = value.trim();
    if (trimmed.length === 0) return;
    onSubmit(trimmed);
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", gap: "12px" }}>
      <div style={{ flex: 1 }}>
        <Input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Tempel tautan TikTok atau Instagram di sini"
          inputMode="url"
        />
      </div>
      <Button type="submit" icon={<IconLink />} disabled={loading}>
        {loading ? "Memproses" : "Proses tautan"}
      </Button>
    </form>
  );
}
