# GEET App — Complete User Manual

**App name:** GEET app  
**Version:** 1.0  
**For:** Shop owners, cashiers, and staff  
**Platforms:** Android phone · Web browser · Windows desktop  

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Getting Started](#2-getting-started)
3. [Login & License](#3-login--license)
4. [App Overview (3 Tabs)](#4-app-overview-3-tabs)
5. [Shop Settings](#5-shop-settings)
6. [Inventory — Add & Manage Items](#6-inventory--add--manage-items)
7. [Bulk Import (Many Items at Once)](#7-bulk-import-many-items-at-once)
8. [Billing — Take Orders](#8-billing--take-orders)
9. [GST / Tax on Bills](#9-gst--tax-on-bills)
10. [Checkout & WhatsApp Invoice](#10-checkout--whatsapp-invoice)
11. [Order History](#11-order-history)
12. [Export Reports (HTML & Excel)](#12-export-reports-html--excel)
13. [Daily Workflow Guide](#13-daily-workflow-guide)
14. [Tips & Shortcuts](#14-tips--shortcuts)
15. [Troubleshooting (FAQ)](#15-troubleshooting-faq)
16. [Support & License Renewal](#16-support--license-renewal)

---

## 1. Introduction

**GEET app** is a simple Point of Sale (POS) and billing app for small shops, cafés, restaurants, and retail counters. It helps you:

- Add menu/products with **variants** (sizes) and **add-ons** (extras)
- Bill customers quickly on phone, web, or desktop
- Send **PDF invoices on WhatsApp**
- Track **order history** with unique Order IDs
- Export sales reports for the owner or accountant

You do **not** need paper bills or a separate calculator. Everything stays on your device.

---

## 2. Getting Started

### What you need

| Requirement | Details |
|-------------|---------|
| License key | 10-character code from your provider |
| Shop name | Your business name (shown on bills) |
| Device | Android phone, computer browser, or Windows desktop app |

### Install on Android phone

See the separate guide: **`docs/ANDROID-BUILD-AND-INSTALL.md`**

After installing the APK, open **GEET app** like any normal app. You do **not** need Expo Go.

### Run on web (browser)

On a computer with the app installed for development:
```
npm run web
```
Open the URL shown in the terminal (usually port 8085).

### Run on Windows desktop

**Installed app (shop counter):** Install from the Windows `.exe` installer. It runs on its own — no terminal or `npm` needed.

**Development on your PC:** Run the web server first, then the desktop window:

```
npm run web
```

In a second terminal:

```
npm run desktop
```

Opens the app in an Electron window (good for shop counter PCs).

To build a new installer after code changes: `build-desktop-installer.bat` or `npm run desktop:installer`.

---

## 3. Login & License

### First login

1. Open GEET app.
2. Enter your **Shop / POS name** (e.g. `Naren Cafe`).
3. Enter your **10-character license key** (letters and numbers only).
4. Tap **Login**.

Your shop name appears on the Billing tab header after login.

### License expired?

If your key has expired:

1. On the login screen, tap **Generate renewal code**.
2. Enter your shop name (must match exactly).
3. Copy or share the **renewal code** with your provider.
4. The code is valid for a limited time — send it quickly.

### Logout

Tap **Logout** in the top-right corner of any tab. Your data stays on the device until you log in again with a valid key.

---

## 4. App Overview (3 Tabs)

After login you see three tabs at the bottom:

| Tab | Icon | Purpose |
|-----|------|---------|
| **Add Items** | 📦 | Create and edit menu/products (Inventory) |
| **Billing** | 🧾 | Main screen — add items to cart and checkout |
| **Order History** | 📋 | Past orders, export reports, resend invoices |

**Top bar (all tabs):**
- **Settings** — shop name, FSSAI, GSTIN, theme colors
- **Logout** — sign out

---

## 5. Shop Settings

Tap **Settings** (top-right) on any tab.

### Shop details

| Field | Required | Where it appears |
|-------|----------|------------------|
| Shop name | Yes | Bill header, invoices, exports |
| FSSAI number | No | Bill and PDF invoice (if filled) |
| GSTIN | No | Bill and PDF invoice (if filled) |

Leave FSSAI/GSTIN empty if you don't need them on bills.

### Theme colors

Choose a color preset or **Custom**:

| Preset | Style |
|--------|-------|
| Classic | Dark blue + red accent |
| Ocean | Blue tones |
| Forest | Green tones |
| Sunset | Orange/red tones |
| Purple | Purple tones |
| Custom | Pick your own colors for buttons, text, menu bar |

Tap **Save** to apply. Colors update across the whole app immediately.

---

## 6. Inventory — Add & Manage Items

Open the **Add Items** tab.

### Create a single item

1. Enter **Item Name** (e.g. `Coffee`).
2. Enter **Base Price (Rs)** (e.g. `60`).
3. Optionally add **Variants** — tap **+ Add Variant**
   - Example: `Small` ₹50, `Medium` ₹60, `Large` ₹80
   - **Variant price replaces base price** when customer picks that option.
4. Optionally add **Add-ons** — tap **+ Add Add-on**
   - Example: `Extra shot` ₹20, `Oat milk` ₹15
   - **Add-on price is added on top** of base or variant price.
5. Tap **Save Item**.

### Four item types you can create

| Type | Variants | Add-ons | Example |
|------|----------|---------|---------|
| Plain item | No | No | Mineral Water ₹25 |
| With variants | Yes | No | Coffee — Small/Medium/Large |
| With add-ons | No | Yes | Muffin + Chocolate topping |
| With both | Yes | Yes | Sandwich — Veg/Chicken + Cheese |

### Edit or delete an item

- Tap **Edit** on a saved item — the form loads at the **top** of the screen.
- Change fields and tap **Update Item**.
- Tap **Delete** to remove (past orders in History are not affected).

Each item gets an auto **ID number** (shown as `ID: 1`, `ID: 2`, …) used for quick search on Billing.

---

## 7. Bulk Import (Many Items at Once)

Use bulk import when you have a long menu and don't want to type each item manually.

### Steps

1. Open **Add Items** tab.
2. Tap **Bulk Import Items**.
3. Paste your CSV data (or tap **Load Sample** to see the format).
4. Tap **Preview** to check for errors.
5. Tap **Import Items**.

### CSV format

First line (header):
```csv
name,basePrice,category,variants,addons
```

Each following line is one item:

```csv
Plain Item,100,,,
Coffee,60,Beverages,Small:50|Medium:60|Large:80,
Tea,40,Beverages,,Extra shot:20|Honey:10
Sandwich,120,Food,Veg:120|Chicken:160,Cheese:15|Sauce:10
```

| Column | Required | Format |
|--------|----------|--------|
| name | Yes | Item name |
| basePrice | Yes | Number (₹) |
| category | No | Any label |
| variants | No | `Name:Price\|Name:Price` |
| addons | No | `Name:Price\|Name:Price` |

**Tips:**
- Leave variants/addons columns **empty** for plain items.
- Use `|` between multiple variants or add-ons.
- Always tap **Preview** before importing.
- Bulk import **adds** items — it does not replace existing ones.

---

## 8. Billing — Take Orders

Open the **Billing** tab (shows your shop name).

### Menu area (top)

- Tap an item to add it to the cart.
- Items **with variants or add-ons** open a picker — select options, then **Add to cart**.
- Plain items go straight to the cart.

### Search & sort

| Feature | How to use |
|---------|------------|
| Search | Type item name or ID (e.g. `3` or `id:3`) |
| Sort | Tap **ID**, **Name**, **Price**, or **Date** chips |

### Cart & bill (bottom bar)

| Button | Action |
|--------|--------|
| 🛒 Cart icon | Opens full **Current Bill** sheet |
| **Total** | Shows current cart total |
| **Checkout** | Completes the order |

### Inside Current Bill (cart sheet)

- See all line items with quantity **+ / −** controls
- **Remove** individual lines
- Toggle **Add GST 5%** (see Section 9)
- Enter **Customer WhatsApp No.** (optional, 10 digits)
- **Mark Paid** — flag order as paid before checkout
- **Checkout** — save order and optionally send invoice

---

## 9. GST / Tax on Bills

GEET app supports **5% GST** split as:
- **CGST 2.5%**
- **SGST 2.5%**

### How to apply GST

1. Open the cart (🛒).
2. Tap **Add GST 5% (CGST 2.5% + SGST 2.5%)**.
3. Bill shows Subtotal, CGST, SGST, and **Grand Total**.

GST is optional — leave it off for non-tax bills.

Your **GSTIN** (from Settings) appears on the bill and PDF invoice when set.

---

## 10. Checkout & WhatsApp Invoice

### Checkout steps

1. Add items to cart.
2. Open cart → optional: GST, customer phone, Mark Paid.
3. Tap **Checkout**.
4. Confirm when prompted.
5. Order is saved with a unique **Order ID** (e.g. `ORD-000042`).

### WhatsApp PDF invoice

If you entered a **10-digit customer phone** at checkout:
- App automatically creates and opens WhatsApp with a **PDF tax invoice**.
- Customer receives a professional invoice with shop name, items, totals, Order ID.

If no phone was entered:
- Order is still saved in History.
- You can add the phone later and tap **Share PDF Invoice**.

### Phone number rules

- Must be **10 digits** (Indian mobile format).
- No country code needed in the app (e.g. enter `9876543210`).

---

## 11. Order History

Open the **Order History** tab.

### What you see

Each order card shows:
- Date and time
- **Order ID**
- Total amount
- Item lines (with variants and add-ons)
- Paid / not paid status
- Customer phone (if saved)

### Order actions

| Action | Purpose |
|--------|---------|
| **Mark Paid / Paid ✓** | Toggle payment status (green highlight when paid) |
| **Order Ready** | Send WhatsApp message that order is ready for pickup |
| **Add number / Edit number** | Save or update customer WhatsApp |
| **Share PDF Invoice** | Resend invoice anytime |

### Color highlights

| Color | Meaning |
|-------|---------|
| Green tint | Order marked as **Paid** |
| Blue tint | **Order Ready** message sent |

Orders are listed **newest first**.

---

## 12. Export Reports (HTML & Excel)

At the top of **Order History**, use the **Export Orders** panel.

### Date range

| Preset | Range |
|--------|-------|
| Today | Current day only |
| 7 Days | Last 7 days |
| 30 Days | Last 30 days |
| All | All stored orders |

Or pick custom **From** and **To** dates.

### Export formats

| Button | Output | Best for |
|--------|--------|----------|
| **Export Table (HTML)** | Shareable web table | Quick view on phone, email |
| **Export CSV (Excel)** | `.csv` file | Excel, Google Sheets, accountant |

Summary shows: **X orders · ₹ total revenue** for the selected range.

CSV includes order details, line items, variants, add-ons, and totals.

---

## 13. Daily Workflow Guide

### Opening the shop (5 minutes)

1. Log in with license key.
2. Check **Add Items** — menu is complete.
3. Open **Billing** — verify items appear.
4. Optional: check Settings (shop name, GSTIN, theme).

### During service

```
Customer order → Tap items on Billing
                → Pick variant/add-ons if asked
                → Open cart → adjust qty
                → Add GST if needed
                → Enter WhatsApp (optional)
                → Checkout
                → Give Order ID to customer
```

### End of day (5 minutes)

1. Open **Order History**.
2. Select **Today** preset.
3. Review total revenue shown.
4. **Export CSV** for owner/accountant.
5. Tap **Logout** if sharing the device.

---

## 14. Tips & Shortcuts

| Tip | Detail |
|-----|--------|
| Search by ID | Type `3` or `id:3` on Billing to find item ID 3 quickly |
| Bulk setup | Import full menu once via CSV instead of typing 50 items |
| No phone? | Checkout still works — add number in History later |
| Resend invoice | History → Share PDF Invoice on any past order |
| Order Ready | Use for takeaway/delivery when food is prepared |
| Mark Paid | Use for cash/UPI received — helps track unpaid orders |
| Desktop for counter | Run `npm run desktop` on shop PC for bigger screen |
| Theme | Match app colors to your shop brand in Settings |

---

## 15. Troubleshooting (FAQ)

| Problem | Solution |
|---------|----------|
| "Invalid license key" | Check all 10 characters; contact provider for new key |
| "License expired" | Generate renewal code on login screen |
| No items on Billing | Add items in **Add Items** tab first |
| Can't checkout | Cart is empty — add at least one item |
| WhatsApp didn't open | Install WhatsApp; check phone number is 10 digits |
| PDF invoice failed | Try **Share PDF Invoice** from History |
| Edit form not visible | Tap Edit — screen scrolls to top automatically |
| Bulk import errors | Tap Preview; fix rows shown in error message |
| Export shows 0 orders | Change date range; check orders exist for those dates |
| App logged out suddenly | License may have expired — log in again or renew |
| Data lost after reinstall | Data is stored on device — backup exports regularly |

---

## 16. Support & License Renewal

### Before contacting support, note:

- Shop name used at login
- App name: **GEET app**
- Package ID: `com.riye.posbilling`
- What you were doing when the problem occurred
- Screenshot if possible

### License renewal process

1. Login screen → **Generate renewal code**
2. Share code + shop name with your provider
3. Receive new license key
4. Log in with the new key

### Related documents

| Document | Audience |
|----------|----------|
| `docs/GEET-APP-USER-MANUAL.md` | This manual — shop staff |
| `docs/ANDROID-BUILD-AND-INSTALL.md` | Installing APK on phone |
| `docs/UI-UX-PRO-MAX-DEVELOPER-GUIDE.md` | Developers & bulk import technical details |

---

## Quick Reference Card

```
LOGIN          Shop name + 10-char license key

ADD ITEM       Add Items tab → name, price, variants, add-ons → Save

BULK IMPORT    Add Items → Bulk Import → paste CSV → Preview → Import

BILL           Billing tab → tap items → cart → Checkout

GST            Cart → Add GST 5%

INVOICE        Enter 10-digit WhatsApp at checkout OR History → Share PDF

HISTORY        Order History → find order → Paid / Order Ready / Export

SETTINGS       Top-right → shop name, FSSAI, GSTIN, theme colors

EXPORT         History → pick dates → Export HTML or CSV
```

---

*GEET app — Simple billing for modern shops. For sales enquiries, use the included sales presentation (`GEET-App-Sales-Presentation.pptx`).*
