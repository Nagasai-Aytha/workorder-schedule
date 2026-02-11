# Trade-offs and Decisions

## 1. Single-component implementation

- Decision: Keep timeline, grid math, and panel logic in one standalone component.
- Why: Faster delivery for challenge scope and easier end-to-end iteration during pixel passes.
- Trade-off: Lower long-term maintainability vs splitting into smaller components/services.

## 2. localStorage for persistence

- Decision: Persist work orders in `localStorage`.
- Why: Meets bonus persistence with minimal setup and no backend dependency.
- Trade-off: No multi-user consistency, no conflict resolution, and limited storage size.

## 3. Date-window sizing by zoom

- Decision: Use fixed windows around today:
  - Day: +/-14 days
  - Week: +/-60 days
  - Month: +/-180 days
- Why: Predictable performance and straightforward positioning logic.
- Trade-off: Not infinite-scroll; far historical/future planning requires range extension.

## 4. Overlap rule is inclusive

- Decision: Treat touching/same-day date intersections as overlap.
- Why: Prevents ambiguous visual collisions in a single-row timeline lane.
- Trade-off: Slightly stricter scheduling than exclusive-end models.

## 5. ng-bootstrap peer compatibility with Angular 21

- Decision: Keep required `@ng-bootstrap/ng-bootstrap` library and install with peer-resolution workaround.
- Why: Challenge requires ng-bootstrap datepicker usage.
- Trade-off: Dependency peer warning risk until upstream alignment.

## 6. Pixel-accuracy vs bundle/style budget

- Decision: Prioritize Sketch-like fidelity for panel and timeline tokens.
- Why: Design accuracy is a major evaluation factor.
- Trade-off: Larger component stylesheet and Angular budget warnings.
