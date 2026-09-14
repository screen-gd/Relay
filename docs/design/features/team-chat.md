# Team and chat

## Purpose

Manage team access and support focused team conversation.

## Anatomy

Team directory, role/access controls, invite/member actions, conversation list, message stream, composer, unread state, and project context links.

## Behavior

Preserve team member roles, workspace management, chat conversations, unread state, message actions, and permission checks. Keep project links addressable.

## States

Loading members/messages, empty team/chat, no conversation, send pending/sent/failed, offline, read-only, and access denied.

## Responsive rules

Use a two-pane desktop layout and a conversation sheet/list on small screens. Keep composer and current conversation reachable above the keyboard.

## Accessibility

Use labeled navigation and message regions, announce new messages without flooding, label composer actions, and preserve focus after send or conversation switch.

## Preserved features

Team, roles, workspace management, chat, and current permission behavior.

## Acceptance checks

Member actions, role gates, conversation switch, send/retry, mobile composer, keyboard, screen-reader, and reduced-motion checks pass.

Related: [states and feedback](../system/states-feedback.md).
