# Upload Explore Tab Redirect – Investigation & Architecture

## What Was Added

### 1. LocationSelector (`src/components/LocationSelector.tsx`)

- **When dispatching `locationChanged`:**
  - `detectLocation` (geo): `console.log('[LocationSelector] detectLocation: dispatching locationChanged', location.code)`
  - `detectLocation` (geo, no match): `console.log('[LocationSelector] detectLocation: no LOCATIONS match for', countryCode, '- not dispatching')`
  - `detectLocation` (catch): `console.log('[LocationSelector] detectLocation (catch): dispatching locationChanged NG')`
  - `handleLocationSelect` (manual): `console.log('[LocationSelector] handleLocationSelect: dispatching locationChanged', location.code)`
- **When geo returns:** `console.log('[LocationSelector] detectLocation: ipapi returned', countryCode)`

### 2. Upload (`src/pages/Upload.tsx`)

- **Initial country:** `useState(() => { const c = getSelectedCountry(); console.log('[Upload] initial state getSelectedCountry() =>', c); return c; })`
- **On `locationChanged`:** `console.log('[Upload] locationChanged received, getSelectedCountry() =>', c)`
- **Tab-from-URL effect:** logs `mode`, `country`, `countryState`, `isNigeria`, `redirectCondition`, `activeTab`; when redirect runs: `console.log('[Upload] REDIRECT: setting tab to inspiration and URL to mode=inspiration')`
- **Defensive redirect:** new `useEffect` that runs when `activeTab === 'explore' && !isNigeria` and forces tab to `inspiration` + URL to `mode=inspiration`; logs `[Upload] DEFENSIVE REDIRECT: activeTab=explore but isNigeria=false, forcing inspiration`

---

## Why the Redirect Might Not Have Been Happening

### A. Timing: Upload mounts before geo-detection completes

1. User opens `/upload?mode=explore` (direct URL or link).
2. No `homable_selected_country` in localStorage (first visit or cleared).
3. **Upload mounts:** `getSelectedCountry()` returns `'NG'` (default). So `countryState = 'NG'`, `isNigeria = true`.
4. **Tab-from-URL effect runs:** `mode === 'explore'`, `isNigeria === true` → redirect condition is false → we run “Map mode parameter to tab” and **set `activeTab = 'explore'`**. So Nigerian Explore UI is shown.
5. **LocationSelector’s `useEffect` runs:** no `savedCountry` → calls `detectLocation()` (async).
6. Later **ipapi** returns e.g. `CA`. We set localStorage and **dispatch `locationChanged`** (we added that).
7. Upload’s listener runs → `setCountryState('CA')` → re-render → `isNigeria = false`.
8. **Tab-from-URL effect runs again** (depends on `isNigeria`). Now `!isNigeria && (mode === 'explore')` is true → we **should** redirect.

If the redirect still didn’t happen, possible causes:

- **`locationChanged` never fired** (e.g. geo failed, or country code not in `LOCATIONS` so we don’t dispatch).
- **Tab effect didn’t re-run** (dependency or batching quirk).
- **Something else sets `activeTab` back to `'explore'`** after we set it to `'inspiration'`.

The **defensive effect** fixes the case where we’re already on Explore and then `country`/`isNigeria` updates: as soon as `activeTab === 'explore'` and `!isNigeria`, we force tab + URL to inspiration.

### B. When localStorage already has Canada

- User selects Canada in the header (or it was saved from a previous session).
- Then they go to `/upload?mode=explore` (e.g. “Explore styles” on Home).
- **Upload mounts:** `getSelectedCountry()` reads `'CA'` from localStorage → `countryState = 'CA'`, `isNigeria = false`.
- **Tab-from-URL effect runs:** `mode === 'explore'`, `!isNigeria` → redirect condition true → we set `activeTab = 'inspiration'` and replace URL. So redirect **should** happen on first run.

If it doesn’t, then either:

- **Upload is not getting `'CA'`** on first read (e.g. different storage, or strict mode / double mount with a stale read), or
- **Effect runs in an order** where `isNigeria` is still true (e.g. closure over initial state).

Logs will show:

- `[Upload] initial state getSelectedCountry() =>` → what Upload thinks the country is on first render.
- `[Upload] effect (tab from URL): ... isNigeria= ... redirectCondition=` → whether we ever see the redirect condition true.
- `[Upload] REDIRECT: ...` or `[Upload] DEFENSIVE REDIRECT: ...` → whether either redirect path runs.

