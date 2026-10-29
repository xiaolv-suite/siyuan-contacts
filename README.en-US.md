<div align="center">

# Lv Contacts (小驴人脉)

[![CI](https://github.com/ai68298100/siyuan-contacts/actions/workflows/ci.yml/badge.svg)](https://github.com/ai68298100/siyuan-contacts/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/ai68298100/siyuan-contacts)](https://github.com/ai68298100/siyuan-contacts/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
![SiYuan](https://img.shields.io/badge/SiYuan-%3E%3D%203.8.5-blue)

**Manage people, relationships, organizations, and milestones in SiYuan: person records are documents backed by a native SiYuan database.**

**Latest stable release: v0.6.59** · [Download and install](https://github.com/ai68298100/siyuan-contacts/releases/tag/v0.6.59) · [Open an issue](https://github.com/ai68298100/siyuan-contacts/issues)

English | [简体中文](README.md)

<img src="preview.png" alt="Lv Contacts preview" width="640" />

</div>

---

Lv Contacts keeps people, relationships and shared experiences in your SiYuan workspace. Each person is a regular SiYuan document; structured profile fields live in a native database bound to that document, alongside SiYuan search, backlinks, and sync.

---

## 💡 Key Features & Capabilities

Lv Contacts is a **Local-First**, **privacy-centric**, and **bi-directionally linked** Personal Relationship Management (PRM) platform. Unlike sales-oriented corporate CRMs, Lv Contacts is built for nurturing authentic, long-term personal ties, relationship temperature tracking, mutual exchanges, and milestone memories.

| Module | Purpose & Value | Key Capabilities |
| :--- | :--- | :--- |
| **📇 Person Profiles<br>(One Person, One Document)** | Each contact is an authentic SiYuan note document backed by a native Attribute View database, serving as both a structured entry and an ongoing lifetime chronicle. | • Native Attribute View database backbone<br>• Name, phone, WeChat, email, website, city, birthday (solar and lunar)<br>• Privacy Shield (one-click auto-masking of phone/email/WeChat with 5s peek timeout)<br>• Colorful squircle avatar initials and pinyin alphabet quick indexing |
| **🌡️ Relationship Cadence & Temperature<br>(Cadence & Health)** | Replaces rigid reminders with objective cadence-based relationship temperatures, preventing valued ties from growing cold unnoticed. | • 4-tier temperature calculation: 🔥 Hot (recent) / 🍃 Warm (healthy) / 🌬️ Cool (overdue) / ❄️ Cold (distant)<br>• Customizable personal contact cadence (1–365 days) or pause reminders<br>• Dashboard "🧊 Cooling Radar & Reconnect Hub" weighting VIPs and overdue days for instant reconnection |
| **💬 Interactions & Scenarios<br>(Timeline & Templates)** | Replaces dry memos with lively dialogue-bubble timelines, distilling ongoing facts and insights from meetings and calls. | • Bubble-styled timeline distinguishing visits, coffee, meals, calls, messages, and conferences<br>• 9 built-in featured note templates (business meeting, coffee chat, dining, conference, mentorship, greeting)<br>• Dynamic variable inserter (`{{姓名}}`, `{{日期}}`, `{{上次互动}}`, `{{公司}}`, `{{职位}}`, `{{城市}}`)<br>• On-the-fly distillation of quotes, preferences, and facts |
| **🗓️ Meeting Itineraries & Preparation<br>(Itineraries & Visits)** | Designed for client meetings, business trips, and appointments, ensuring thoughtful preparation without post-meeting re-entry friction. | • Structured agenda, target date/time, venue, companions, and memos<br>• Interactive preparation checklist (documents/samples/contracts/gifts)<br>• Dynamic countdown tags (Today / in N days / Overdue)<br>• One-click "Complete & Log Interaction" pre-filling meeting notes; copy Markdown itinerary |
| **🛡️ Social Preferences & Taboo Radar<br>(Preferences & Taboos)** | Structured management of dining preferences and sensitive red lines, ensuring smooth dining and business hosting. | • 4-dimension management: 🍲 Dietary & allergies, ☕ Tea/coffee/wine, 🤝 Meeting habits, 🚫 Sensitive taboos<br>• Header "Micro-Preferences Ribbon" for 1-second preference checks with red-line alert styling<br>• Dashboard "🛡️ Pre-Meeting Hub & Taboo Radar" screening all contact taboos and pending promises |
| **🌱 Relationship Lifecycle Funnel<br>(Lifecycle Funnel)** | Mirrors the natural progression of authentic ties, offering a macroscopic strategy view of your network's maturity. | • 5-stage progression model: 🌱 Acquaintance ➔ 💬 Connection ➔ 🚀 Collaboration ➔ ⭐ Close Ally ➔ 💤 Dormant<br>• Stage transition history tracking; batch stage updates in roster<br>• Dashboard "Lifecycle Funnel Console" computing collaboration rates with 1-click roster drilldown |
| **⚖️ Reciprocity & Balance Audit<br>(Reciprocity & Balance)** | Monitors mutual exchange equity to avoid one-sided extraction or over-giving, maintaining healthy reciprocal networks. | • Bilateral promise tracking: comparing our fulfillment rate vs theirs<br>• Exchange ledger audit: net balance perspective between receivable/given vs payable/received<br>• Dual-sided balance bar and 0–100 reciprocity index with tailored maintenance advice |
| **🌐 Network Graph & Topologic Hubs<br>(Network Graph & Hubs)** | Visualizes complex social topologies to discover network bridges and super-connectors. | • Dual graph modes: explicit relationship graph + native SiYuan document reference graph<br>• 4 layout engines: Force-directed (CoSE), Concentric rings, Breadthfirst tree, Circle<br>• Timeline Evolution Slider animating network growth over years<br>• "🌐 Network Hubs & Bridge Connectors" identifying cross-circle brokers with canvas auto-focus |
| **📜 Milestones Chronicle & Docs<br>(Chronicles & Documents)** | Consolidates life intersections and milestones into a permanent, readable lifetime chronicle. | • Aggregates first contact, stage advances, anniversaries, fulfilled promises, and exchanges into an illuminated timeline<br>• One-click export to native SiYuan document (`/人脉回顾/📜 人脉交往编年史 · 姓名`) and copy Markdown<br>• Header "Anniversary Milestones Banner" highlighting N-year anniversaries with 1-click congratulations pre-fill<br>• RFC 5545 iCalendar (`.ics`) export for single contacts and the entire roster |
| **🎴 SVG Business Cards & Flashcards<br>(SVG Cards & Flashcards)** | High-fidelity vector visuals for social referrals and cognitive reinforcement. | • Pure SVG vector business cards (horizontal 600x380 / vertical 440x600 in 3 themes), 1-click copy code or download<br>• One-click generation of native SiYuan Riff Flashcards documents for spaced-repetition memory review with FSRS |
| **👥 Organizations & Kinship Trees<br>(Orgs & Kinships)** | Contextualizes contacts within their professional organizations and familial kinship backgrounds. | • Organization profiles with multi-tenure member career history<br>• 5-generation warm kinship trees (Parents/Spouse/Siblings/Children/Relatives) with 1-click profile drilldown |
| **🎪 Group Occasions & Gatherings Hub<br>(Occasions & Gatherings)** | Records group interactions, linking multi-attendee gatherings with personal profiles. | • Reverse-chronological timeline of summits, dinners, celebrations, salons, and trips<br>• Header metrics of total events, cumulative attendees, yearly count, and linked docs<br>• Attendee avatar chips with 1-click "Roster Drilldown" to filter and highlight attendees in roster |
| **🗑️ Roster Soft-Delete Trash Bin<br>(Trash Bin & Recovery)** | 30-day safety buffer preventing accidental data loss with seamless 1-click recovery. | • Snapshot preview of deleted contact names, phone, groups, and tags<br>• Live countdown badges with 3-day urgency highlighting<br>• 1-click database restoration and roster refresh; double-confirmation permanent purge |
| **🧹 Roster Filters, Tidy & Export<br>(Filters, Tidy & Export)** | Powers high-volume relationship management with seamless data interchange with mainstream office suites. | • Multi-dimensional cross filtering (cadence heat, lifecycle, city, company, profile gaps) with saved views<br>• "Batch Tidy Drawer": automated detection of unassigned contacts with smart group/tag suggestions<br>• Export RFC 4180 CSV with UTF-8 BOM (preventing Excel/WPS garbled text); 1-click copy Markdown table<br>• vCard 2.1/3.0/4.0 import and vCard 3.0 full-fidelity export (interchangeable with iOS/Android address books) |
| **🔒 Local-First Privacy & Ownership<br>(Privacy & Local-First)** | Complete data sovereignty: zero cloud lock-in, zero telemetry, full self-managed backup. | • 100% stored in local SiYuan workspace, zero external network dependency<br>• Web Lock critical sections with strict read-after-write verification<br>• Complete data migration bundle with diff preview (export/preview/current-first import) |

---

## This release: v0.6.59 (2026-10-30)

This release delivers the systemic visual overhaul, 23-module lossless data migration bundle, and complete end-to-end usability closeout:

- **Roster Soft-Delete Trash Bin Drawer (`TrashDrawer.svelte` & `PeopleView.svelte`)**: Integrated "Trash Bin" button in the contact roster toolbar; presents soft-deleted contacts with name, phone, group, and tag snapshots; real-time expiration countdown (`N days remaining`, with urgent badge within 3 days); 1-click restore to the database and roster; 1-click permanent purge with double-confirmation modal.
- **Group Occasions & Gatherings Hub Console (`OccasionsHubDialog.svelte` & `DashboardView.svelte`)**: Dedicated console on the home dashboard and roster toolbar for multi-attendee gatherings, dinners, weddings, summits, and business trips; metrics summary of total occasions, cumulative attendees, this year's count, and linked documents; filter by occasion type and keyword search; attendee chip ribbons with 1-click "Roster Drilldown" to highlight and filter attendees in the roster.
- **Lossless 23-Module Data Migration Bundle (`migration-bundle.ts`)**: Expanded migration coverage to all 23 self-managed modules, providing round-trip equivalence, non-destructive backup, current-first merge, and backward compatibility.
- **Systemic Visual & Perception Modernization**: Warm alabaster base (`#FAF8F6`) with floating pure white cards (2.5% lightness difference), two-color semantic division (Hermes warm cognac orange for actions vs. sunlight amber gold for positive metrics), 16px card radii with 9999px capsules, 4x primary metric hierarchy, and dark accent milestone cards (`#1C1815`).
- **End-to-End Usability & Lifecycle Hardening**: Added official SiYuan `openSetting` lifecycle hook, actionable retry for facts extraction failures, document strip organization and city drilldowns, and elimination of silent catch blocks.

Validation: `pnpm check` (0 errors / 0 warnings), all unit tests passing (**1037/1037 PASS**); 3-tier browser UI regressions passing (**529/529**); production build and release checks passed.

---

<details>
<summary><b>📜 Historical Release Notes (v0.6.58 ~ v0.5.2 Click to Expand)</b></summary>

### v0.6.58 · 2026-10-29
- Lunar calendar 30th day and Chinese New Year's Eve (12/30) adaptation to 29th; support for unknown-year `0000-MM-DD` anniversaries.
- Contact duplicate merge 10 entity stores completion (anniversaries, promises, kinships, preferences, scratchpads, itineraries, projects, cadences, lifecycle stages, aliases).
- Memory leak and timer cleanup governance; local timezone alignment; graph force-layout debouncing.

### v0.6.57 · 2026-10-29
- Multi-dimensional roster sort modes: added "By Interaction Depth" (`frequency`) and "By Date Added" (`created`).
- Anniversaries & Milestones Hub console (`AnniversariesHubDialog.svelte` & `DashboardView.svelte`) with tailored greetings and `.ics` export.

### v0.6.56 · 2026-10-29
- Unorganized contacts detection & inference engine (`domain/unorganized-tidy.ts`) deducing suggested groups and tags.
- Roster tidy drawer with 1-click batch adoption (`TidyDrawer.svelte` & `PeopleView.svelte`).

### v0.6.55 · 2026-10-29
- RFC 4180 CSV export with UTF-8 BOM (`exportContactsToCsv`) and Markdown table generator (`exportContactsToMarkdownTable`).
- Batch bar dual-channel export: 1-click `.csv` file download and 1-click Markdown table clipboard copy.

### v0.6.54 · 2026-10-29
- Project progression status lifecycle tracker (`active` ➔ `completed` ➔ `archived`) and collaborator filtering.
- Person detail project card interactive status switcher.

### v0.6.53 · 2026-10-29
- Contact detail header "Micro-Preferences Ribbon" extracting up to 4 high-priority preferences.
- Red-line taboos rendered with high-contrast alert styling for 1-second dining checks.

### v0.6.52 · 2026-10-29
- Batch update relationship lifecycle stages in roster with transition history tracking (`batchUpdatePersonLifecycleStages`).
- Batch toolbar modal supporting instant stage selection for all selected contacts.

### v0.6.51 · 2026-10-29
- Multi-dimensional cross-filtering by relationship heat levels (`heatLevel`) and saved custom views serialization.
- Roster filter drawer heat selector and dynamic condition chips.

### v0.6.50 · 2026-10-29
- Anniversary Milestones Banner & Congratulatory Flow extracting 14-day and today's milestones with N-year calculations.
- Automatic generation of tailored congratulatory greetings with 1-click pre-fill into interaction notes.

### v0.6.49 · 2026-10-29
- Mutual Reciprocity & Exchange Balance Audit comparing bilateral promises fulfillment and ledger balance.
- Dual-sided balance bar and 0–100 reciprocity index with maintenance advice.

### v0.6.48 · 2026-10-29
- Home dashboard Relationship Lifecycle Funnel Console computing maturity rates across the 5 stages.
- Interactive funnel bar with 1-click drilldown into roster filtering.

### v0.6.47 · 2026-10-29
- Network Hubs & Bridge Connectors topologic analysis identifying super-connectors and cross-domain brokers.
- Graph modal with community labels and 1-click canvas node centering.

### v0.6.46 · 2026-10-29
- Meeting & Visit Itineraries with interactive preparation checklists (documents, samples, gifts).
- 1-click "Complete & Log" pre-filling meeting notes; copy Markdown itinerary.

### v0.6.45 · 2026-10-29
- Relationship Cadence Cooling Radar & Reconnect Hub weighting VIPs and overdue days.
- Dashboard cooling alert dialog for immediate reconnection.

### v0.6.44 · 2026-10-29
- Reusable interaction note templates with 9 featured scenarios and dynamic variable inserter (`{{姓名}}`, `{{公司}}`, etc.).

### v0.6.43 · 2026-10-29
- Persona smart tag inference and quick single/batch adoption based on multi-dimensional facts.

### v0.6.42 · 2026-10-29
- Pre-Meeting Check Hub & Taboo Radar on the home dashboard.

### v0.6.41 ~ v0.5.2
For earlier release notes, please see the full [CHANGELOG](CHANGELOG.md).

</details>

---

## Install

Manual installation from GitHub Releases is currently recommended:

1. Download `package.zip` from the [latest stable Release](https://github.com/ai68298100/siyuan-contacts/releases/latest).
2. Extract its contents into `data/plugins/siyuan-contacts/` in your SiYuan workspace. `plugin.json` must be at that directory root.
3. Restart SiYuan and enable **Lv Contacts** under **Settings → Marketplace → Installed**.

Requires **SiYuan 3.8.5 or later**.

## Quick Start

1. Click the contacts icon in the top toolbar to follow the setup wizard and create the contacts notebook and database.
2. Add people, adopt existing notes, import `.vcf` / `.csv`, or paste text for automatic card recognition.
3. Maintain relationships, organizations, notes, social preferences, and commitments in person details.
4. Right-click in meeting notes and choose "Contacts: Capture people in this note" to record attendees and shared experiences.
5. Review birthdays, relationship temperatures, lifecycle funnels, and follow-ups on the home dashboard.

## Data and Privacy

Person documents, notes, and the contact database are SiYuan workspace content. Data is stored 100% locally with zero telemetry. AI recognition runs only upon explicit user action and communicates only with the AI service configured in your own SiYuan.

## Little Donkey Plugin Series

Each plugin is maintained independently and can be used on its own or alongside the others:

- [**小驴雷切 (Speed Switch)**](https://github.com/ai68298100/siyuan-speed-switch) — Unified workspace navigation and context switcher.
- [**小驴打卡 (Checkin)**](https://github.com/ai68298100/siyuan-checkin) — Local-first habits, goals, and daily streak review.
- **小驴人脉 (Lv Contacts)** (this project) — Personal relationship and network management.
- [**小驴拾遗 (Glean)**](https://github.com/ai68298100/siyuan-glean) — Clippings organizer, reading management, and review.
- [**小驴考试 (Exam)**](https://github.com/ai68298100/siyuan-exam) — Local question bank and exam practice.
- [**小驴管家 (Home)**](https://github.com/ai68298100/siyuan-home) — Household ledger and task management.
- [**小驴闪卡 (Cards)**](https://github.com/ai68298100/siyuan-lv-cards) — Spaced-repetition flashcards learning platform.
- [**小驴常用 (Common)**](https://github.com/ai68298100/xiaolv-common) — Quick snippets and reusable blocks.

## Development

Requires Node.js 24+ and pnpm 12.x.
Standard checks: `pnpm check`, `pnpm test`, `pnpm test:ui`, `pnpm test:ui:mobile`, `pnpm test:ui:host`, `pnpm build`, `pnpm check:release`.

[MIT License](LICENSE)
