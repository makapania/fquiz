# FQuiz - Feature Requests and Ideas

This document tracks feature ideas and enhancements for FQuiz.

---

## Search and Discovery

### Search Quiz and Flashcard Titles
- **Description:** Users need to be able to search through quiz and flashcard sets by title
- **Status:** Pending
- **Priority:** High
- **Implementation Notes:**
  - Add search bar to /sets page
  - Filter sets by title match
  - Consider fuzzy search for better UX

### Unique Set Identifiers
- **Description:** Generate a unique 4-digit identifier for each quiz or flashcard set
- **Format:**
  - Quizzes: `Q####` (e.g., Q1234)
  - Flashcards: `F####` (e.g., F5678)
- **Status:** Pending
- **Priority:** Medium
- **Implementation Notes:**
  - Generate on set creation
  - Handle collisions (multiple sets with same number allowed, search returns all matches)
  - Display prominently on set pages
  - Add to search functionality
  - Makes sharing easier (e.g., "Try quiz Q1234")

---

## User Management

### My Sets Page with Delete Capability
- **Description:** Users need a dedicated page to view and manage only their own sets
- **Status:** Pending (Detailed plan exists in HANDOFF_SESSION_2025-10-26.md)
- **Priority:** High
- **Features:**
  - View only sets created by logged-in user
  - Delete own sets with confirmation dialog
  - Filter by type (All/Quizzes/Flashcards)
  - Sort by date, title, status
  - Display set stats (question/card count, published status)

---

## Branding and UX

### FunkyHom Mascot Integration
- **Description:** Integrate the funkyhom.png mascot image across the application
- **Status:** Pending (Detailed plan exists in HANDOFF_SESSION_2025-10-26.md)
- **Priority:** Medium
- **Implementation:**
  - Small logo next to "FQuiz" on welcome page
  - Quiz results page integration:
    - 100% score: Full color, large (120x120), pulse animation, "TOO COOL FOR SCHOOL!"
    - <100% score: Grayscale, small (80x80), muted, "SUBOPTIMAL"

---

## Notes
- Features will be added to this document as they are identified
- Priority levels: High, Medium, Low
- Status: Pending, In Progress, Completed, On Hold
