"use client";

import { LockKeyhole, Sparkles } from "@/components/icons";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AiBadge, useAiAccount } from "./ai-availability";
import { aiToolHref, aiTools } from "./ai-tools";

/**
 * The top-bar home for AI: every AI action with the place it runs, so a person
 * can find the features without hunting through the pages that offer them. The
 * list itself is the same registry the command menu reads.
 */
export function AiToolsMenu() {
  const { hasAccount, signIn } = useAiAccount();
  const pathname = useLocation({ select: (location) => location.pathname });
  const navigate = useNavigate();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          title="AI tools"
          aria-label="AI tools"
          className="text-text-1 data-[state=open]:bg-selected"
        >
          <Sparkles aria-hidden="true" className="size-[18px]" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="flex items-center justify-between gap-3">
          <span>AI tools</span>
          <AiBadge />
        </DropdownMenuLabel>
        {aiTools.map((tool) => (
          <DropdownMenuItem
            key={tool.id}
            className="items-start"
            onSelect={() => void navigate({ href: aiToolHref(tool, pathname) })}
          >
            <span className="grid min-w-0 gap-0.5">
              <span className="truncate">{tool.label}</span>
              <span className="text-muted-foreground type-label-sm">
                {tool.home}
              </span>
            </span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        {hasAccount ? (
          <DropdownMenuItem
            onSelect={() =>
              void navigate({ to: "/settings", search: { section: "ai" } })
            }
          >
            <LockKeyhole aria-hidden="true" className="size-4" />
            Manage AI in Settings
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem
            onSelect={() => signIn()}
            className="font-semibold text-text-1"
          >
            Sign in to use AI
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
