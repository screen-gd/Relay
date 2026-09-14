# Profiles and portals

## Purpose

Separate internal workspace data from public profiles and client review/delivery access.

## Anatomy

Public profile summary/edit, organization profile, public project stats, access scope, client portal landing/token view, review/delivery content, and share controls.

## Behavior

Preserve `/profile`, `/profile/edit`, `/organization`, `/u/[slug]`, `/client-portal`, token routes, profile saves, token instructions, review, and delivery access. Show scope near sharing.

## States

Loading profile/portal, missing slug/token, expired/invalid token, empty portfolio, saving, permission denied, and read-only public view.

## Responsive rules

Use single-column profile and portal layouts on narrow screens. Keep review/comment and delivery actions reachable without relying on hover.

## Accessibility

Use clear landmarks and headings outside the internal shell, meaningful image text, labeled share/access controls, focus-managed forms, and non-color status cues.

## Preserved features

Public profiles, profile edit, organization summary, client portal, token access, review, and delivery.

## Acceptance checks

Public/internal separation, token states, profile save, portal review/delivery, 320px layout, keyboard, contrast, and screen-reader checks pass.
