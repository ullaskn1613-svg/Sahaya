# SAHAYA (ಸಹಾಯ) — Bengaluru Smart Transit & Journey Planner

**Built by Team HexaForce for HACKNOVA-26 (ANVESHANA-26)**  
**Hackathon Track:** Smart Infrastructure  
**Target Location:** Bengaluru, Karnataka, India  
**Team Members:** Ullas, Prajwal, Yeshwanth (Team HexaForce)  
**Homepage Heading:** *"Bengaluru journeys, made simpler."*

---

## 1. Project Overview & Features

**SAHAYA** (ಸಹಾಯ — Kannada for *Assistance/Help*) is a responsive, accessible transit intelligence platform tailored to Bengaluru's urban mobility challenges. Designed for students, daily commuters, office workers along IT corridors, and visitors, SAHAYA transforms complex BMTC bus stages into clear, actionable itineraries while encouraging sustainable mass transit over single-occupant road vehicles.

### Core Upgraded Features:
- **Typo-Tolerant Destination Search & Locality Intelligence:**
  - Case-insensitive, whitespace-normalized, prefix and fuzzy Levenshtein distance matching.
  - Handles real Bengaluru localities, neighborhoods, and common spelling variations:
    - `Amruthalli` / `Amrutahalli` ➔ suggests **Amruthahalli** and its verified stops
    - `Hebbal`, `Majestic`, `Yeshwanthpur`, `KR Market`, `Electronic City`, `Manyata Tech Park`
  - Distinguishes between `[BMTC Bus Stop]`, `[Locality / Area]`, and `[Imported GTFS Stop]`.
- **Locality to Nearby BMTC Stops Resolver:**
  - When a user chooses a locality rather than an exact bus stop (e.g. *Amruthahalli*), SAHAYA automatically computes distances to all nearby verified BMTC stops:
    1. **Amruthahalli Bus Stop** (Amruthahalli Main Road · 120m away)
    2. **Amruthahalli Cross (Bellary Road)** (NH 44 · 650m away)
    3. **Dasarahalli (Hebbal)** (1.2 km away)
    4. **Kempapura (Hebbal)** (1.8 km away)
  - Displays matching stops on both the interactive map and a clear selection list, allowing commuters to select their preferred boarding or drop-off stop.
- **Strict BMTC-Only Results:**
  - Restricts journey results to supported BMTC buses.
  - Displays public route code (e.g. `280`, `280-A`, `280-E`, `284`, `500-D`, `KIA-9`), destination direction, boarding stop, drop-off stop, ordered intermediate stop sequences with stage numbers, transfer instructions, and walking access.
  - Discloses calculation method: *"Transit duration calculated via BMTC urban corridor speed (18-22 km/h) + 45s stage dwell time + pedestrian access."*
  - Replaces invented ride-hail pricing with **Official BMTC Fare & Pass Rules**:
    - Ordinary Bus Single Journey: ₹6 – ₹35
    - Karnataka Shakti Scheme: 100% Free transit for female residents of Karnataka
    - BMTC Daily Commuter Pass: ₹70 / day (Ordinary) · ₹140 / day (Vajra Volvo AC)
    - Vayu Vajra Airport AC: ₹160 – ₹260
- **GTFS Specification Compliant Architecture & Live Importer:**
  - Connects `routes.txt`, `stops.txt`, `trips.txt`, `stop_times.txt`, and optional shapes.
  - Full client-side GTFS ZIP archive extractor (via JSZip) and CSV parser on the **Data & Sources** page.
  - Allows uploading real official BMTC GTFS packages (e.g. from Open City Bengaluru) while shipping with a robust built-in Bengaluru benchmark dataset.
- **Google Maps-Style Navigation Screen (`PlanJourneyPage`):**
  - Interactive **Leaflet** map powered by **OpenStreetMap** tiles with zoom controls, custom markers, and pan gestures.
  - Floating search card supporting **"My Current Location"** as starting point using real GPS coordinates.
  - Dual Navigation Modes:
    - **🚌 BMTC Transit:** Direct and 1-transfer GTFS journeys with polyline corridor lines.
    - **🚶 Walking Navigation:** Integrates with the public **OSRM pedestrian router** (`project-osrm.org`) for real walking polyline geometry, duration, and turn-by-turn maneuver steps.
  - Floating **"My Location"** FAB that smoothly centers the map (`map.flyTo`) onto the user's live position.
- **Live User Location & Heading Tracking:**
  - Uses browser Geolocation API (`watchPosition`) with `enableHighAccuracy: true`.
  - Blue pulsing location dot with heading direction indicator.
  - Displays GPS accuracy in meters (`±14m`) and includes an explicit **"Stop Tracking"** button.

---

## 2. Technology Stack

- **Framework:** React 19 (TypeScript) on Vite
- **Mapping & Tiles:** Leaflet with OpenStreetMap tiles
- **Routing Engine:** Public Open Source Routing Machine (OSRM) pedestrian routing API
- **GTFS Processing:** JSZip + custom streaming CSV parser with inverted graph indexing
- **Geocoding:** Bengaluru Locality Knowledge Base + OpenStreetMap Nominatim API
- **Styling:** Tailwind CSS v4 (`@import "tailwindcss";`) with mobile-first responsive architecture
- **Typography:** Plus Jakarta Sans and JetBrains Mono
- **Icons:** Lucide React
- **Geographic Calculations:** Mathematical Haversine Distance algorithm running locally
- **State & Storage:** Client-side React state + browser `localStorage` for imported feed persistence

---

## 3. Verified Corridors & Test Scenarios

| Test Case | Origin | Destination | Supported Routes | Type |
|---|---|---|---|---|
| 1 | Amruthahalli | Majestic | Route 280-E (Direct) | Direct BMTC Bus |
| 2 | Hebbal | Majestic | Routes 280, 280-A, KIA-9 | Direct BMTC Bus |
| 3 | Amruthahalli | Central Silk Board | Route 280-E ➔ 500-D (via Hebbal) | 1-Transfer Journey |
| 4 | Amruthahalli | KR Market | Route 284 | Direct BMTC Bus |
| 5 | Hebbal | Central Silk Board | Route 500-D (Outer Ring Road) | Direct BMTC Bus |
| 6 | Yelahanka | Banashankari | Route 500-A (via Amruthahalli Cross & Yeshwanthpur) | Direct BMTC Bus |

---

## 4. Hackathon Attribution

- **Event:** HACKNOVA-26 (ANVESHANA-26)
- **Track:** Smart Infrastructure
- **Team Name:** HexaForce
- **Team Members:** Ullas, Prajwal, Yeshwanth
- **Dataset Disclosure:** `"DEMO DATA — NOT VERIFIED BMTC INFORMATION"` badge clearly declared on built-in prototype, with live GTFS feed import capabilities for official feeds.
