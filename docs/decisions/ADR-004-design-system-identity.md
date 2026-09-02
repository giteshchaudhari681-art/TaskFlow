# ADR 004: Visual Identity & Design System Token Architecture

## Status

Accepted

## Context

While early inspiration referenced developer tools like Huly, TaskFlow must establish its own unique product identity, information architecture, and design language to prevent it from looking like a generic clone.

## Decision

We defined an original design system founded on:

1. **Palette Foundations**:
   - Backgrounds: Obsidian Deep Space (`#070b14`), Elevated Surface (`#0d1322`), Card Surface (`#121a2d`).
   - Accents: Tech Cyan (`#38bdf8`), Cyber Indigo (`#6366f1`), Electric Violet (`#a855f7`).
   - Health Indicators: Emerald (`#10b981`), Amber (`#f59e0b`), Rose (`#ef4444`).
2. **Typography**: Modern geometric sans-serif (Plus Jakarta Sans / Inter) paired with monospaced accents (JetBrains Mono) for IDs and metrics.
3. **Ergonomics & Elevation**: Restrained borders (`#1e293b`), subtle glassmorphism backdrop blurs, and soft atmospheric glows.

## Rationale

- Creates an immediately distinct, premium engineering aesthetic.
- Avoids generic browser defaults or uninspired copycat styling.
- Ensures accessibility with high-contrast text ratios.

## Consequences

- All subsequent UI components must consume semantic design tokens rather than ad-hoc color classes.
