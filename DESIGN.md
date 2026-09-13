# Design

<!-- impeccable:design-schema 1 -->

Student product UI. Authority: History of attempts, then Statistics. Later student screens follow this page, not the older italic/blue dashboard.

## Surfaces

Operate. Paper sheets on a quiet zinc ground. One job per sheet.

## Color

- Ground: `#fafafa` / `#09090b`
- Sheet: white / `#09090b`
- Line: zinc-200 / zinc-800/60
- Text: zinc-900 / zinc-100; secondary zinc-500
- Fill for data: zinc-900 on zinc-100 (invert in dark)
- Charts stay monochrome zinc: pie slices are a zinc scale, never a rainbow
- No indigo, violet, or per-level rainbow on student data
- Semantic color only for destructive actions (logout), never for mastery bars

## Type

- One family: system sans (`--sans`)
- Title: 18px / 600 / tracking-tight
- Body and rows: 14px / 500
- Meta: 12–14px / 400, zinc-500
- Scores and percents: tabular-nums, semibold
- No uppercase kickers, no italic display, no tracking-widest labels

## Shape

- Sheets: 24px (`rounded-3xl`), 1px border, `shadow-sm`
- Controls: 12px (`rounded-xl`)
- Icon wells: 40×40, 12px radius, same zinc border as History
- Bars: 6px height, full radius, single fill

## Components

- Segmented control for tabs and period (same chrome as student nav)
- List rows with `divide-y`, 24–32px horizontal padding, hover zinc-50
- Primary control: zinc-900 button, white type (invert in dark)
- Empty: 48px well + two lines of copy, no illustration
- Focus: 2px ring in zinc-900 / white

## Layout

- Max width 80rem, page padding 16 / 32
- Statistics: lead strip of tests / average / streak, then topic bars and difficulty bars on a shared 0–100 scale — sibling sheets, never nested cards. No daily chart unless asked.
- History remains a single sheet of rows

## Motion

- One page fade-in, 500ms
- No staggered card entrances, no bounce
