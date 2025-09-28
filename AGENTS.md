# Repository Guidelines

## Project Structure & Module Organization
The studio is a Vite + React 19 app. High-level UI logic lives in `App.tsx`, which orchestrates QR configuration state via hooks in `hooks/useLocalStorage.ts`. Reusable UI pieces sit in `components/` (`QRCodePreview.tsx`, `Library.tsx`, `icons.tsx`) and share data contracts defined in `types.ts`. Styling and QR presets live in `constants.ts`, while `metadata.json` holds gallery descriptors consumed by the library. Entry points `index.tsx` and `index.html` boot the React tree; adjust build behavior in `vite.config.ts`.

## Build, Test, and Development Commands
Run `npm install` before your first contribution. Use `npm run dev` for a hot-reloading dev server at `http://localhost:5173`. Ship-ready bundles come from `npm run build`, and you can validate them locally with `npm run preview`. Keep bundle tests fast by clearing the `node_modules/.vite` cache when config changes.

## Coding Style & Naming Conventions
This codebase favors TypeScript-first, function components, and two-space indentation. Prefer single quotes, trailing commas for multiline literals, and early returns for readability. Match file casing to component type: `PascalCase.tsx` for React components, `camelCase.ts` for hooks/utilities, and co-locate icons or constants with their consumers. Leverage the shared types and enums in `types.ts` and `constants.ts` instead of redefining structures.

## Testing Guidelines
Automated tests are not yet wired in; document manual QA steps in your pull request (browsers tested, QR variants exercised, download paths). If you introduce automated coverage, use Vitest + Testing Library to align with Vite, store specs alongside the feature (`components/Library.test.tsx`), and ensure new workflows run via `npm test` before shipping.

## Commit & Pull Request Guidelines
Follow the conventional commits style observed in history (`feat:`, `fix:`, `chore:`) and keep messages under 72 characters. Each PR should include: a concise summary, relevant issue links, screenshots or GIFs for UI changes, and a checklist of manual tests. Request review once lint/build commands pass and flag any breaking changes in the description.

## Analytics & Integrations
`App.tsx` now exposes a Scan Readiness card and ROI dashboard fed by mock analytics data. Swap in live sources by streaming scan events into your backend and recomputing the memoized `analyticsInsights`. To push metrics to GA4, call the Measurement Protocol with each scan (include `client_id`, `utm_*`, and revenue fields) and reuse the UTM builder’s state for attribution. Marketing platform hooks should land in a dedicated integration utility—avoid embedding API calls directly in React components.
