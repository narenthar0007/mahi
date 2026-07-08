# GEET App & UI/UX Pro Max — Developer Guide for Junior Web Developers

**Document purpose:** Handoff guide for junior developers — GEET POS app features (inventory, bulk import) and UI/UX design workflow in Cursor.  
**Skill source:** [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)  
**Last updated:** June 2026

---

## Table of Contents

### Part A — UI/UX Pro Max (Design Skill)

1. [What Is This?](#1-what-is-this)
2. [What You Get](#2-what-you-get)
3. [Prerequisites](#3-prerequisites)
4. [Installation](#4-installation)
5. [Where Files Are Stored](#5-where-files-are-stored)
6. [How to Use It (Two Ways)](#6-how-to-use-it-two-ways)
7. [Recommended Workflow](#7-recommended-workflow)
8. [Command Reference](#8-command-reference)
9. [Design System Persistence](#9-design-system-persistence)
10. [Stack-Specific Notes (This Project)](#10-stack-specific-notes-this-project)
11. [Professional UI Rules (Must Read)](#11-professional-ui-rules-must-read)
12. [Pre-Delivery Checklist](#12-pre-delivery-checklist)
13. [Example Prompts for Cursor](#13-example-prompts-for-cursor)
14. [Troubleshooting](#14-troubleshooting)
15. [Quick Reference Card](#15-quick-reference-card)

### Part B — GEET App: Inventory & Bulk Import

16. [Inventory Overview](#16-inventory-overview)
17. [Single Item Creation](#17-single-item-creation)
18. [Bulk Import (All Item Types)](#18-bulk-import-all-item-types)
19. [Bulk Import Examples & Troubleshooting](#19-bulk-import-examples--troubleshooting)

---

## 1. What Is This?

**UI/UX Pro Max** is an AI skill (not a npm library) that gives design intelligence when building user interfaces. It does **not** replace your design judgment — it gives you:

- Industry-specific design recommendations (161 product categories)
- Style, color, and typography suggestions (67 styles, 161 palettes, 57 font pairings)
- UX best practices and anti-patterns to avoid
- Stack-specific implementation guidance (React, React Native, Tailwind, etc.)

Think of it as a **design consultant built into your AI assistant**.

---

## 2. What You Get

| Category | Count | Examples |
|----------|-------|----------|
| UI styles | 67 | Glassmorphism, Minimalism, Soft UI, Dark Mode, Bento Grid |
| Color palettes | 161 | SaaS, fintech, healthcare, e-commerce, POS/retail |
| Font pairings | 57 | Google Fonts combinations with mood labels |
| UX guidelines | 99 | Accessibility, animation, z-index, loading states |
| Chart types | 25 | Dashboard and analytics recommendations |
| Tech stacks | 16 | React, React Native, Next.js, Flutter, Tailwind, shadcn/ui |
| Reasoning rules | 161 | Auto-generated design systems per industry |

---

## 3. Prerequisites

Install these **before** using the skill:

| Tool | Why | How to check |
|------|-----|--------------|
| **Node.js** (LTS) | Runs the `uipro-cli` installer | `node --version` |
| **Python 3.x** | Runs search/design-system scripts | `python --version` |
| **Cursor** (or compatible AI editor) | Loads the skill automatically | — |

### Install Python (if missing)

**Windows:**
```powershell
winget install Python.Python.3.12
```

**macOS:**
```bash
brew install python3
```

**Ubuntu/Debian:**
```bash
sudo apt update && sudo apt install python3
```

---

## 4. Installation

### Option A — CLI installer (recommended)

Run these commands from the **project root** (the folder that contains `package.json`):

```bash
# Step 1: Install the CLI globally (one time only)
npm install -g uipro-cli

# Step 2: Install the skill for Cursor in this project
uipro init --ai cursor
```

You should see:
```
success UI/UX Pro Max installed successfully!
```

### Option B — Install for all projects (global)

Run from your user home folder, then move the skill to the correct path:

```powershell
# Windows PowerShell
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.cursor\skills"
Set-Location "$env:USERPROFILE\.cursor\skills"
uipro init --ai cursor
```

If files land in a nested `.cursor\skills\.cursor\skills\` folder, move them up:

```powershell
Move-Item "$env:USERPROFILE\.cursor\skills\.cursor\skills\ui-ux-pro-max" "$env:USERPROFILE\.cursor\skills\ui-ux-pro-max"
Remove-Item "$env:USERPROFILE\.cursor\skills\.cursor" -Recurse -Force
```

### After installation

1. **Restart Cursor** (or start a new chat).
2. Confirm the folder exists: `.cursor/skills/ui-ux-pro-max/`
3. Try a test prompt: *"Build a landing page for a SaaS product"*

### Update to latest version

```bash
npm install -g uipro-cli@latest
uipro update
```

---

## 5. Where Files Are Stored

After installation, your project will have:

```
your-project/
└── .cursor/
    └── skills/
        └── ui-ux-pro-max/
            ├── SKILL.md              ← Main instructions (AI reads this)
            ├── scripts/
            │   ├── search.py         ← Search & design-system generator
            │   ├── design_system.py
            │   └── core.py
            └── data/                 ← CSV databases (styles, colors, UX rules)
                ├── styles.csv
                ├── colors.csv
                ├── typography.csv
                ├── ux-guidelines.csv
                ├── products.csv
                └── stacks/
                    ├── react-native.csv
                    ├── react.csv
                    └── html-tailwind.csv
```

**Important:** Do not edit CSV files unless you know what you are doing. Use the search scripts to query them.

---

## 6. How to Use It (Two Ways)

### Way 1 — Through Cursor AI (easiest for juniors)

You do **not** need to run commands manually. Just describe what you want in plain English. Cursor loads the skill automatically when your request involves UI/UX work.

**Trigger words:** design, build, create, implement, review, fix, improve, landing page, dashboard, mobile UI, theme, colors, typography, accessibility.

**Example:**
> "Improve the billing screen UI for a POS app. Make it clean, professional, and easy to use on mobile."

The AI will follow the skill workflow internally (analyze → design system → stack guidelines → implement).

### Way 2 — Manual CLI (for learning and documentation)

Run Python scripts directly to see raw design recommendations. Useful when you want to **save a design system to files** before coding.

**Windows path example** (from project root):
```powershell
python .cursor/skills/ui-ux-pro-max/scripts/search.py "POS billing retail" --design-system -p "GEET App"
```

**macOS/Linux:**
```bash
python3 .cursor/skills/ui-ux-pro-max/scripts/search.py "POS billing retail" --design-system -p "GEET App"
```

---

## 7. Recommended Workflow

Follow these steps for every UI task:

```
┌─────────────────────────────────────────────────────────────┐
│  STEP 1 — Understand the request                          │
│  Product type, industry, style keywords, target platform    │
└──────────────────────────┬──────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 2 — Generate design system (REQUIRED)               │
│  Run --design-system OR ask Cursor with clear context     │
└──────────────────────────┬──────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 3 — Optional: save design system to project         │
│  Add --persist to create design-system/MASTER.md          │
└──────────────────────────┬──────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 4 — Supplement with domain searches (if needed)     │
│  UX, typography, charts, landing patterns                   │
└──────────────────────────┬──────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 5 — Get stack-specific rules                        │
│  e.g. --stack react-native for this project               │
└──────────────────────────┬──────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 6 — Implement + run pre-delivery checklist            │
└─────────────────────────────────────────────────────────────┘
```

---

## 8. Command Reference

All commands assume you are in the **project root**.

### Generate a full design system (start here)

```bash
python .cursor/skills/ui-ux-pro-max/scripts/search.py "<keywords>" --design-system -p "Project Name"
```

**Examples:**
```bash
python .cursor/skills/ui-ux-pro-max/scripts/search.py "beauty spa wellness" --design-system -p "Serenity Spa"

python .cursor/skills/ui-ux-pro-max/scripts/search.py "fintech SaaS dashboard" --design-system -f markdown

python .cursor/skills/ui-ux-pro-max/scripts/search.py "POS retail billing mobile" --design-system -p "GEET App"
```

| Flag | Purpose |
|------|---------|
| `--design-system` | Full recommendation (pattern, colors, typography, anti-patterns) |
| `-p "Name"` | Project name shown in output |
| `-f markdown` | Output as Markdown (good for docs) |
| `--persist` | Save to `design-system/MASTER.md` |
| `--page "checkout"` | Page-specific override file |

### Search a specific domain

```bash
python .cursor/skills/ui-ux-pro-max/scripts/search.py "<keyword>" --domain <domain> [-n 5]
```

| Domain | Use for | Example |
|--------|---------|---------|
| `product` | Product/industry type | `"SaaS dashboard"` |
| `style` | Visual style | `"minimal dark professional"` |
| `color` | Color palettes | `"healthcare"` |
| `typography` | Font pairings | `"elegant modern"` |
| `landing` | Page structure | `"hero social-proof"` |
| `chart` | Charts for dashboards | `"real-time sales"` |
| `ux` | UX best practices | `"accessibility animation"` |
| `web` | Web a11y guidelines | `"keyboard focus aria"` |

### Stack-specific guidelines

```bash
python .cursor/skills/ui-ux-pro-max/scripts/search.py "<keyword>" --stack <stack>
```

| Stack | When to use |
|-------|-------------|
| `html-tailwind` | Static sites, landing pages (default if unspecified) |
| `react` | React web apps |
| `react-native` | **This project (GEET POS app)** |
| `nextjs` | Next.js apps |
| `shadcn` | shadcn/ui component libraries |
| `flutter` | Flutter mobile apps |

---

## 9. Design System Persistence

When working on a large app, save the design system so the whole team stays consistent.

### Save master design system

```bash
python .cursor/skills/ui-ux-pro-max/scripts/search.py "POS billing retail mobile" --design-system --persist -p "GEET App"
```

This creates:
```
design-system/
├── MASTER.md           ← Global rules (colors, fonts, spacing, anti-patterns)
└── pages/
    ├── billing.md      ← Optional page overrides
    └── inventory.md
```

### Page-specific override

```bash
python .cursor/skills/ui-ux-pro-max/scripts/search.py "checkout payment flow" --design-system --persist -p "GEET App" --page "billing"
```

**Rule:** When building a page, check `design-system/pages/<page>.md` first. If it exists, its rules **override** `MASTER.md`. If not, use `MASTER.md` only.

---

## 10. Stack-Specific Notes (This Project)

This repository is the **GEET POS Billing app**:

| Item | Value |
|------|--------|
| Framework | Expo ~54 + React Native |
| State | Zustand (`store/store.js`) |
| Navigation | React Navigation |
| Theming | Custom presets in `utils/theme.js` |
| Platforms | Mobile (Android/iOS), Web, Electron desktop |

### When doing UI work on this app

1. Always use `--stack react-native` (not `html-tailwind`).
2. Respect existing theme presets in `utils/theme.js` unless explicitly redesigning.
3. Test at these widths: **375px** (phone), **768px** (tablet), **1024px+** (desktop/web).
4. POS apps need: **large tap targets**, **high contrast**, **minimal steps**, **clear totals**.

**Example command for this project:**
```bash
python .cursor/skills/ui-ux-pro-max/scripts/search.py "POS billing retail checkout mobile" --design-system -p "GEET App"

python .cursor/skills/ui-ux-pro-max/scripts/search.py "touch targets lists forms" --stack react-native
```

### Key project files (UI-related)

| File | Purpose |
|------|---------|
| `utils/theme.js` | Theme presets and color validation |
| `components/ShopSettingsModal.js` | Shop branding & theme settings |
| `components/ThemeColorField.js` | Custom color picker |
| `screens/BillingScreen.js` | Main billing UI |
| `screens/InventoryScreen.js` | Product/inventory UI + **bulk import** |
| `screens/HistoryScreen.js` | Order history UI |
| `utils/inventoryBulkImport.js` | CSV/JSON parser for bulk item import |
| `store/store.js` | `addInventoryItem`, `bulkAddInventoryItems` |

---

## 11. Professional UI Rules (Must Read)

These are the most common mistakes junior developers make. **Fix these before submitting any UI PR.**

### Icons

| Do | Don't |
|----|-------|
| Use SVG icon libraries (Heroicons, Lucide, Expo Vector Icons) | Use emojis (🎨 🚀 ⚙️) as UI icons |
| Keep icon size consistent (e.g. 24×24) | Mix random icon sizes |
| Use official brand SVGs (Simple Icons) | Guess logo shapes |

### Interaction

| Do | Don't |
|----|-------|
| Add visible hover/press feedback | Leave buttons with no feedback |
| Use transitions of **150–300ms** | Instant flashes or slow (>500ms) animations |
| Show focus states for keyboard users | Hide focus outlines |

### Contrast & readability

| Do | Don't |
|----|-------|
| Body text contrast **4.5:1 minimum** (WCAG AA) | Light gray text on white (`#94A3B8` for body) |
| Use `#0F172A` (slate-900) or similar for primary text | Muted gray for important labels |
| Test light **and** dark backgrounds | Assume one theme only |

### Layout

| Do | Don't |
|----|-------|
| Add padding so content is not hidden under fixed headers | Let lists scroll under nav bars |
| Use consistent max-width containers | Mix `max-w-4xl` and `max-w-7xl` randomly |
| Test **375px, 768px, 1024px, 1440px** | Only test on your laptop |

### Accessibility

| Do | Don't |
|----|-------|
| Label all form inputs | Placeholder-only inputs |
| Support `prefers-reduced-motion` | Force animations on all users |
| Provide `alt` text on images | Decorative images with no alt handling |

---

## 12. Pre-Delivery Checklist

Copy this into your PR description or tick before marking a task done.

### Visual quality
- [ ] No emojis used as icons
- [ ] Icons from one consistent set
- [ ] Hover/press states do not shift layout
- [ ] Colors match project theme or approved design system

### Interaction
- [ ] All tappable/clickable elements have clear feedback
- [ ] Transitions are smooth (150–300ms)
- [ ] Focus states visible for keyboard/tab navigation

### Responsive
- [ ] Works at 375px (mobile)
- [ ] Works at 768px (tablet)
- [ ] Works at 1024px+ (desktop/web)
- [ ] No horizontal scroll on mobile

### Accessibility
- [ ] Form inputs have labels
- [ ] Text contrast meets 4.5:1 (body text)
- [ ] `prefers-reduced-motion` respected
- [ ] Color is not the only way to convey status (add icons/text)

### Project-specific (GEET app)
- [ ] Tested on Expo web (`npm run web`)
- [ ] Large enough buttons for shop counter use
- [ ] Currency and totals are easy to read at a glance
- [ ] Theme changes in Shop Settings still look correct

---

## 13. Example Prompts for Cursor

Copy and adapt these in Cursor chat:

### New screen
```
Build a clean inventory list screen for our GEET POS app (React Native / Expo).
Use the ui-ux-pro-max skill. Industry: retail POS. Style: professional, high contrast,
large tap targets. Follow our theme in utils/theme.js.
```

### Redesign existing screen
```
Review and improve the BillingScreen UI. Use ui-ux-pro-max for design system
recommendations. Keep existing functionality. Focus on readability and speed
for shop staff using the app all day.
```

### Landing / marketing page (if building web promo site)
```
Create a landing page for GEET POS billing software. Target: small retail shops
in India. Use ui-ux-pro-max design system. Stack: html-tailwind.
Include hero, features, pricing, and CTA sections.
```

### Accessibility pass
```
Audit the LoginScreen for accessibility issues. Use ui-ux-pro-max UX guidelines.
Fix contrast, focus states, and touch target sizes. React Native / Expo.
```

### Save design system for team
```
Generate and persist a design system for GEET App using ui-ux-pro-max.
Product: POS billing retail mobile. Save to design-system/MASTER.md.
Then implement ShopSettingsModal using those colors and typography principles.
```

---

## 14. Troubleshooting

| Problem | Solution |
|---------|----------|
| Skill not triggering in Cursor | Restart Cursor; confirm `.cursor/skills/ui-ux-pro-max/SKILL.md` exists |
| `python` not found | Install Python 3.12; try `python3` instead of `python` |
| `uipro: command not found` | Run `npm install -g uipro-cli@latest`; restart terminal |
| Wrong nested folder after global install | Move skill to `%USERPROFILE%\.cursor\skills\ui-ux-pro-max` (see Section 4) |
| Search returns nothing useful | Use more specific keywords: industry + style + platform |
| AI ignores design rules | Explicitly say: *"Use the ui-ux-pro-max skill and run design-system first"* |

### Verify installation

```powershell
# Check CLI
uipro --version

# Check Python
python --version

# Check skill files
dir .cursor\skills\ui-ux-pro-max

# Test search
python .cursor/skills/ui-ux-pro-max/scripts/search.py "SaaS dashboard" --design-system
```

---

## 15. Quick Reference Card

```
INSTALL (once)
  npm install -g uipro-cli
  uipro init --ai cursor

DESIGN SYSTEM (always start here)
  python .cursor/skills/ui-ux-pro-max/scripts/search.py "<query>" --design-system -p "Project"

SAVE FOR TEAM
  ... --design-system --persist -p "Project Name"

DOMAIN SEARCH
  ... "<keyword>" --domain ux|style|color|typography|landing|chart

STACK (this project)
  ... "<keyword>" --stack react-native

CURSOR PROMPT PATTERN
  "Build/Improve [screen] for [product]. Use ui-ux-pro-max skill.
   Stack: React Native. Style: [keywords]."

BEFORE PR
  Run Section 12 checklist
```

---

# Part B — GEET App: Inventory & Bulk Import

Use this section when onboarding someone to manage menu items in the GEET POS app, or when extending inventory features.

---

## 16. Inventory Overview

The **Inventory** tab is where shop owners and developers add menu items used on the Billing screen.

Each item supports four configurations:

| Type | Variants | Add-ons | Billing behavior |
|------|----------|---------|------------------|
| **Plain item** | None | None | Added to cart at base price |
| **With variants** | Yes (e.g. Small/Medium/Large) | None | Customer must pick one variant; variant price **replaces** base price |
| **With add-ons** | None | Yes (e.g. Extra cheese) | Customer can pick optional add-ons; prices **add on top** of base price |
| **With both** | Yes | Yes | Customer picks one variant + optional add-ons |

**Pricing rule:**
```
Final price = (variant price OR base price) + sum(selected add-on prices)
```

**Where in code:**

| File | Role |
|------|------|
| `screens/InventoryScreen.js` | UI for single create, edit, delete, and bulk import |
| `store/store.js` | `addInventoryItem`, `bulkAddInventoryItems`, `updateInventoryItem` |
| `utils/inventoryBulkImport.js` | Parses and validates CSV/JSON bulk data |
| `components/ItemConfigModal.js` | Variant/add-on picker on Billing screen |

---

## 17. Single Item Creation

### Steps in the app

1. Open the **Inventory** tab.
2. Enter **Item Name** and **Base Price (Rs)**.
3. Optionally tap **+ Add Variant** for sizes/options (each has name + price).
4. Optionally tap **+ Add Add-on** for extras (each has name + price).
5. Tap **Save Item**.

### Field rules

| Field | Required | Notes |
|-------|----------|-------|
| Item name | Yes | Cannot be blank |
| Base price | Yes | Number ≥ 0 |
| Variant name | If row added | Each variant needs name + price ≥ 0 |
| Add-on name | If row added | Each add-on needs name + price ≥ 0 |
| Category | No | Optional label shown in inventory list |

### Edit or delete

- Tap **Edit** on a saved item to load it into the form, then **Update Item**.
- Tap **Delete** to remove permanently (does not remove past orders from history).

---

## 18. Bulk Import (All Item Types)

Bulk import lets you create **many items at once** from CSV (or JSON). It supports all four item types in one import file.

### Where to find it

1. Open **Inventory** tab.
2. Tap **Bulk Import Items** (above the single-item form).
3. Paste CSV data or tap **Load Sample**.
4. Tap **Preview** to validate.
5. Tap **Import Items** to save.

### CSV format

**Header row (required on first line):**

```csv
name,basePrice,category,variants,addons
```

**Columns:**

| Column | Required | Format | Example |
|--------|----------|--------|---------|
| `name` | Yes | Plain text. Use quotes if name contains commas. | `Coffee` |
| `basePrice` | Yes | Number ≥ 0 | `60` |
| `category` | No | Text label | `Beverages` |
| `variants` | No | `Name:Price` pairs separated by `\|` | `Small:50\|Medium:60\|Large:80` |
| `addons` | No | `Name:Price` pairs separated by `\|` | `Extra shot:20\|Oat milk:15` |

Leave `variants` and/or `addons` **empty** for plain items or items with only one type of option.

### Full sample file (all 4 item types)

Copy this into the bulk import box or use **Load Sample** in the app:

```csv
name,basePrice,category,variants,addons
Plain Item,100,,,
Item With Variants,60,Beverages,Small:50|Medium:60|Large:80,
Item With Addons,40,Beverages,,Extra cheese:15|Bacon:25
Item With Both,120,Food,Veg:120|Chicken:160,Cheese:15|Extra sauce:10
```

### JSON format (alternative)

Paste a JSON **array** instead of CSV:

```json
[
  {
    "name": "Plain Item",
    "basePrice": 100,
    "category": "",
    "variants": [],
    "addons": []
  },
  {
    "name": "Coffee",
    "basePrice": 60,
    "category": "Beverages",
    "variants": [
      { "name": "Small", "price": 50 },
      { "name": "Medium", "price": 60 },
      { "name": "Large", "price": 80 }
    ],
    "addons": [
      { "name": "Extra shot", "price": 20 }
    ]
  }
]
```

### Import workflow

```
Paste CSV/JSON
      │
      ▼
  Preview  ──► Shows valid items + row errors
      │
      ▼
Import Items ──► Adds all valid rows to inventory
```

- **Preview** must pass with **zero row errors** before import.
- Each imported item gets a new auto-increment **ID** (item number).
- Bulk import does **not** overwrite existing items; it always **adds** new ones.

### Real-world menu example (café)

```csv
name,basePrice,category,variants,addons
Espresso,45,Coffee,,Extra shot:20|Decaf:0
Cappuccino,80,Coffee,Regular:80|Large:100,Oat milk:15|Extra foam:0
Veg Sandwich,120,Food,,Cheese:15|Grilled:20
Chicken Wrap,160,Food,Regular:160|Meal combo:220,Extra sauce:10|Fries:40
Mineral Water,25,Drinks,,,
```

---

## 19. Bulk Import Examples & Troubleshooting

### Quick reference — which columns to fill

| Item type | variants column | addons column |
|-----------|-----------------|---------------|
| Plain | *(empty)* | *(empty)* |
| Variants only | `Small:50\|Large:80` | *(empty)* |
| Add-ons only | *(empty)* | `Cheese:15\|Bacon:25` |
| Both | `Veg:120\|Chicken:160` | `Sauce:10\|Cheese:15` |

### Common mistakes

| Error | Cause | Fix |
|-------|-------|-----|
| `Each row needs at least name and basePrice` | Too few columns | Add commas for empty category/variants/addons |
| `Invalid variant "Small"`. Use Name:Price format | Missing price | Write `Small:50` not `Small` |
| `basePrice must be a valid number >= 0` | Text in price column | Use numbers only: `60` not `Rs 60` |
| `Fix errors first` on import | Skipped Preview | Tap **Preview**, fix bad rows, try again |
| Item name with comma breaks columns | Unquoted comma in name | Use `"Coffee, Special",60,,,` |

### Tips for preparing data in Excel / Google Sheets

1. Create columns: `name`, `basePrice`, `category`, `variants`, `addons`.
2. For variants/add-ons use formula-friendly text: `Small:50|Medium:60`.
3. Export or copy as CSV.
4. Paste into the app bulk import box.
5. Always **Preview** before importing.

### Developer notes (extending bulk import)

Parser lives in `utils/inventoryBulkImport.js`:

| Export | Purpose |
|--------|---------|
| `parseBulkImportText(text)` | Main entry — auto-detects JSON vs CSV |
| `parseOptionList(raw, label, line)` | Parses `Name:Price\|Name:Price` cells |
| `describeImportItem(item)` | Human label: "Plain item", "With variants", etc. |
| `BULK_IMPORT_SAMPLE_CSV` | Built-in sample string |

Store action:

```javascript
const { added } = bulkAddInventoryItems(parsedItems);
// added = number of items inserted
```

To add validation (e.g. duplicate names), extend `parseBulkImportText` or add a pre-import check in `InventoryScreen.js` before calling `bulkAddInventoryItems`.

---

## Resources

| Resource | URL |
|----------|-----|
| UI/UX Pro Max GitHub | https://github.com/nextlevelbuilder/ui-ux-pro-max-skill |
| Expo docs (this project uses v54+) | https://docs.expo.dev |
| React Native docs | https://reactnative.dev/docs/getting-started |
| WCAG contrast checker | https://webaim.org/resources/contrastchecker/ |
| Google Fonts | https://fonts.google.com |
| Heroicons | https://heroicons.com |
| Lucide icons | https://lucide.dev |

---

## Who to Ask

| Question type | Ask |
|---------------|-----|
| Design direction / brand | Senior developer or product owner |
| Skill not working / install issues | Senior developer |
| GEET app business logic | Team lead |
| Inventory / bulk import format | This doc — Section 18 |
| Expo build / APK | See `docs/ANDROID-BUILD-AND-INSTALL.md` |

---

*This document was prepared for onboarding junior web developers. Keep it updated when the skill, inventory features, or project stack changes.*
