# MVP Spec — “My Inha” Personalized Student Dashboard

## 1. Problem

INHA students have access to a large amount of useful information, but it is spread across different websites and systems, such as the university portal, notice boards, scholarship pages, academic calendars, and department websites.

The problem is not a lack of information. **There is too much information, and students have to find out which information is relevant to them.**

Students often need to answer simple questions:

- What information is relevant to me?
- What do I need to do?
- When is the deadline?
- Where can I find the official information?

For international students and new students, navigating these systems can be even more difficult because of complicated websites, unfamiliar university procedures, and language barriers.

---

## 2. MVP Goal

**My Inha** provides one personalized dashboard that brings together the most important university information for each student.

Instead of showing students everything, the service focuses on:

> **“Show me what I need to know and what I need to do.”**

The MVP will demonstrate how university information can be collected, organized, and filtered according to a student's profile.

---

# 3. Target Users

The service is designed for **INHA students**, not only freshmen.

The MVP focuses particularly on information that can be personalized based on:

- College / major
- Year
- Enrollment status
- International student status
- Areas of interest

---

# 4. MVP Scope

The MVP consists of **one profile and three personalized information modules**.

| Module | MVP Behavior | Data Source | Out of MVP |
|---|---|---|---|
| **Profile** | Display basic student information such as name, major, year, student type, enrollment status | Mock/test profile data for MVP | Portal SSO integration, profile editing, GPA/transcript |
| **Personalized Announcements** | Show announcements relevant to the student's major, year, enrollment status, or student type | Official INHA public notice pages | Push notifications, comments, read/unread tracking |
| **Personalized Scholarships** | Show scholarships that match basic student attributes such as major, year, and international-student eligibility | Official INHA scholarship information | Online application, award tracking, financial calculations |
| **Deadlines** | Combine important dates from academic schedules, scholarships, and relevant announcements into one sorted list | Official academic calendar + announcement/scholarship data | Google/Outlook calendar sync, advanced reminder system |

---

# 5. Personalized Student Profile

For the MVP, the student profile will use **mock/test data** rather than depending on INHA Portal authentication.

Example:

```text
Name: Yamin
Major: Computer Engineering
Year: 1st Year
Status: Enrolled
Student Type: International
Interests: Scholarship, Academic
```

The profile is used only for personalization.

---

# 6. Personalized Announcements

Instead of showing every announcement, the system filters announcements based on the student's profile.

### Example

Student:

```text
Computer Engineering
1st Year
International Student
```

The system may show:

```text
📢 Important Announcements

1. 외국인 유학생 학사 안내
   → Relevant to international students

2. 컴퓨터공학과 행사 안내
   → Relevant to Computer Engineering students

3. 2026-2학기 휴학 신청 안내
   → Relevant to currently enrolled students
```

Announcements unrelated to the student are deprioritized or hidden.

Each announcement includes:

- Title
- Category
- Date
- Target audience
- Official source
- Link to the original page

---

# 7. Personalized Scholarships

Scholarships are matched using simple eligibility rules.

Example scholarship data:

```text
Scholarship A

Target:
- International students
- 1st–4th year
- All majors
- GPA 3.5+
```

Student profile:

```text
International student
1st year
Computer Engineering
```

The dashboard displays:

```text
🎓 Scholarship A

✓ International student
✓ 1st year
✓ Eligible major

Application period:
2026.09.20 – 2026.10.01

[View Official Information]
```

The MVP will use **simple attribute-based filtering**, not complex AI-based eligibility decisions.

The system should clearly state that eligibility shown by My Inha is a **preliminary match**, and students should verify the official scholarship requirements.

---

# 8. Unified Deadlines

Instead of making students check several pages, My Inha combines important dates into one list.

Example:

```text
🔔 Upcoming Deadlines

09/25   수강신청 관련 일정
09/28   장학금 신청 마감
10/01   외국인 학생 관련 신청 마감
10/15   중간고사 기간
```

The list is automatically sorted by date.

This gives students a simple answer to:

> **“What do I need to take care of soon?”**

---

# 9. Data Strategy

The MVP will prioritize **official INHA sources**.

Possible sources include:

- INHA university notice pages
- Academic information pages
- Scholarship pages
- Academic calendar
- Department notice pages
- International student information pages

### Data flow

```text
Official INHA Sources
        ↓
Data Collection
        ↓
Data Normalization
        ↓
Database
        ↓
Personalization Rules
        ↓
My Inha Dashboard
```

For the hackathon, only a **limited number of important official sources** will be integrated.

The goal is to prove the personalization concept rather than build a complete university-wide crawling system.

---

# 10. Data Reliability

Because university information can change or become unavailable, the system will include:

- Official source URL for each item
- Original publication/update date
- Last checked date where applicable
- Clear indication that information should be verified on the official source

If automatic data collection fails, the system should not silently present outdated information as current.

For the MVP, data can be manually verified and updated.

### Future improvement

```text
Official INHA Sources
        ↓
API / RSS / Crawler
        ↓
Automatic Update
        ↓
Validation
        ↓
Database
```

---

# 11. Portal / SSO Integration

INHA Portal contains authenticated student information, but the MVP will **not depend on Portal API or SSO integration**.

This is an important technical risk because a public API or accessible integration method has not yet been confirmed.

Therefore:

### MVP

```text
Normal Demo Login
       ↓
Mock Student Profile
       ↓
Personalization
```

### Future Version

```text
INHA SSO / Portal
       ↓
Verified Student Profile
       ↓
Personalized Dashboard
```

Portal integration can be explored later through official university cooperation or an approved integration method.

---

# 12. International Student Support

International students are an important target group, but multilingual translation will **not be a core MVP feature**.

The MVP will focus on making information easier to discover and understand through:

- Clear categories
- Simple summaries
- Personalized filtering
- Official source links
- Important deadlines

### Future Version

AI-assisted translation and simplified explanations could support Korean, English, and other languages.

---

# 13. MVP User Flow

```text
              My Inha
                 ↓
          Student Login
                 ↓
        Student Profile
                 ↓
     ┌───────────┴───────────┐
     ↓           ↓           ↓
    📢          🎓          🔔
  Notices    Scholarships  Deadlines
     │           │           │
     └───────────┴───────────┘
                 ↓
        Personalized Dashboard
```

The entire MVP should be accessible from **one main dashboard**.

---

# 14. Explicit Non-Goals

The MVP will NOT include:

- Course registration
- Tuition payment
- Grades or transcripts
- Online scholarship applications
- Scholarship award tracking
- Student profile editing
- Google/Outlook calendar synchronization
- Push notifications
- Mobile application
- Full university-wide automatic crawling
- Portal/SSO integration
- Advanced AI eligibility decisions

These can be considered for future versions.

---

# 15. Definition of Done

The MVP is complete when a student can:

1. Log into the demo.
2. See their basic student profile.
3. See announcements relevant to their profile.
4. See scholarships that match their basic attributes.
5. See important upcoming deadlines in one list.
6. Open the official source for each piece of information.
7. Understand why information is being shown to them.

### Final MVP principle

> **학교 정보를 더 많이 보여주는 것이 아니라, 학생에게 필요한 정보를 보여줍니다.**

**My Inha — 필요한 정보를 한곳에서, 나에게 맞게.**