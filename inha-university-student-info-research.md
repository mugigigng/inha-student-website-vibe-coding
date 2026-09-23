# Inha University — Student Information Sources (University-Wide)

**Scope note:** This document covers Inha University's *university-wide* student information sources — the official English-language website, its portals, notice/news channels, and student-service pages — as distinct from the Jungseok Memorial Library, which has its own dedicated site and its own research document. **Library-specific information (catalog, borrowing, room booking, library technology, etc.) belongs in [`inha-libray-research.md`](inha-libray-research.md), not here**, and is intentionally not duplicated below. Where the university's own pages reference the library (e.g., as a campus landmark, or "Insurance/Health Services" for international students), this document notes the reference but defers details to the library document.

All findings below come from direct browsing of the official English-language site, **`https://eng.inha.ac.kr`**, starting from the homepage (`/eng/index.do`) supplied for this research, accessed **2026-09-22**. Where a claim rests on a specific page, that page's URL is cited. Items that could not be confirmed from this site are explicitly labeled "not found / no public source" rather than guessed.

---

## 1. Site Structure & Primary Navigation

`eng.inha.ac.kr` is Inha University's official English-language portal (there are separate Korean and Chinese sites — see §6). Its top-level navigation has six sections, each with its own sub-navigation:

| Section | Landing page |
|---|---|
| Programs | `/eng/3586/subview.do` |
| Research | `/eng/3603/subview.do` |
| Academics | `/eng/3679/subview.do` |
| International | `/eng/3710/subview.do` |
| Student Life | `/eng/3731/subview.do` |
| About Inha | `/eng/3762/subview.do` |

