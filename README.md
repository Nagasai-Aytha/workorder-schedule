# Work Order Schedule Timeline

Angular standalone implementation of a manufacturing ERP work-order scheduler with:
- Timeline grid with Day / Week / Month zoom
- Work-order bars with status badges and actions menu
- Create/Edit slide panel using Reactive Forms
- Overlap detection per work center
- Current-day indicator and horizontal timeline scrolling

## Tech Stack

- Angular `21` (works for Angular `17+` requirement)
- TypeScript strict mode
- SCSS
- Reactive Forms
- `@ng-select/ng-select` for status dropdown
- `@ng-bootstrap/ng-bootstrap` for datepicker
- `bootstrap` CSS (base styles for ng-bootstrap components)

## Setup

```bash
npm install
ng serve
```

Open: `http://localhost:4200`

## Implemented Requirements

1. Timeline grid:
- Fixed work-center column + horizontally scrollable timeline
- Current-day vertical indicator
- Day/Week/Month header rendering
- Row hover highlight

2. Work-order bars:
- Positioning from `startDate` and `endDate`
- Status chip (Open / In Progress / Complete / Blocked)
- Three-dot menu with Edit/Delete

3. Create/Edit panel:
- Slide-out panel
- Reactive form validation
- `ng-select` status picker
- `ngbDatepicker` start/end date fields
- Create and Save flows in one form

4. Validation:
- Required fields
- End date must be after start date
- Overlap detection on same work center (excluding currently edited order)

5. Data:
- 5 work centers
- 8 sample work orders
- All 4 statuses represented

## Bonus Implemented

- localStorage persistence for work orders
- Escape key closes panel
- Basic animation for panel and UI hover transitions
- `trackBy` optimization for row and bar loops

## Project Structure

- Main component:
  - `src/app/work-order-schedule/work-order-schedule.ts`
  - `src/app/work-order-schedule/work-order-schedule.html`
  - `src/app/work-order-schedule/work-order-schedule.scss`
- Decision logs:
  - `docs/ai-prompts.md`
  - `docs/trade-offs.md`

## Notes

- Date positioning is based on a visible date window per zoom level:
  - Day: `-14` to `+14` days around today
  - Week: `-60` to `+60` days
  - Month: `-180` to `+180` days
- Timescale changes recalculate width and header segments.

## Demo Video and Repository

- Loom video: 
- Public repository: 
