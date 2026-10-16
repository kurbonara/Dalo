import type { ReactNode } from "react";

/** A pulsing placeholder block. */
export function Bone({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-stone-200/80 ${className}`} />;
}

function Busy({ children, className = "container-page py-10" }: { children: ReactNode; className?: string }) {
  return (
    <div className={className} aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>
      {children}
    </div>
  );
}

function HeaderSkeleton({ back = true, actions = 0 }: { back?: boolean; actions?: number }) {
  return (
    <div className="mb-8">
      {back && <Bone className="mb-3 h-4 w-24" />}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <Bone className="h-8 w-72 max-w-full" />
          <Bone className="h-4 w-56 max-w-full" />
        </div>
        {actions > 0 && (
          <div className="flex gap-2">
            {Array.from({ length: actions }).map((_, i) => (
              <Bone key={i} className="h-10 w-28 rounded-xl" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatsSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card space-y-2 p-4">
          <Bone className="h-3 w-16" />
          <Bone className="h-8 w-12" />
          <Bone className="h-3 w-20" />
        </div>
      ))}
    </div>
  );
}

function InputSkeleton({ label = "w-24", tall = false }: { label?: string; tall?: boolean }) {
  return (
    <div className="space-y-2">
      <Bone className={`h-4 ${label}`} />
      <Bone className={`${tall ? "h-24" : "h-10"} w-full rounded-xl`} />
    </div>
  );
}

/* ───────────── Event cards ───────────── */

function EventCardSkeleton() {
  return (
    <div className="card flex gap-4 p-4">
      <div className="h-16 w-16 shrink-0 animate-pulse rounded-xl bg-brand-50" />
      <div className="flex-1 space-y-2 pt-1">
        <div className="flex gap-2">
          <Bone className="h-4 w-2/3" />
          <Bone className="h-4 w-16 rounded-full" />
        </div>
        <Bone className="h-3 w-1/3" />
        <Bone className="h-3 w-3/4" />
      </div>
    </div>
  );
}

export function EventGridSkeleton({ count = 4, columns = 2 }: { count?: number; columns?: 1 | 2 }) {
  return (
    <div className={`grid gap-3 ${columns === 2 ? "md:grid-cols-2" : ""}`} aria-busy="true">
      {Array.from({ length: count }).map((_, i) => (
        <EventCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function EventsPageSkeleton() {
  return (
    <Busy>
      <HeaderSkeleton back={false} />
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Bone className="h-10 w-80 max-w-full rounded-xl" />
        <Bone className="h-10 w-40 rounded-xl" />
      </div>
      <EventGridSkeleton count={6} />
    </Busy>
  );
}

/* ───────────── Event detail ───────────── */

export function EventDetailSkeleton() {
  return (
    <Busy className="container-page max-w-4xl py-10">
      <Bone className="mb-3 h-4 w-24" />
      <div className="card overflow-hidden">
        <div className="space-y-3 bg-brand-800 px-6 py-8 sm:px-8">
          <div className="h-5 w-24 animate-pulse rounded-full bg-white/20" />
          <div className="h-9 w-2/3 animate-pulse rounded-lg bg-white/20" />
          <div className="h-4 w-40 animate-pulse rounded-lg bg-white/15" />
        </div>
        <div className="grid gap-8 p-6 sm:p-8 md:grid-cols-[1fr_280px]">
          <div className="grid h-fit gap-5 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Bone className="h-3 w-16" />
                <Bone className="h-4 w-44" />
              </div>
            ))}
            <div className="space-y-2 border-t border-stone-200 pt-6 sm:col-span-2">
              <Bone className="h-4 w-32" />
              <Bone className="h-3 w-full" />
              <Bone className="h-3 w-11/12" />
              <Bone className="h-3 w-2/3" />
            </div>
          </div>
          <div className="space-y-3 rounded-2xl bg-stone-50 p-5">
            <Bone className="h-4 w-3/4" />
            <Bone className="h-10 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </Busy>
  );
}

/* ───────────── Tickets ───────────── */

function TicketRowSkeleton() {
  return (
    <div className="card flex items-center gap-4 p-4">
      <div className="flex-1 space-y-2">
        <Bone className="h-4 w-1/2" />
        <Bone className="h-3 w-1/4" />
        <Bone className="h-3 w-1/3" />
      </div>
      <Bone className="h-5 w-20 rounded-full" />
    </div>
  );
}

export function TicketsSkeleton() {
  return (
    <Busy className="container-page max-w-4xl py-10">
      <HeaderSkeleton back={false} actions={1} />
      {[3, 2].map((count, s) => (
        <section key={s} className="mb-10">
          <Bone className="mb-3 h-3 w-36" />
          <div className="space-y-3">
            {Array.from({ length: count }).map((_, i) => (
              <TicketRowSkeleton key={i} />
            ))}
          </div>
        </section>
      ))}
    </Busy>
  );
}

export function TicketSkeleton() {
  return (
    <Busy className="container-page max-w-lg py-10">
      <Bone className="mb-3 h-4 w-24" />
      <div className="card overflow-hidden">
        <div className="space-y-2 bg-brand-800 px-6 py-5">
          <div className="h-3 w-32 animate-pulse rounded bg-white/20" />
          <div className="h-6 w-3/4 animate-pulse rounded-lg bg-white/20" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-white/15" />
        </div>
        <div className="border-b border-dashed border-stone-300 p-6">
          <div className="relative mx-auto aspect-square w-full max-w-72 animate-pulse rounded-xl bg-stone-100">
            {/* QR finder squares */}
            {["left-3 top-3", "right-3 top-3", "bottom-3 left-3"].map((pos) => (
              <div key={pos} className={`absolute ${pos} h-14 w-14 rounded-md border-[6px] border-stone-300`} />
            ))}
          </div>
          <Bone className="mx-auto mt-3 h-3 w-24" />
        </div>
        <div className="space-y-4 p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Bone className="h-4 w-36" />
              <Bone className="h-3 w-20" />
            </div>
            <Bone className="h-5 w-20 rounded-full" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Bone className="h-16 rounded-xl" />
            <Bone className="h-16 rounded-xl" />
          </div>
        </div>
      </div>
    </Busy>
  );
}

/* ───────────── Organizer ───────────── */

export function DashboardSkeleton() {
  return (
    <Busy>
      <HeaderSkeleton back={false} />
      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="space-y-10">
          <div>
            <Bone className="mb-3 h-3 w-36" />
            <div className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="card space-y-2 p-5">
                  <div className="flex justify-between">
                    <Bone className="h-5 w-1/2" />
                    <Bone className="h-5 w-14 rounded-full" />
                  </div>
                  <Bone className="h-3 w-3/4" />
                </div>
              ))}
            </div>
          </div>
          <div>
            <Bone className="mb-3 h-3 w-44" />
            <EventGridSkeleton count={3} columns={1} />
          </div>
        </div>
        <div className="card h-fit space-y-4 p-6">
          <Bone className="h-5 w-48" />
          <InputSkeleton />
          <InputSkeleton tall />
          <Bone className="h-10 w-full rounded-xl" />
        </div>
      </div>
    </Busy>
  );
}

export function OrgSkeleton() {
  return (
    <Busy>
      <HeaderSkeleton actions={1} />
      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div>
          <Bone className="mb-3 h-3 w-16" />
          <EventGridSkeleton count={4} columns={1} />
        </div>
        <div className="card h-fit space-y-4 p-6">
          <Bone className="h-5 w-28" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="flex-1 space-y-1.5">
                <Bone className="h-4 w-2/3" />
                <Bone className="h-3 w-1/2" />
              </div>
              <Bone className="h-5 w-14 rounded-full" />
            </div>
          ))}
          <Bone className="h-10 w-full rounded-xl" />
        </div>
      </div>
    </Busy>
  );
}

export function EventFormSkeleton() {
  return (
    <Busy className="container-page max-w-2xl py-10">
      <HeaderSkeleton />
      <div className="space-y-6">
        <div className="card space-y-4 p-6">
          <Bone className="h-5 w-20" />
          <InputSkeleton />
          <InputSkeleton tall />
          <InputSkeleton label="w-16" />
          <div className="grid gap-4 sm:grid-cols-2">
            <InputSkeleton label="w-12" />
            <InputSkeleton label="w-12" />
          </div>
        </div>
        {[2, 3].map((rows, i) => (
          <div key={i} className="card space-y-4 p-6">
            <Bone className="h-5 w-40" />
            {Array.from({ length: rows }).map((_, j) => (
              <div key={j} className="flex gap-3">
                <Bone className="h-4 w-4 rounded" />
                <div className="flex-1 space-y-1.5">
                  <Bone className="h-4 w-36" />
                  <Bone className="h-3 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </Busy>
  );
}

export function ManageEventSkeleton() {
  return (
    <Busy>
      <HeaderSkeleton actions={3} />
      <StatsSkeleton />
      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="card space-y-3 p-6">
          <Bone className="mb-2 h-5 w-32" />
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Bone className="h-5 w-20 rounded-full" />
              <Bone className="h-4 w-40" />
              <Bone className="ml-auto h-3 w-28" />
            </div>
          ))}
        </div>
        <div className="space-y-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card space-y-3 p-6">
              <Bone className="h-5 w-40" />
              <Bone className="h-3 w-full" />
              <Bone className="h-10 w-32 rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    </Busy>
  );
}

export function ScanSkeleton() {
  return (
    <Busy className="container-page max-w-2xl py-6">
      <HeaderSkeleton />
      <div className="space-y-5">
        <Bone className="h-10 w-72 rounded-xl" />
        <div className="card overflow-hidden">
          <div className="flex aspect-square max-h-96 w-full flex-col items-center justify-center gap-3 bg-stone-900">
            <div className="h-3 w-48 animate-pulse rounded bg-white/15" />
            <div className="h-11 w-36 animate-pulse rounded-xl bg-white/20" />
          </div>
        </div>
        <div className="h-24 rounded-2xl border-2 border-dashed border-stone-300" />
        <Bone className="h-10 w-full rounded-xl" />
      </div>
    </Busy>
  );
}

export function ReportTableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="card overflow-hidden" aria-busy="true">
      <div className="flex gap-6 border-b border-stone-200 bg-stone-50 px-4 py-3">
        {[4, 24, 14, 16, 16, 10, 16].map((width, i) => (
          <div key={i} style={{ width: `${width}%` }}>
            <Bone className="h-3" />
          </div>
        ))}
      </div>
      <div className="divide-y divide-stone-100">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-6 px-4 py-3">
            <Bone className="h-3 w-[4%]" />
            <div className="w-[24%] space-y-1.5">
              <Bone className="h-4 w-4/5" />
              <Bone className="h-3 w-3/5" />
            </div>
            <Bone className="h-5 w-[14%] rounded-full" />
            <Bone className="h-3 w-[16%]" />
            <Bone className="h-3 w-[16%]" />
            <Bone className="h-3 w-[10%]" />
            <Bone className="h-3 w-[16%]" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ReportSkeleton() {
  return (
    <Busy>
      <HeaderSkeleton actions={3} />
      <StatsSkeleton />
      <Bone className="mb-4 h-4 w-96 max-w-full" />
      <div className="mb-4 flex flex-wrap gap-3">
        <Bone className="h-10 w-96 max-w-full rounded-xl" />
        <Bone className="h-10 w-72 max-w-full rounded-xl" />
      </div>
      <ReportTableSkeleton />
    </Busy>
  );
}

/* ───────────── Forms & misc ───────────── */

export function AuthFormSkeleton({ fields = 2 }: { fields?: number }) {
  return (
    <Busy className="container-page flex justify-center py-16">
      <div className="w-full max-w-md">
        <Bone className="mb-2 h-7 w-56" />
        <Bone className="mb-6 h-4 w-72" />
        <div className="card space-y-4 p-6">
          {Array.from({ length: fields }).map((_, i) => (
            <InputSkeleton key={i} />
          ))}
          <Bone className="h-10 w-full rounded-xl" />
        </div>
      </div>
    </Busy>
  );
}

export function AccountSkeleton() {
  return (
    <Busy className="container-page max-w-xl py-10">
      <HeaderSkeleton back={false} />
      <div className="card space-y-4 p-6">
        <InputSkeleton />
        <InputSkeleton />
        <Bone className="h-10 w-32 rounded-xl" />
      </div>
    </Busy>
  );
}

export function VerifySkeleton() {
  return (
    <Busy className="container-page max-w-lg py-16">
      <div className="card overflow-hidden">
        <div className="space-y-2 bg-stone-100 px-6 py-5">
          <Bone className="h-3 w-44" />
          <Bone className="h-7 w-56" />
        </div>
        <div className="space-y-4 p-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Bone className="h-3 w-20" />
              <Bone className="h-4 w-2/3" />
            </div>
          ))}
        </div>
      </div>
    </Busy>
  );
}
