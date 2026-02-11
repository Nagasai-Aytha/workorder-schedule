# AI Prompt Log

This file records the key AI prompts used to shape implementation decisions.

## Prompt: Timeline model and date math

```text
Design an Angular timeline for work orders with:
- fixed left work-center column
- horizontally scrollable date grid
- Day/Week/Month zoom levels
- create-date selection from click position

Return the date range model, date-to-pixel conversion, and scroll-offset handling.
```

## Prompt: Overlap validation strategy

```text
Given start/end dates and workCenterId, provide overlap detection rules for create/edit:
- prevent overlap within same work center
- exclude current order while editing
- treat same-day intersections as overlap
```

## Prompt: Reactive forms with required UI libraries

```text
Show best-practice integration of Angular Reactive Forms with:
- ng-select for status dropdown
- ngbDatepicker for start/end date fields

Include conversion helpers between NgbDateStruct and ISO date strings.
```

## Prompt: Pixel-tuning checklist for design handoff

```text
Create a practical checklist for pixel-tuning from Sketch:
- typography scale, spacing rhythm, border colors
- row/header heights and bar geometry
- drawer panel shadows, width, and form control states
```
