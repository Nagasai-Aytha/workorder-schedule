import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { WorkOrderDocument, WorkOrderScheduleComponent } from './work-order-schedule';

describe('WorkOrderScheduleComponent', () => {
  let component: WorkOrderScheduleComponent;
  let fixture: ComponentFixture<WorkOrderScheduleComponent>;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [WorkOrderScheduleComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(WorkOrderScheduleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  function addDays(base: Date, days: number): Date {
    const copy = new Date(base);
    copy.setDate(copy.getDate() + days);
    return copy;
  }

  it('should create with seeded work centers and work orders', () => {
    expect(component).toBeTruthy();
    expect(component.workCenters.length).toBeGreaterThan(0);
    expect(component.workOrders.length).toBeGreaterThan(0);
    expect(component.headerSegments.length).toBeGreaterThan(0);
  });

  it('should close panel on escape only when panel is open', () => {
    component.isPanelOpen = false;
    component.onEscapeKey();
    expect(component.isPanelOpen).toBe(false);

    component.isPanelOpen = true;
    component.onEscapeKey();
    expect(component.isPanelOpen).toBe(false);
  });

  it('should clear menu and close timescale on document click', () => {
    component.openMenuOrderId = 'wo1';
    component.isTimescaleOpen = true;
    component.onDocumentClick(new MouseEvent('click'));
    expect(component.openMenuOrderId).toBeNull();
    expect(component.isTimescaleOpen).toBe(false);
  });

  it('should open native date picker safely', () => {
    const stopPropagation = vi.fn();
    const focus = vi.fn();
    const showPicker = vi.fn();
    const input = { focus, showPicker } as unknown as HTMLInputElement;
    const event = { stopPropagation, currentTarget: input } as unknown as MouseEvent;

    component.openNativeDatePicker(event);
    expect(stopPropagation).toHaveBeenCalled();
    expect(focus).toHaveBeenCalled();
    expect(showPicker).toHaveBeenCalled();
  });

  it('should not throw when date picker input target is missing', () => {
    const stopPropagation = vi.fn();
    const event = { stopPropagation, currentTarget: null } as unknown as MouseEvent;
    component.openNativeDatePicker(event);
    expect(stopPropagation).toHaveBeenCalled();
  });

  it('should toggle and select timescale', () => {
    const toggleEvent = new MouseEvent('click');
    const toggleStopSpy = vi.spyOn(toggleEvent, 'stopPropagation');
    component.toggleTimescaleMenu(toggleEvent);
    expect(component.isTimescaleOpen).toBe(true);

    const selectEvent = new MouseEvent('click');
    const selectStopSpy = vi.spyOn(selectEvent, 'stopPropagation');
    component.selectTimescale('week', selectEvent);
    expect(component.timescaleMode).toBe('week');
    expect(component.isTimescaleOpen).toBe(false);
    expect(selectStopSpy).toHaveBeenCalled();
    expect(toggleStopSpy).toHaveBeenCalled();
  });

  it('should expose timescale and status helpers', () => {
    expect(component.getTimescaleLabel('month')).toBe('Month');
    expect(component.getStatusClass('open')).toBe('status-open');
    expect(component.getStatusLabel('blocked')).toBe('Blocked');
    expect(component.showStatusBadge(139)).toBe(false);
    expect(component.showStatusBadge(140)).toBe(true);
  });

  it('should build timeline metrics and separators', () => {
    expect(component.totalTimelineWidthPx).toBeGreaterThan(0);
    expect(component.timelineDays.length).toBeGreaterThan(0);
    expect(component.currentDayOffsetPx).toBeGreaterThanOrEqual(0);
    expect(component.monthSeparators.length).toBeGreaterThan(0);
  });

  it('should handle timeline click by opening create panel on computed date', () => {
    component.timelineGrid = {
      nativeElement: {
        getBoundingClientRect: () => ({ left: 100 })
      } as HTMLElement
    };
    component.timelineScroller = { nativeElement: { scrollLeft: 10 } as HTMLElement };
    const openCreatePanelSpy = vi.spyOn(component, 'openCreatePanel');
    const event = { clientX: 130 } as MouseEvent;

    component.onTimelineClick('wc1', event);
    expect(openCreatePanelSpy).toHaveBeenCalled();
    expect(openCreatePanelSpy.mock.calls[0][0]).toBe('wc1');
    expect(openCreatePanelSpy.mock.calls[0][1] instanceof Date).toBe(true);
  });

  it('should no-op timeline click when grid element is missing', () => {
    component.timelineGrid = undefined;
    const openCreatePanelSpy = vi.spyOn(component, 'openCreatePanel');
    component.onTimelineClick('wc1', new MouseEvent('click'));
    expect(openCreatePanelSpy).not.toHaveBeenCalled();
  });

  it('should open and close create panel with defaults', () => {
    const start = new Date(2026, 0, 10);
    component.openCreatePanel('wc2', start);

    expect(component.isPanelOpen).toBe(true);
    expect(component.panelMode).toBe('create');
    expect(component.selectedWorkCenterId).toBe('wc2');
    expect(component.workOrderForm.controls.startDate.value).toBe('2026-01-10');
    expect(component.workOrderForm.controls.endDate.value).toBe('2026-01-17');

    component.closePanel();
    expect(component.isPanelOpen).toBe(false);
    expect(component.selectedWorkOrderId).toBeNull();
  });

  it('should open edit panel and preload form values', () => {
    const order = component.workOrders[0];
    const stopEvent = new MouseEvent('click');
    const stopSpy = vi.spyOn(stopEvent, 'stopPropagation');

    component.openEditPanel(order, stopEvent);

    expect(component.isPanelOpen).toBe(true);
    expect(component.panelMode).toBe('edit');
    expect(component.selectedWorkOrderId).toBe(order.docId);
    expect(component.selectedWorkCenterId).toBe(order.data.workCenterId);
    expect(component.workOrderForm.controls.name.value).toBe(order.data.name);
    expect(stopSpy).toHaveBeenCalled();
  });

  it('should toggle order menu and expose isMenuOpen', () => {
    const evt = new MouseEvent('click');
    const stopSpy = vi.spyOn(evt, 'stopPropagation');

    component.toggleOrderMenu('wo1', evt);
    expect(component.isMenuOpen('wo1')).toBe(true);
    component.toggleOrderMenu('wo1', evt);
    expect(component.isMenuOpen('wo1')).toBe(false);
    expect(stopSpy).toHaveBeenCalled();
  });

  it('should delete work order and persist', () => {
    const target = component.workOrders[0];
    const initial = component.workOrders.length;
    const stopEvent = new MouseEvent('click');
    const stopSpy = vi.spyOn(stopEvent, 'stopPropagation');

    component.deleteWorkOrder(target, stopEvent);
    expect(component.workOrders.length).toBe(initial - 1);
    expect(component.workOrders.some((o) => o.docId === target.docId)).toBe(false);
    expect(stopSpy).toHaveBeenCalled();
  });

  it('should block submit when form is invalid', () => {
    component.openCreatePanel('wc1', new Date());
    component.workOrderForm.controls.name.setValue('');

    component.onSubmit();
    expect(component.workOrderForm.controls.name.touched).toBe(true);
  });

  it('should block submit when end date is before start date', () => {
    component.openCreatePanel('wc1', new Date());
    component.workOrderForm.patchValue({
      name: 'Bad range',
      startDate: '2026-01-20',
      endDate: '2026-01-10'
    });

    component.onSubmit();
    expect(component.overlapError).toContain('End date must be after start date.');
  });

  it('should block submit when overlap exists for same work center', () => {
    const existing = component.workOrders.find((o) => o.data.workCenterId === 'wc1') as WorkOrderDocument;
    component.openCreatePanel('wc1', new Date());
    component.workOrderForm.patchValue({
      name: 'Overlap attempt',
      startDate: existing.data.startDate,
      endDate: existing.data.endDate
    });

    component.onSubmit();
    expect(component.overlapError).toContain('overlaps with an existing order');
  });

  it('should create a new work order on valid submit', () => {
    const initial = component.workOrders.length;
    component.openCreatePanel('wc3', new Date(2099, 0, 1));
    component.workOrderForm.patchValue({
      name: '  New WO  ',
      status: 'complete',
      startDate: '2099-01-01',
      endDate: '2099-01-10'
    });

    component.onSubmit();

    expect(component.workOrders.length).toBe(initial + 1);
    const created = component.workOrders[component.workOrders.length - 1];
    expect(created.data.name).toBe('New WO');
    expect(created.data.workCenterId).toBe('wc3');
    expect(component.isPanelOpen).toBe(false);
  });

  it('should update an existing order on edit submit', () => {
    const target = component.workOrders[0];
    component.openEditPanel(target);
    component.workOrderForm.patchValue({
      name: `${target.data.name} Updated`,
      status: 'blocked',
      startDate: target.data.startDate,
      endDate: target.data.endDate
    });

    component.onSubmit();
    const updated = component.workOrders.find((o) => o.docId === target.docId) as WorkOrderDocument;
    expect(updated.data.name).toContain('Updated');
    expect(updated.data.status).toBe('blocked');
  });

  it('should validate utility and trackBy helpers', () => {
    expect(component.trackById(0, { docId: 'x' })).toBe('x');
    const sampleLayout = component.getVisualWorkOrdersForCenter(component.workCenters[0].docId)[0];
    if (sampleLayout) {
      expect(component.trackByLayout(0, sampleLayout)).toBe(sampleLayout.order.docId);
      expect(component.getBarTopPx(sampleLayout.lane)).toBeGreaterThanOrEqual(component.rowPaddingPx);
    } else {
      expect(component.getBarTopPx(0)).toBe(component.rowPaddingPx);
    }
    expect(component.getRowHeight('missing')).toBe(component.rowMinHeightPx);
    expect(component.getVisualWorkOrdersForCenter('missing')).toEqual([]);
    expect(component.calculatePosition(component.workOrders[0]).widthPx).toBeGreaterThan(0);
  });

  it('should parse valid and invalid ISO dates via private helper', () => {
    const valid = (component as any).isoStringToDate('2026-02-03') as Date | null;
    const invalid = (component as any).isoStringToDate('bad') as Date | null;
    expect(valid instanceof Date).toBe(true);
    expect(invalid).toBeNull();
  });

  it('should resolve marker date fallback when outside visible range', () => {
    const markerWithin = (component as any).getMarkerDate() as Date;
    expect(markerWithin instanceof Date).toBe(true);

    component.visibleStartDate = new Date(2050, 0, 1);
    component.visibleEndDate = new Date(2050, 0, 2);
    const fallback = (component as any).getMarkerDate() as Date;
    expect(fallback.getFullYear()).toBe(component.fallbackMarkerDate.getFullYear());
  });

  it('should center marker date only when timeline scroller exists', () => {
    component.timelineScroller = undefined;
    expect(() => (component as any).centerOnMarkerDate()).not.toThrow();

    component.timelineScroller = {
      nativeElement: { clientWidth: 300, scrollLeft: 0 } as HTMLElement
    };
    (component as any).centerOnMarkerDate();
    expect(component.timelineScroller.nativeElement.scrollLeft).toBeGreaterThanOrEqual(0);
  });

  it('should compute layout lanes for overlapping orders', () => {
    const base = new Date(2030, 0, 1);
    const toIso = (d: Date) => (component as any).toIsoDate(d);
    component.workCenters = [{ docId: 'wc-test', docType: 'workCenter', data: { name: 'Test WC' } }];
    component.workOrders = [
      {
        docId: 'a',
        docType: 'workOrder',
        data: {
          name: 'A',
          workCenterId: 'wc-test',
          status: 'open',
          startDate: toIso(base),
          endDate: toIso(addDays(base, 10))
        }
      },
      {
        docId: 'b',
        docType: 'workOrder',
        data: {
          name: 'B',
          workCenterId: 'wc-test',
          status: 'open',
          startDate: toIso(addDays(base, 3)),
          endDate: toIso(addDays(base, 12))
        }
      }
    ];

    (component as any).rebuildVisualLayouts();
    const layouts = component.getVisualWorkOrdersForCenter('wc-test');
    expect(layouts.length).toBe(2);
    expect(layouts[0].lane).not.toBe(layouts[1].lane);
    expect(component.getRowHeight('wc-test')).toBeGreaterThan(component.rowMinHeightPx);
  });

  it('should load from local storage when valid and remove corrupt storage', () => {
    const stored: WorkOrderDocument[] = [
      {
        docId: 'stored-1',
        docType: 'workOrder',
        data: {
          name: 'Stored',
          workCenterId: 'wc1',
          status: 'open',
          startDate: '2026-01-01',
          endDate: '2026-01-10'
        }
      }
    ];
    localStorage.setItem(component.storageKey, JSON.stringify(stored));
    (component as any).loadData();
    expect(component.workOrders[0].docId).toBe('stored-1');

    localStorage.setItem(component.storageKey, '{bad-json');
    (component as any).loadData();
    expect(localStorage.getItem(component.storageKey)).not.toBe('{bad-json');
  });

  it('should render work-order bars with width positioning bindings', () => {
    fixture.detectChanges();
    const bar = fixture.nativeElement.querySelector('.work-order-bar') as HTMLElement | null;
    expect(bar).toBeTruthy();
    expect(bar?.style.width).toMatch(/px/);
  });

  it('should call openNativeDatePicker when start date input is clicked', () => {
    const pickerSpy = vi.spyOn(component, 'openNativeDatePicker');
    fixture.detectChanges();
    const startDateInput = fixture.nativeElement.querySelector('#start-date') as HTMLInputElement;
    startDateInput.click();
    expect(pickerSpy).toHaveBeenCalled();
  });

  it('should show start date validation message when touched and invalid', () => {
    component.openCreatePanel('wc1', new Date());
    component.workOrderForm.controls.startDate.setValue('');
    component.workOrderForm.controls.startDate.markAsTouched();
    fixture.detectChanges();

    const content = fixture.nativeElement.textContent as string;
    expect(content).toContain('Start date is required.');
  });
});
