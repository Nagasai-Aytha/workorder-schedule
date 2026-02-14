import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, Injectable, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import {
  NgbDateAdapter,
  NgbDateParserFormatter,
  NgbDateStruct,
  NgbDatepickerModule,
  NgbInputDatepicker
} from '@ng-bootstrap/ng-bootstrap';
import {
  SAMPLE_WORK_CENTERS,
  SAMPLE_WORK_ORDER_SEEDS
} from './work-order-schedule.data';

export interface WorkCenterDocument {
  docId: string;
  docType: 'workCenter';
  data: {
    name: string;
  };
}

export interface WorkOrderDocument {
  docId: string;
  docType: 'workOrder';
  data: {
    name: string;
    workCenterId: string;
    status: WorkOrderStatus;
    startDate: string;
    endDate: string;
  };
}

export type WorkOrderStatus = 'open' | 'in-progress' | 'complete' | 'blocked';
export type TimescaleMode = 'day' | 'week' | 'month';

interface HeaderSegment {
  key: string;
  label: string;
  width: number;
  isCurrent?: boolean;
}

interface StatusOption {
  value: WorkOrderStatus;
  label: string;
}

interface VisualWorkOrderLayout {
  order: WorkOrderDocument;
  leftPx: number;
  widthPx: number;
  lane: number;
}

@Injectable()
class IsoDateAdapter extends NgbDateAdapter<string> {
  override fromModel(value: string | null): NgbDateStruct | null {
    if (!value) {
      return null;
    }
    const [year, month, day] = value.split('-').map(Number);
    if (!year || !month || !day) {
      return null;
    }
    return { year, month, day };
  }

  override toModel(date: NgbDateStruct | null): string | null {
    if (!date) {
      return null;
    }
    const month = String(date.month).padStart(2, '0');
    const day = String(date.day).padStart(2, '0');
    return `${date.year}-${month}-${day}`;
  }
}

@Injectable()
class IsoDateParserFormatter extends NgbDateParserFormatter {
  override parse(value: string): NgbDateStruct | null {
    if (!value) {
      return null;
    }
    const [year, month, day] = value.trim().split('-').map(Number);
    if (!year || !month || !day) {
      return null;
    }
    return { year, month, day };
  }

  override format(date: NgbDateStruct | null): string {
    if (!date) {
      return '';
    }
    const month = String(date.month).padStart(2, '0');
    const day = String(date.day).padStart(2, '0');
    return `${date.year}-${month}-${day}`;
  }
}

@Component({
  selector: 'app-work-order-schedule',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, NgSelectModule, NgbDatepickerModule],
  templateUrl: './work-order-schedule.html',
  styleUrl: './work-order-schedule.scss',
  providers: [
    { provide: NgbDateAdapter, useClass: IsoDateAdapter },
    { provide: NgbDateParserFormatter, useClass: IsoDateParserFormatter }
  ]
})
export class WorkOrderScheduleComponent implements OnInit {
  @ViewChild('timelineScroller') timelineScroller?: ElementRef<HTMLElement>;
  @ViewChild('timelineGrid') timelineGrid?: ElementRef<HTMLElement>;
  @ViewChild('slidePanel') slidePanel?: ElementRef<HTMLElement>;
  @ViewChild('startDatePicker') startDatePicker?: NgbInputDatepicker;
  @ViewChild('endDatePicker') endDatePicker?: NgbInputDatepicker;

  // @upgrade Move persistence and CRUD to a dedicated data service/repository.
  readonly storageKey = 'work-order-schedule-v3';

  workCenters: WorkCenterDocument[] = [];
  workOrders: WorkOrderDocument[] = [];

  timescaleMode: TimescaleMode = 'month';
  pxPerDay = 3;
  visibleStartDate = new Date();
  visibleEndDate = new Date();
  headerSegments: HeaderSegment[] = [];
  readonly fallbackMarkerDate = new Date(2024, 8, 10);
  readonly rowPaddingPx = 9;
  readonly rowGapPx = 4;
  readonly barHeightPx = 30;
  readonly barMinWidthPx = 56;
  readonly rowMinHeightPx = 48;

