# Demo Account Protection Plan & Verification Report

This document outlines the protection mechanism implemented to lock and protect the five demo presentation accounts for the Final Year Project (FYP) demonstration. These protection measures ensure the credentials remain stable, predictable, and cannot be overwritten by any automated scripts.

---

## 🔒 Protected Accounts List

| Role | Username/Matrix | Email Address | Assigned Role | Description |
| --- | --- | --- | --- | --- |
| **Admin** | `AI220382` | `khairul512003@gmail.com` | `admin` | FYP Presentation Demo Admin |
| **High Council** | `AI220383` | `k@gmail.com` | `high_council` | FYP Presentation Demo High Council |
| **Club Committee** | `AI220384` | `kh@gmail.com` | `committee` | FYP Presentation Demo Club Committee |
| **Student** | `AI220385` | `ali@example.com` | `student` | FYP Presentation Demo Student (Ali) |
| **Club Advisor** | `suriawati` | `suriawati@itc.local` | `club_advisor` | FYP Presentation Demo Club Advisor |

---

## ⚙️ Protection Mechanisms Implemented

1. **Shared Configuration File:**
   * Created [protectedAccounts.json](file:///c:/Users/khairul/OneDrive/Documents/Degree/FYP/itc-secure-document-verification-system/lib/protectedAccounts.json) containing the detailed structure of all five protected demo accounts.

2. **Seeding Skip Logic:**
   * Modified [seed-production-data.mjs](file:///c:/Users/khairul/OneDrive/Documents/Degree/FYP/itc-secure-document-verification-system/scripts/seed-production-data.mjs) to read `protectedAccounts.json` and dynamically skip updating or overwriting any auth user metadata, passwords, or public profile details matching these accounts.

3. **Advisor Protection Safeguard:**
   * Modified [ensure-club-advisor.mjs](file:///c:/Users/khairul/OneDrive/Documents/Degree/FYP/itc-secure-document-verification-system/scripts/ensure-club-advisor.mjs) to skip resetting the password of `suriawati@itc.local` to the default `suriawati123` unless an explicit `force` or `--force` parameter is passed in the command arguments.

---

## 📂 Files Modified

* [lib/protectedAccounts.json](file:///c:/Users/khairul/OneDrive/Documents/Degree/FYP/itc-secure-document-verification-system/lib/protectedAccounts.json) (New configuration file)
* [scripts/seed-production-data.mjs](file:///c:/Users/khairul/OneDrive/Documents/Degree/FYP/itc-secure-document-verification-system/scripts/seed-production-data.mjs) (Skip logic integrated)
* [scripts/ensure-club-advisor.mjs](file:///c:/Users/khairul/OneDrive/Documents/Degree/FYP/itc-secure-document-verification-system/scripts/ensure-club-advisor.mjs) (Skip password reset unless forced)
* [DEMO_ACCOUNTS.md](file:///c:/Users/khairul/OneDrive/Documents/Degree/FYP/itc-secure-document-verification-system/DEMO_ACCOUNTS.md) (Documentation updated)

---

## 🧪 Verification Results

The table below documents the live verification results tested on production (`https://itc-secure-document-verification-sy.vercel.app`):

| Role | Username | Password | Auth Success | Dashboard Success |
| --- | --- | --- | --- | --- |
| **Admin** | `AI220382` | `123456aA` | Yes | Yes (Redirected to `/admin`) |
| **High Council** | `AI220383` | `123456aA` | Yes | Yes (Redirected to `/high-council`) |
| **Club Committee** | `AI220384` | `123456aA` | Yes | Yes (Redirected to `/club-committee`) |
| **Student** | `AI220385` | `123456aA` | Yes | Yes (Redirected to `/student`) |
| **Club Advisor** | `suriawati` | `123456aA` | Yes | Yes (Redirected to `/club-advisor`) |