---

## Architecture: Nigeria vs International

### Nigeria (country === 'NG')

- **Home:** Hero “Explore Curated Rooms” (scroll to section) + “Upload Your Inspiration”. Section “Explore Curated Rooms” with filters and scene cards from `getExploreScenes('NG')`.
- **Upload:** Tabs: “Explore styles” (curated rooms from DB, Naira filters) + “Start with inspiration”. No “Start with what fits”.  
  `/upload?mode=explore` → Explore tab (curated rooms).  
  Explore tab content: “Explore Curated Rooms”, category/price (₦) filters, grid of scenes.

### International (e.g. Canada)

- **Home:** Hero “Upload Your Inspiration” (primary) and “Explore Styles & Ideas” (secondary → `/upload?mode=explore`). Section “Explore Styles & Ideas” (steps + “Explore styles” button → `/upload?mode=explore`, “Or find one specific item” → `/upload?mode=find`). So international “explore” entry points still point at **`/upload?mode=explore`**; the intended behavior is to **redirect** that to the analyze flow.
- **Upload (intended):** Tabs: “Explore styles”, “Start with inspiration”, “Start with what fits”.  
  For international users, **Explore tab should not show Nigerian curated rooms.** So when `mode=explore` and country !== NG we **redirect to `mode=inspiration`** and show “Start with inspiration” (upload + sample images → analyze). The “international explore” experience is that analyze flow, not a separate Explore UI.

### Where the international “explore” experience lives

- **On Home:** The “Explore Styles & Ideas” block (steps, “Explore styles” button) is the international CTA; the button goes to `/upload?mode=explore`, and we rely on Upload to redirect to inspiration.
- **On Upload:** The **inspiration tab** is the international “explore” experience (upload or pick a sample → analyze). There is no separate international Explore tab content; redirect ensures they land there when they hit `mode=explore`.

---

## How to Use the Logs

1. **Reproduce:** Set location to Canada (or clear localStorage and let geo set Canada). Go to `/upload?mode=explore`.
2. **In console, check:**
   - `[Upload] initial state getSelectedCountry() =>`  
     - If `NG`: first paint thought Nigeria; redirect depends on later `locationChanged` or defensive effect.
     - If `CA`: first paint had Canada; tab-from-URL effect should redirect immediately.
   - `[Upload] effect (tab from URL): ... mode= explore ... isNigeria= ... redirectCondition=`  
     - If `redirectCondition= true` and you see `[Upload] REDIRECT: ...` → primary redirect ran.
     - If you see `[Upload] DEFENSIVE REDIRECT: ...` → country updated after we’d already set Explore tab; defensive path fixed it.
   - `[LocationSelector] detectLocation: ipapi returned` and `dispatching locationChanged`  
     - Confirms geo ran and that we’re notifying other components.
   - `[Upload] locationChanged received, getSelectedCountry() =>`  
     - Confirms Upload received the event and what it reads after.
3. **If redirect never runs:**  
   - `redirectCondition` never true → `isNigeria` is always true in that effect (check `country`/`countryState` in the same log).  
   - No `locationChanged` from LocationSelector → geo didn’t run, failed, or didn’t match `LOCATIONS`; or user never changed location manually so no dispatch from `handleLocationSelect`.

---

## Code Snippets (Current Behavior)

### Redirect condition (Upload)

```ts
// International: redirect explore → inspiration
if (!isNigeria && (mode === 'explore' || mode === 'design')) {
  setActiveTab('inspiration');
  const newParams = new URLSearchParams(searchParams);
  newParams.set('mode', 'inspiration');
  window.history.replaceState({}, '', `${window.location.pathname}?${newParams}`);
  return;
}
```

### Defensive redirect (Upload)

```ts
useEffect(() => {
  if (activeTab === 'explore' && !isNigeria) {
    setActiveTab('inspiration');
    const newParams = new URLSearchParams(searchParams);
    newParams.set('mode', 'inspiration');
    window.history.replaceState({}, '', `${window.location.pathname}?${newParams}`);
  }
}, [activeTab, isNigeria, searchParams]);
```

### LocationSelector: when we dispatch

- **Manual:** `handleLocationSelect` → always dispatches.
- **Geo:** `detectLocation` → dispatches only when we find a matching `LOCATIONS` entry or in the catch (default NG). If ipapi returns a code not in `LOCATIONS` (e.g. DE), we do **not** dispatch, so Upload never gets an update from geo for that country.
