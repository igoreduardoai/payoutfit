# PayoutFit design tokens

Source of truth for the UI (Hackathon Design Standard v1). Mirrored in `src/style.css` `@theme`.

| Token | Value | Use |
|---|---|---|
| bg | #F7F9FB | page |
| surface | #FFFFFF | cards |
| ink | #0F1B2D | text |
| muted | #475467 | secondary text |
| line | #D0D5DD | dividers |
| control | #667085 | input borders |
| primary | #0F6B6B | the one primary action (Export bookkeeping CSV) |
| focus | #2563EB | 2px focus ring |
| ok / ok-bg | #067647 / #ECFDF3 | Reconciled |
| wait / wait-bg | #93370D / #FFFAEB | Needs review, mismatch flags |
| err / err-bg | #B42318 / #FEF3F2 | file could not be read |

Type: Inter Variable (OFL, self-hosted via @fontsource). Net deposit 40px/700 (48px from 640px up), tabular numbers. Body 16px. Mono only in "Show source CSV".
Radius: controls 8px, cards 16px, badges full. Cards use a shadow, not a border.
Layout: result first; one primary button; the journal table and raw CSV sit below the result.