A full sitemap is published at `/eng/3806/subview.do`, and a global keyword search is available from the header on every page. [Sitemap, eng.inha.ac.kr, accessed 2026-09-22](https://eng.inha.ac.kr/eng/3806/subview.do)

"Programs" and "Research" are primarily for prospective students/faculty (college and department listings, research institutes) rather than day-to-day student information sources, so this document focuses on Academics, International, Student Life, and About Inha, plus the underlying IT systems that tie them together.

---

## 2. Official Notice & News Channels

Under **About Inha → Inha News** (`/eng/3777/subview.do`), the site groups several distinct information streams under tabs of the same bulletin-board system:

- **Notice** (`/eng/3777/subview.do`) — official administrative notices: leave-of-absence windows, certificate-of-admission application periods, visa/immigration reminders, part-time-work regulations, safety/scam warnings (e.g., voice-phishing warnings), etc. Rows are numbered sequentially (831+ as of this research pass) plus a small set of permanently pinned items. [Notice board, accessed 2026-09-22](https://eng.inha.ac.kr/eng/3777/subview.do)
- **News** (`/eng/3778/subview.do`) — PR/press-style stories (competition results, program launches, faculty/student achievements), each with a full article body, hit count, and author line. [News board, accessed 2026-09-22](https://eng.inha.ac.kr/eng/3778/subview.do)
- **Faculty Activity**, **Publications**, **Promotional Video**, and **Photo Gallery** — sibling tabs of the same "Inha News" hub, not individually inspected for this pass.

**Important technical caveat:** both the Notice and News boards render each row's link via an `onclick`/hidden-form JavaScript submission rather than a plain, stable `<a href>`. This means there is no reliable, durable URL for an individual notice or article that can be linked to from outside the site — only the board's own list URL is stable. Any integration (including the "University Notices" section of this project's showcase site) should link to the board itself and/or use a manually refreshed snapshot of recent titles, not attempt to deep-link individual rows. [Direct inspection, accessed 2026-09-22](https://eng.inha.ac.kr/eng/3777/subview.do)

---

## 3. Academic Information & Self-Service (Academics section)

Landing page: `/eng/3679/subview.do`. Sub-pages, per the sitemap and direct navigation: [Academics sitemap, accessed 2026-09-22](https://eng.inha.ac.kr/eng/3806/subview.do)

- **Academic Calendar** (`/eng/3679/subview.do`) — semester dates, with year-by-year navigation controls on the page itself.
- **Undergraduate Programs Bulletin** (`/eng/3681/subview.do`) — includes Course of Study, Course Registration, Retaking Courses, Summer/Winter Semester, and Examination and Grade Assessments as sub-topics.
- **Student-processed Academic Profile** (`/eng/3687/subview.do`) — covers self-service academic-record actions: Change of Major, Enrollment, Leave of Absence, Returning to School, Expulsion/Withdrawal, Readmission, Repetition, and Student Profile Rectification.
- **Secondary Major** (`/eng/3696/subview.do`) — Double Major, Minor, Interdisciplinary Major, Micromajor options.
- **Graduation/Certificate** (`/eng/3701/subview.do`) — Graduation requirements, the "Inha Graduation Certification System," and Certificate/Transcript issuance.
- **Scholarships** (`/eng/3705/subview.do`) — Types of Scholarships, Scholarship Guidelines, Application for Scholarships.

The "Change of Major" page explicitly states that applications are submitted **"through the portal system"** rather than through this informational site itself — confirming that `eng.inha.ac.kr` is a documentation/reference layer, while actual academic transactions happen on a separate internal system (identified in §5 below). [Change of Major, accessed 2026-09-22](https://eng.inha.ac.kr/eng/3687/subview.do)

---

## 4. International Student Services (International section)

Landing page: `/eng/3710/subview.do`, framed as the **"International Center."** Sub-pages: [International sitemap, accessed 2026-09-22](https://eng.inha.ac.kr/eng/3806/subview.do)

- **Introduction** (`/eng/3710/subview.do`) and **Staff** (`/eng/3711/subview.do`) — the International Center's own overview and staff directory.
- **Admission** (`/eng/3713/subview.do`) — split into Undergraduate, Graduate, and Language Training Center admissions.
- **Exchange Students** hub — a checklist-style set of pages aimed specifically at incoming exchange students, covering: Inha University & Incheon (orientation context), International Center Application, University Housing, Academic Calendar, **Insurance / Health Services**, Course Registration, Alien Registration / Student ID, Arrival and Airport Pick-up, Campus Map, and Orientation Week.
- **Overseas Partners** (`/eng/3727/subview.do`) and **Summer School** (`/eng/3728/subview.do`).

Note: "University Housing" here is the exchange-student-facing entry point into the same residence-hall system documented in §5 (On-campus Facilities → Residence Life); it was not independently re-verified as a separate system.

---

## 5. Student Life & Campus Services

Landing page: `/eng/3731/subview.do`. Three sub-hubs: [Student Life sitemap, accessed 2026-09-22](https://eng.inha.ac.kr/eng/3806/subview.do)

**Convenience Service** (`/eng/3731/subview.do`):
- Student ID Card (`/eng/3731/subview.do`), International Student ID Card (`/eng/3732/subview.do`), Student Insurance (`/eng/3733/subview.do`), Parking (`/eng/3734/subview.do`), ATM (`/eng/3735/subview.do`), IT Support (`/eng/3736/subview.do`), and Immigration & Visa (`/eng/3737/subview.do`).

**Student Activities** (`/eng/3739/subview.do`):
- Student Governing Bodies, Broadcasting Station/Newspaper (`/eng/3740/subview.do`), Club Activities (`/eng/3742/subview.do` — spanning Performance, Linguistics, Research, Society, Religion, Exhibition, Martial Arts, Ball Sports, Leisure, Volunteer Services, and a central Club Association), and Festivals (`/eng/3753/subview.do`).

**On-campus Facilities** (`/eng/3756/subview.do`):
- **Residence Life** (`/eng/3756/subview.do`) — links out to a **separate dormitory portal, `https://dormeng.inha.ac.kr/`** (opens in a new window), rather than hosting housing applications on the main site itself. [On-campus Facilities, accessed 2026-09-22](https://eng.inha.ac.kr/eng/3756/subview.do)
- **Health Center** (`/eng/3758/subview.do`).
- **Counseling Center/Human Rights Center** (`/eng/3759/subview.do`).

### IT Support — the actual student portal, email, and mobile systems

The **IT Support** page (`/eng/3736/subview.do`) is the single most important page found in this research: it is the only place on `eng.inha.ac.kr` that names and links the university's core online systems by URL. [IT Support, accessed 2026-09-22](https://eng.inha.ac.kr/eng/3736/subview.do)

- **Inha Portal System — `https://portal.inha.ac.kr`** — described on the page as covering "Academic administration, Electronic payment, Bulletin board, Knowledge management, Student portal, etc." This is the system referenced (without a URL) by the Academics section's "apply through the portal system" instruction (§3) — i.e., this is where students actually register for courses, submit academic-status requests, and handle payments, as opposed to `eng.inha.ac.kr` which only documents the *process*.
- **E-mail service — `https://cloud.inha.ac.kr/`** — official "E-mail INHA," available to school members.
- **Representative website — `https://www.inha.ac.kr`** — the university's main (Korean-language-first) site, described as covering general school information and "Inha Square" (an internal community feature). This is a different, larger site than the English-language `eng.inha.ac.kr` used for this research.
- **Mobile site — `http://m.inha.ac.kr`** — a mobile-formatted version of portal services, with companion apps distributed via the Play Store (and, per the page text, iOS).

The same page also documents smaller IT services: computer-room hours and rules, faculty software (S/W) rental, a campus Wi-Fi service (available inside all campus buildings), a process to request a static IP address, a process to request a departmental website account/subdomain under `inha.ac.kr`, and a link to campus information-security rules.

**Gap:** the exact name, look, and feature set of the `portal.inha.ac.kr` student portal, and of any dedicated learning-management-system (LMS) product (e.g., for course content/assignments as opposed to registration), were **not independently verified** — this research did not log into the portal, and no separate "LMS" or "e-class" product name was found anywhere on `eng.inha.ac.kr`. Treat "LMS" functionality as **unconfirmed**, not assumed absent.

---

## 6. About Inha — Institutional Information & Directories

Landing page: `/eng/3762/subview.do`. [About Inha sitemap, accessed 2026-09-22](https://eng.inha.ac.kr/eng/3806/subview.do)

- **University Ideals** (`/eng/3762/subview.do`) — Foundation Ideals and Educational Objectives.
- **Office of the President** (`/eng/3764/subview.do`) — President's Message, Curriculum Vitae, Past Presidents.
- **University Bodies** (`/eng/3768/subview.do`) — University Organizations and a Statistical Annual Report.
- **University History** (`/eng/3771/subview.do`) — "Traces" and "History" sub-pages.
- **Symbols of Inha** (`/eng/3774/subview.do`) — Logo, University Symbol.
- **Inha News** — see §2 above.
- **Campus Guide** — Buildings and On-Campus Landmarks. The landmarks list (In-Kung Pond, Ulimdol/Echo Stone, Matching Tree, the Main Building and Main Garden, Heidegger Woods, **Jungseok Memorial Library**, Flying Dragon Tower, Woonam Road, Woonam Aircraft, the Inha University Benchmark, Rocket Tower, Haeoreum Dongsan, the Sculpture of the First Six Departments, Hawaii-Inha Park, and the Hawaiian Compatriots Memorial Hall) includes the library as one campus landmark among many — for library detail, see the dedicated library research document, not this one.
- **Department Phonebook** (Faculty & Staff Search) — a searchable staff/faculty directory tool.
- **Visitors Guide** — Public Transportation and a Free Shuttle Bus Schedule.

Two sister-site links appear in the global header on every page: the main Korean-language site (`https://www.inha.ac.kr`) and a Chinese-language site (`http://cn.inha.ac.kr`), both opening in a new window. [Homepage header, accessed 2026-09-22](https://eng.inha.ac.kr/eng/index.do)

---

## 7. Summary Map — Where Students Actually Go for What

| Need | Where |
|---|---|
| Register for courses, check grades, pay tuition, submit academic-status forms | `portal.inha.ac.kr` (Inha Portal System) — **not** `eng.inha.ac.kr` itself |
| Read about *how* a process works (calendar, leave of absence, graduation, scholarships) | `eng.inha.ac.kr` → Academics |
| Official administrative notices (deadlines, warnings, visa reminders) | `eng.inha.ac.kr` → About Inha → Inha News → **Notice** |
| University PR/press stories | `eng.inha.ac.kr` → About Inha → Inha News → **News** |
| International/exchange-student logistics (housing, insurance, visa, arrival) | `eng.inha.ac.kr` → International → Exchange Students |
| University email | `cloud.inha.ac.kr` |
| Dormitory application | `dormeng.inha.ac.kr` |
| General campus/community info, "Inha Square" | `www.inha.ac.kr` (Korean-first main site) |
| Mobile access to the above | `m.inha.ac.kr` + companion apps |
| Faculty/staff contact lookup | `eng.inha.ac.kr` → About Inha → Department Phonebook |
| Library (catalog, seat booking, borrowing) | **Out of scope here** — see `inha-libray-research.md` |

---

## 8. Explicitly Unresolved / Not Found

Listed rather than guessed, per this project's research convention:

- The exact product/feature set of the Inha Portal System (`portal.inha.ac.kr`) beyond the one-line description on the IT Support page — not independently logged into or inspected.
- Whether a separate, named LMS (learning-management system) product exists for course content/assignments, as distinct from the registration/administration functions of the Portal System.
- Whether `eng.inha.ac.kr`'s content (calendars, notices, procedures) is a complete mirror of the Korean-language `www.inha.ac.kr`, or a reduced subset — not compared page-by-page.
- Login requirements/availability of `cloud.inha.ac.kr` webmail and `m.inha.ac.kr` mobile portal to non-enrolled users — not tested (this research did not attempt to log in anywhere).
- Why "Inha News" (About Inha section) surfaces a page titled "Notice" as its default/first tab rather than "News" — observed but not explained by any on-page copy.

---

## 9. Sources

All entries below are direct navigation of `eng.inha.ac.kr` performed for this research pass, accessed 2026-09-22:

- Homepage: [https://eng.inha.ac.kr/eng/index.do](https://eng.inha.ac.kr/eng/index.do)
- Sitemap: [https://eng.inha.ac.kr/eng/3806/subview.do](https://eng.inha.ac.kr/eng/3806/subview.do)
- Academics: [https://eng.inha.ac.kr/eng/3679/subview.do](https://eng.inha.ac.kr/eng/3679/subview.do), [Student-processed Academic Profile](https://eng.inha.ac.kr/eng/3687/subview.do)
- International: [https://eng.inha.ac.kr/eng/3710/subview.do](https://eng.inha.ac.kr/eng/3710/subview.do)
- Student Life: [https://eng.inha.ac.kr/eng/3731/subview.do](https://eng.inha.ac.kr/eng/3731/subview.do), [Student Activities](https://eng.inha.ac.kr/eng/3739/subview.do), [On-campus Facilities](https://eng.inha.ac.kr/eng/3756/subview.do), [IT Support](https://eng.inha.ac.kr/eng/3736/subview.do)
- About Inha: [https://eng.inha.ac.kr/eng/3762/subview.do](https://eng.inha.ac.kr/eng/3762/subview.do), [Inha News / Notice](https://eng.inha.ac.kr/eng/3777/subview.do), [Inha News / News](https://eng.inha.ac.kr/eng/3778/subview.do)

This document is a research showcase, not an official Inha University publication, and is not affiliated with Inha University.