  isPanelOpen = false;
  panelMode: 'create' | 'edit' = 'create';
  selectedWorkCenterId = '';
  selectedWorkOrderId: string | null = null;
  overlapError = '';
  openMenuOrderId: string | null = null;
  isTimescaleOpen = false;
  readonly workOrderForm;
  readonly timescaleOptions: Array<{ value: TimescaleMode; label: string }> = [
    { value: 'day', label: 'Day' },
    { value: 'week', label: 'Week' },
    { value: 'month', label: 'Month' }
  ];

  readonly statusOptions: StatusOption[] = [
    { value: 'open', label: 'Open' },
    { value: 'in-progress', label: 'In Progress' },
    { value: 'complete', label: 'Complete' },
    { value: 'blocked', label: 'Blocked' }
  ];
  private readonly layoutsByCenter = new Map<string, VisualWorkOrderLayout[]>();
  private readonly rowHeightsByCenter = new Map<string, number>();
  private activeDatepicker: NgbInputDatepicker | null = null;

  constructor(private readonly fb: FormBuilder) {
    this.workOrderForm = this.fb.group({
      name: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(80)]),
      status: this.fb.nonNullable.control<WorkOrderStatus>('open', Validators.required),
      startDate: this.fb.nonNullable.control(this.toIsoDate(new Date()), Validators.required),
      endDate: this.fb.nonNullable.control(this.toIsoDate(this.addDays(new Date(), 7)), Validators.required)
    });
  }

  ngOnInit(): void {
    this.setTimelineRange(this.timescaleMode);
    this.loadData();
    this.rebuildHeaderSegments();
    this.rebuildVisualLayouts();
    setTimeout(() => this.centerOnMarkerDate(), 0);
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.isPanelOpen) {
      this.closePanel();
    }
  }

  @HostListener('document:keydown', ['$event'])
  onDocumentKeydown(event: KeyboardEvent): void {
    if (!this.isPanelOpen || event.key !== 'Tab') {
      return;
    }

    const panel = this.slidePanel?.nativeElement;
    const active = document.activeElement as HTMLElement | null;
    if (panel && (!active || !panel.contains(active))) {
      event.preventDefault();
      panel.focus();
      return;
    }

    const focusable = this.getPanelFocusableElements();
    if (focusable.length === 0) {
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
      return;
    }

    if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    this.openMenuOrderId = null;
    this.isTimescaleOpen = false;
  }

  @HostListener('document:pointerdown', ['$event'])
  onDocumentPointerDown(event: PointerEvent): void {
    const target = event.target as HTMLElement | null;
    const clickedInsideDatepicker =
      !!target?.closest('.ngb-dp') || !!target?.closest('.date-picker-input');
    if (!clickedInsideDatepicker) {
      this.closeAllDatePickers();
    }
  }

  openDatePicker(datepicker: NgbInputDatepicker, event?: Event): void {
    event?.stopPropagation();
    if (this.activeDatepicker && this.activeDatepicker !== datepicker) {
      this.activeDatepicker.close();
    }
    if (!datepicker.isOpen()) {
      datepicker.open();
    }
    this.activeDatepicker = datepicker;
  }

  closeDatePicker(datepicker: NgbInputDatepicker): void {
    if (datepicker.isOpen()) {
      datepicker.close();
    }
    if (this.activeDatepicker === datepicker) {
      this.activeDatepicker = null;
    }
  }

  get totalTimelineWidthPx(): number {
    return this.getDateDiffInDays(this.visibleStartDate, this.visibleEndDate) * this.pxPerDay;
  }

  get currentDayOffsetPx(): number {
    return this.clampOffset(this.dateToOffsetPx(this.getMarkerDate()));
  }

  get timelineDays(): number[] {
    const days = this.getDateDiffInDays(this.visibleStartDate, this.visibleEndDate);
    return Array.from({ length: days }, (_, index) => index);
  }

  get monthSeparators(): Array<{ left: number }> {
    const separators: Array<{ left: number }> = [];
    let cursor = new Date(this.visibleStartDate.getFullYear(), this.visibleStartDate.getMonth(), 1);
    
    while (cursor < this.visibleEndDate) {
      const next = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
      if (next > this.visibleStartDate && next <= this.visibleEndDate) {
        const left = this.dateToOffsetPx(next);
        separators.push({ left });
      }
      cursor = next;
    }
    
    return separators;
  }

  changeTimescale(mode: TimescaleMode): void {
    this.timescaleMode = mode;
    this.isTimescaleOpen = false;
    this.setTimelineRange(mode);
    this.rebuildHeaderSegments();
    this.rebuildVisualLayouts();
    setTimeout(() => this.centerOnMarkerDate(), 0);
  }

  getTimescaleLabel(mode: TimescaleMode): string {
    return this.timescaleOptions.find((option) => option.value === mode)?.label ?? 'Month';
  }

  toggleTimescaleMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.isTimescaleOpen = !this.isTimescaleOpen;
  }

  selectTimescale(mode: TimescaleMode, event: MouseEvent): void {
    event.stopPropagation();
    this.changeTimescale(mode);
  }

  trackById(index: number, item: { docId: string }): string {
    return item.docId;
  }

  getVisualWorkOrdersForCenter(centerId: string): VisualWorkOrderLayout[] {
    return this.layoutsByCenter.get(centerId) ?? [];
  }

  getRowHeight(centerId: string): number {
    return this.rowHeightsByCenter.get(centerId) ?? this.rowMinHeightPx;
  }

  getBarTopPx(lane: number): number {
    return this.rowPaddingPx + lane * (this.barHeightPx + this.rowGapPx);
  }

  showStatusBadge(widthPx: number): boolean {
    return widthPx >= 140;
  }

  trackByLayout(index: number, item: VisualWorkOrderLayout): string {
    return item.order.docId;
  }

  calculatePosition(order: WorkOrderDocument): { leftPx: number; widthPx: number } {
    const start = new Date(order.data.startDate);
    const end = new Date(order.data.endDate);
    const leftPx = this.clampOffset(this.dateToOffsetPx(start));
    const widthPx = Math.max(this.getDateDiffInDays(start, end) * this.pxPerDay, this.barMinWidthPx);
    return {
      leftPx,
      widthPx
    };
  }

  getStatusClass(status: WorkOrderStatus): string {
    return `status-${status}`;
  }

  getStatusLabel(status: WorkOrderStatus): string {
    return this.statusOptions.find((item) => item.value === status)?.label ?? status;
  }

  onTimelineClick(workCenterId: string, event: MouseEvent): void {
    if (!this.timelineGrid?.nativeElement) {
      return;
    }

    const gridRect = this.timelineGrid.nativeElement.getBoundingClientRect();
    const scrollLeft = this.timelineScroller?.nativeElement.scrollLeft ?? 0;
    const relativeX = event.clientX - gridRect.left + scrollLeft;
    const dayOffset = Math.max(0, Math.floor(relativeX / this.pxPerDay));
    const clickedDate = this.addDays(this.visibleStartDate, dayOffset);

    this.openCreatePanel(workCenterId, clickedDate);
  }

  toggleOrderMenu(orderId: string, event: MouseEvent): void {
    event.stopPropagation();
    this.openMenuOrderId = this.openMenuOrderId === orderId ? null : orderId;
  }

  openCreatePanel(workCenterId: string, startDate: Date): void {
    this.panelMode = 'create';
    this.selectedWorkOrderId = null;
    this.selectedWorkCenterId = workCenterId;
    this.overlapError = '';
    this.openMenuOrderId = null;

    this.workOrderForm.reset({
      name: '',
      status: 'open',
      startDate: this.toIsoDate(startDate),
      endDate: this.toIsoDate(this.addDays(startDate, 7))
    });

    this.isPanelOpen = true;
  }

  openEditPanel(order: WorkOrderDocument, event?: MouseEvent): void {
    event?.stopPropagation();
    this.panelMode = 'edit';
    this.selectedWorkOrderId = order.docId;
    this.selectedWorkCenterId = order.data.workCenterId;
    this.overlapError = '';
    this.openMenuOrderId = null;

    this.workOrderForm.reset({
      name: order.data.name,
      status: order.data.status,
      startDate: order.data.startDate,
      endDate: order.data.endDate
    });

    this.isPanelOpen = true;
  }

  closePanel(): void {
    this.closeAllDatePickers();
    this.isPanelOpen = false;
    this.overlapError = '';
    this.selectedWorkOrderId = null;
  }

  deleteWorkOrder(order: WorkOrderDocument, event?: MouseEvent): void {
    event?.stopPropagation();
    this.openMenuOrderId = null;
    this.workOrders = this.workOrders.filter((item) => item.docId !== order.docId);
    this.rebuildVisualLayouts();
    this.persistWorkOrders();
  }

  onSubmit(): void {
    if (this.workOrderForm.invalid) {
      this.workOrderForm.markAllAsTouched();
      return;
    }

    const startDate = this.isoStringToDate(this.workOrderForm.controls.startDate.value);
    const endDate = this.isoStringToDate(this.workOrderForm.controls.endDate.value);
    if (!startDate || !endDate) {
      this.overlapError = 'Please enter valid start and end dates.';
      return;
    }
    if (endDate <= startDate) {
      this.overlapError = 'End date must be after start date.';
      return;
    }

    if (this.hasOverlap(startDate, endDate, this.selectedWorkCenterId, this.selectedWorkOrderId)) {
      this.overlapError =
        'This work order overlaps with an existing order on the same work center.';
      return;
    }

    const payload = {
      name: this.workOrderForm.controls.name.value.trim(),
      status: this.workOrderForm.controls.status.value,
      startDate: this.toIsoDate(startDate),
      endDate: this.toIsoDate(endDate)
    };

    if (this.panelMode === 'create') {
      const newOrder: WorkOrderDocument = {
        docId: `wo-${Date.now()}`,
        docType: 'workOrder',
        data: {
          ...payload,
          workCenterId: this.selectedWorkCenterId
        }
      };
      this.workOrders = [...this.workOrders, newOrder];
    } else {
      this.workOrders = this.workOrders.map((order) =>
        order.docId === this.selectedWorkOrderId
          ? {
              ...order,
              data: {
                ...order.data,
                ...payload
              }
            }
          : order
      );
    }

    this.rebuildVisualLayouts();
    this.persistWorkOrders();
    this.closePanel();
  }

  isMenuOpen(orderId: string): boolean {
    return this.openMenuOrderId === orderId;
  }

  private loadData(): void {
    this.workCenters = this.getSampleWorkCenters();
    const stored = localStorage.getItem(this.storageKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as WorkOrderDocument[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.workOrders = parsed;
          return;
        }
      } catch {
        localStorage.removeItem(this.storageKey);
      }
    }

    this.workOrders = this.getSampleWorkOrders();
    this.persistWorkOrders();
  }

  private persistWorkOrders(): void {
    localStorage.setItem(this.storageKey, JSON.stringify(this.workOrders));
  }

  private rebuildVisualLayouts(): void {
    this.layoutsByCenter.clear();
    this.rowHeightsByCenter.clear();

    this.workCenters.forEach((center) => {
      const orders = this.workOrders
        .filter((workOrder) => workOrder.data.workCenterId === center.docId)
        .sort((a, b) => a.data.startDate.localeCompare(b.data.startDate));

      const laneRightBoundaries: number[] = [];
      const layouts: VisualWorkOrderLayout[] = [];

      orders.forEach((order) => {
        const position = this.calculatePosition(order);
        const rightPx = position.leftPx + position.widthPx;
        let lane = laneRightBoundaries.findIndex((laneRightPx) => position.leftPx >= laneRightPx);
        if (lane === -1) {
          lane = laneRightBoundaries.length;
          laneRightBoundaries.push(rightPx);
        } else {
          laneRightBoundaries[lane] = rightPx;
        }

        layouts.push({
          order,
          leftPx: position.leftPx,
          widthPx: position.widthPx,
          lane
        });
      });

      const lanes = Math.max(laneRightBoundaries.length, 1);
      const rowHeight =
        this.rowPaddingPx * 2 + lanes * this.barHeightPx + (lanes - 1) * this.rowGapPx;
      this.layoutsByCenter.set(center.docId, layouts);
      this.rowHeightsByCenter.set(center.docId, Math.max(rowHeight, this.rowMinHeightPx));
    });
  }

  private hasOverlap(
    startDate: Date,
    endDate: Date,
    workCenterId: string,
    excludedOrderId: string | null
  ): boolean {
    const start = this.startOfDay(startDate).getTime();
    const end = this.startOfDay(endDate).getTime();

    // Inclusive range comparison so same-day intersections are rejected.
    // @upgrade Allow configurable overlap policy (inclusive vs exclusive end date).
    return this.workOrders.some((order) => {
      if (order.data.workCenterId !== workCenterId) {
        return false;
      }
      if (excludedOrderId && order.docId === excludedOrderId) {
        return false;
      }

      const orderStart = this.startOfDay(new Date(order.data.startDate)).getTime();
      const orderEnd = this.startOfDay(new Date(order.data.endDate)).getTime();
      return start <= orderEnd && end >= orderStart;
    });
  }

  private setTimelineRange(mode: TimescaleMode): void {
    const today = this.startOfDay(new Date());
    const config: Record<TimescaleMode, { pxPerDay: number; pastDays: number; futureDays: number }> =
      {
        day: { pxPerDay: 24, pastDays: 14, futureDays: 14 },
        week: { pxPerDay: 10, pastDays: 60, futureDays: 60 },
        month: { pxPerDay: 3, pastDays: 180, futureDays: 180 }
      };

    const selected = config[mode];
    // @upgrade Add infinite horizontal scrolling by dynamically extending both edges.
    this.pxPerDay = selected.pxPerDay;
    this.visibleStartDate = this.addDays(today, -selected.pastDays);
    this.visibleEndDate = this.addDays(today, selected.futureDays + 1);
  }

  private rebuildHeaderSegments(): void {
    if (this.timescaleMode === 'day') {
      this.headerSegments = this.buildDayHeaders();
      return;
    }
    if (this.timescaleMode === 'week') {
      this.headerSegments = this.buildWeekHeaders();
      return;
    }
    this.headerSegments = this.buildMonthHeaders();
  }

  private buildDayHeaders(): HeaderSegment[] {
    const totalDays = this.getDateDiffInDays(this.visibleStartDate, this.visibleEndDate);
    return Array.from({ length: totalDays }, (_, offset) => {
      const date = this.addDays(this.visibleStartDate, offset);
      const isMonthBoundary = date.getDate() === 1 || offset === 0;
      const label = isMonthBoundary
        ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : date.toLocaleDateString('en-US', { day: 'numeric' });
      return {
        key: this.toIsoDate(date),
        label,
        width: this.pxPerDay
      };
    });
  }

  private buildWeekHeaders(): HeaderSegment[] {
    const headers: HeaderSegment[] = [];
    let cursor = this.getStartOfWeek(this.visibleStartDate);
    while (cursor < this.visibleEndDate) {
      const next = this.addDays(cursor, 7);
      const start = cursor < this.visibleStartDate ? this.visibleStartDate : cursor;
      const end = next > this.visibleEndDate ? this.visibleEndDate : next;
      const widthDays = this.getDateDiffInDays(start, end);
      if (widthDays > 0) {
        const isPartialWeek = widthDays < 7;
        const label = isPartialWeek
          ? cursor.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          : `Wk ${cursor.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
        headers.push({
          key: this.toIsoDate(cursor),
          label,
          width: widthDays * this.pxPerDay
        });
      }
      cursor = next;
    }
    return headers;
  }

  private buildMonthHeaders(): HeaderSegment[] {
    const headers: HeaderSegment[] = [];
    let cursor = new Date(this.visibleStartDate.getFullYear(), this.visibleStartDate.getMonth(), 1);
    while (cursor < this.visibleEndDate) {
      const next = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
      const start = cursor < this.visibleStartDate ? this.visibleStartDate : cursor;
      const end = next > this.visibleEndDate ? this.visibleEndDate : next;
      const widthDays = this.getDateDiffInDays(start, end);
      if (widthDays > 0) {
        const isCurrent = this.isCurrentSegmentMonth(cursor);
        headers.push({
          key: this.toIsoDate(cursor),
          label: cursor.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          width: widthDays * this.pxPerDay,
          isCurrent
        });
      }
      cursor = next;
    }
    return headers;
  }

  private centerOnMarkerDate(): void {
    if (!this.timelineScroller?.nativeElement) {
      return;
    }
    const scroller = this.timelineScroller.nativeElement;
    const target = this.currentDayOffsetPx - scroller.clientWidth / 2;
    scroller.scrollLeft = Math.max(target, 0);
  }

  private dateToOffsetPx(date: Date): number {
    // Convert a date into horizontal pixel offset from the visible start date.
    return this.getDateDiffInDays(this.visibleStartDate, this.startOfDay(date)) * this.pxPerDay;
  }

  private clampOffset(value: number): number {
    return Math.max(0, Math.min(value, this.totalTimelineWidthPx));
  }

  private getDateDiffInDays(start: Date, end: Date): number {
    const msPerDay = 1000 * 60 * 60 * 24;
    return Math.floor((this.startOfDay(end).getTime() - this.startOfDay(start).getTime()) / msPerDay);
  }

  private addDays(date: Date, days: number): Date {
    const copy = new Date(date);
    copy.setDate(copy.getDate() + days);
    return copy;
  }

  private startOfDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  private getStartOfWeek(date: Date): Date {
    const dayOfWeek = date.getDay();
    const mondayDistance = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    return this.addDays(this.startOfDay(date), mondayDistance);
  }

  private toIsoDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private isoStringToDate(value: string): Date | null {
    if (!value) {
      return null;
    }
    const [year, month, day] = value.split('-').map(Number);
    if (!year || !month || !day) {
      return null;
    }
    return new Date(year, month - 1, day);
  }

  private getPanelFocusableElements(): HTMLElement[] {
    const panel = this.slidePanel?.nativeElement;
    if (!panel) {
      return [];
    }

    const selector =
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    return Array.from(panel.querySelectorAll<HTMLElement>(selector)).filter(
      (element) => element.offsetParent !== null
    );
  }

  private closeAllDatePickers(): void {
    if (this.startDatePicker?.isOpen()) {
      this.startDatePicker.close();
    }
    if (this.endDatePicker?.isOpen()) {
      this.endDatePicker.close();
    }
    this.activeDatepicker = null;
  }

  private getMarkerDate(): Date {
    const today = this.startOfDay(new Date());
    if (today >= this.visibleStartDate && today < this.visibleEndDate) {
      return today;
    }
    return this.fallbackMarkerDate;
  }

  private isCurrentSegmentMonth(date: Date): boolean {
    const marker = this.getMarkerDate();
    return date.getFullYear() === marker.getFullYear() && date.getMonth() === marker.getMonth();
  }

  private getSampleWorkCenters(): WorkCenterDocument[] {
    return [...SAMPLE_WORK_CENTERS];
  }

  private getSampleWorkOrders(): WorkOrderDocument[] {
    const anchor = this.startOfDay(new Date());
    const baseMonthStart = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const d = (monthOffset: number, dayOfMonth: number): string => {
      const date = new Date(baseMonthStart.getFullYear(), baseMonthStart.getMonth() + monthOffset, dayOfMonth);
      return this.toIsoDate(date);
    };

    return SAMPLE_WORK_ORDER_SEEDS.map((seed) => ({
      docId: seed.docId,
      docType: 'workOrder',
      data: {
        name: seed.name,
        workCenterId: seed.workCenterId,
        status: seed.status,
        startDate: d(seed.start.monthOffset, seed.start.dayOfMonth),
        endDate: d(seed.end.monthOffset, seed.end.dayOfMonth)
      }
    }));
  }
}

