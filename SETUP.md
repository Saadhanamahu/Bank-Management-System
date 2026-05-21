# BMS — Setup Guide

Complete setup for two banks (Alpha Bank + Beta Bank) with shared Firebase hub.
Estimated time: **30–45 minutes** (mostly Firebase Console clicks).

---

## Prerequisites

- Node.js 18+ installed (`node -v`)
- A Google account for Firebase

---

## Step 1 — Create 3 Firebase projects

Go to [console.firebase.google.com](https://console.firebase.google.com) and create:

| Project name | Purpose                |
|--------------|------------------------|
| `bms-bank-a` | Alpha Bank private DB  |
| `bms-bank-b` | Beta Bank private DB   |
| `bms-hub`    | Shared interbank hub   |

For each project:
1. Click **Add project**
2. Give it the name above
3. Disable Google Analytics (not needed)
4. Click **Create project**

---

## Step 2 — Enable Firestore in all 3 projects

For each project (`bms-bank-a`, `bms-bank-b`, `bms-hub`):
1. Left sidebar → **Firestore Database**
2. Click **Create database**
3. Select **Start in test mode** (we'll deploy rules after)
4. Choose your nearest region (e.g. `asia-south1` for India)
5. Click **Enable**

---

## Step 3 — Enable Firebase Authentication

### Private projects (Bank A and Bank B)

For **each** of `bms-bank-a` and `bms-bank-b`:
1. Left sidebar → **Authentication**
2. Click **Get started**
3. Under **Sign-in providers**, enable **Email/Password**
4. Click **Save**

### Hub project (`bms-hub`)

Same steps — enable Email/Password Authentication.

**Then create 2 hub auth users** (one per bank):

In `bms-hub` → Authentication → Users tab → **Add user**:

| Email                    | Password         | Purpose        |
|--------------------------|------------------|----------------|
| `banka@bms-hub.local`    | `BankA@Hub2024!` | Bank A hub user|
| `bankb@bms-hub.local`    | `BankB@Hub2024!` | Bank B hub user|

---

## Step 4 — Register hub users' bankId in Firestore

In `bms-hub` → Firestore Database, manually create:

**Collection:** `hub_users`
**Document ID:** *(the UID of banka@bms-hub.local — copy from Authentication → Users)*

```
bankId: "bank_a"
email:  "banka@bms-hub.local"
```

**Second document ID:** *(the UID of bankb@bms-hub.local)*

```
bankId: "bank_b"
email:  "bankb@bms-hub.local"
```

---

## Step 5 — Register banks in hub Firestore

In `bms-hub` → Firestore, create:

**Collection:** `banks`

**Document ID:** `bank_a`
```
bankId:     "bank_a"
bankName:   "Alpha Bank"
ifscPrefix: "BANK"
isActive:   true
```

**Document ID:** `bank_b`
```
bankId:     "bank_b"
bankName:   "Beta Bank"
ifscPrefix: "BANK"
isActive:   true
```

---

## Step 6 — Deploy Firestore Security Rules

### Install Firebase CLI
```bash
npm install -g firebase-tools
firebase login
```

### Private projects (run for EACH bank)
```bash
# Copy the private rules file
cp firestore.rules.private firestore.rules

firebase use bms-bank-a
firebase deploy --only firestore:rules

firebase use bms-bank-b
firebase deploy --only firestore:rules
```

### Hub project
```bash
cp firestore.rules.hub firestore.rules
firebase use bms-hub
firebase deploy --only firestore:rules
```

---

## Step 7 — Get Firebase config keys

For each project, go to:
**Project Settings → General → Your apps → Add app → Web**

Register a web app and copy the `firebaseConfig` object. You'll get:
```
apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId
```

---

## Step 8 — Fill in the .env files

Edit `.env.bank-a` — replace every `FILL_ME` with the real values:

```bash
# Private config → from bms-bank-a project
VITE_PRIVATE_API_KEY=AIza...
VITE_PRIVATE_AUTH_DOMAIN=bms-bank-a.firebaseapp.com
VITE_PRIVATE_PROJECT_ID=bms-bank-a
VITE_PRIVATE_STORAGE_BUCKET=bms-bank-a.appspot.com
VITE_PRIVATE_MESSAGING_SENDER_ID=123456789
VITE_PRIVATE_APP_ID=1:123:web:abc

# Hub config → from bms-hub project (SAME for both .env files)
VITE_HUB_API_KEY=AIza...
VITE_HUB_AUTH_DOMAIN=bms-hub.firebaseapp.com
VITE_HUB_PROJECT_ID=bms-hub
VITE_HUB_STORAGE_BUCKET=bms-hub.appspot.com
VITE_HUB_MESSAGING_SENDER_ID=987654321
VITE_HUB_APP_ID=1:987:web:xyz
```

Repeat for `.env.bank-b` (different private config, same hub config).

---

## Step 9 — Create the first admin staff user

For **Bank A** (`bms-bank-a` project):
1. Firebase Console → Authentication → **Add user**
2. Email: `admin@banka.local`, Password: `Admin@BankA!`
3. Copy the **UID** from the Users list
4. Firestore → `staff` collection → **New document**
   - Document ID: *(paste the UID)*
   - Fields:
     ```
     uid:       "<paste uid>"
     name:      "Admin User"
     email:     "admin@banka.local"
     role:      "admin"
     bankId:    "bank_a"
     isActive:  true
     createdAt: <timestamp>
     ```

Repeat for Bank B with `admin@bankb.local` in `bms-bank-b`.

---

## Step 10 — Install dependencies and run

```bash
cd bms-bank
npm install
```

### Terminal 1 — Bank A (port 5173)
```bash
npm run dev:banka
```
Open: http://localhost:5173
Login: `admin@banka.local` / `Admin@BankA!`

### Terminal 2 — Bank B (port 5174)
```bash
npm run dev:bankb
```
Open: http://localhost:5174
Login: `admin@bankb.local` / `Admin@BankB!`

---

## Step 11 — Test interbank transfer

1. In Bank A admin panel, create a customer + account. Note the account number.
2. In Bank B admin panel, create a customer + account. Note the account number.
3. In Bank A → Send Money:
   - From: Bank A account
   - Destination bank: **Beta Bank**
   - To account: *Bank B's account number*
   - Amount: ₹1,000
   - Mode: IMPS
4. Watch the status tracker on Bank A's screen
5. Switch to Bank B browser tab — you'll see a toast: "💰 Received ₹1,000 from bank_a via IMPS"
6. Check Bank B's Dashboard — balance updated!

---

## Architecture recap

```
Bank A App (.env.bank-a)         Shared Hub (bms-hub)         Bank B App (.env.bank-b)
─────────────────────            ─────────────────────         ─────────────────────────
bms-bank-a Firestore             interbank_transfers/          bms-bank-b Firestore
  accounts/                        { transferId,                  accounts/
  transactions/                     fromBankId: bank_a,           transactions/
  customers/                        toBankId:   bank_b,           customers/
  staff/                            amount,                       staff/
  audit_logs/         ──writes──▶   status: pending }  ──reads─▶  (onSnapshot listener)
  notifications/                                                   └─ credits balance
                      ◀──reads───  status: completed  ◀──writes──   └─ updates hub status
```

---

## Common issues

**"Hub write failed"** — Hub auth credentials in .env are wrong or the hub user wasn't created.
Check: `VITE_HUB_BANK_EMAIL` and `VITE_HUB_BANK_PASSWORD` match what's in Firebase Auth.

**"No staff record found"** — User exists in Firebase Auth but not in Firestore `staff/{uid}`.
Fix: Create the staff document manually (Step 9).

**Balance not updating on Bank B** — The `onSnapshot` listener requires hub auth.
Check browser console for "[HUB AUTH]" warnings.

**"Missing or insufficient permissions"** — Firestore rules blocking.
Make sure rules are deployed (Step 6) and the `hub_users/{uid}.bankId` field matches `VITE_BANK_ID`.
