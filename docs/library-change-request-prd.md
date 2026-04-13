# Change Request: Field Values, Labels, and Read-Only State

**Package:** `@drvillo/react-browser-e-signing`
**Current version:** 0.3.0
**Target version:** 0.4.0 (suggested)
**Status:** Proposal

---

## 1. Motivation

The library currently models a single-session flow where one user places fields on a PDF, provides signer details, and calls `modifyPdf` to flatten everything into the document. All field content is derived at embed time from a single `SignerInfo` object and a single `signatureDataUrl`.

This works well for the simplest case but prevents consumers from building common document workflows where:

- Some fields arrive **pre-positioned** on the PDF and should not be moved or removed.
- Some fields carry **pre-filled values** that should be embedded as-is, without deriving them from `SignerInfo`.
- A field configuration needs to be **saved and restored** across sessions (the consumer serializes `FieldPlacement[]`, persists it, and hydrates the hook later).

None of these require the library to understand workflow semantics. They are properties of the field itself: a field can have a value, a label, and it can be locked.

---

## 2. Design Principles

1. **No workflow knowledge in the library.** The library deals with PDFs, fields, and signatures. Concepts like "sender", "signer", "template", and "workflow step" belong to the consumer. The library should expose **primitives** that make these patterns possible without encoding them.
2. **Fully backward-compatible.** Every new property is optional. Existing consumers that don't set the new properties get identical behavior to v0.3.0. No breaking changes to types, props, hooks, or utilities.
3. **Composable, not prescriptive.** The library provides building blocks. The consumer decides which fields are editable, what values they carry, and when `modifyPdf` is called. The library renders and embeds whatever it's given.

---

## 3. Changes to `FieldPlacement`

### 3.1 New optional properties

```ts
interface FieldPlacement {
  // --- existing (unchanged) ---
  id: string
  type: FieldType
  pageIndex: number
  xPercent: number
  yPercent: number
  widthPercent: number
  heightPercent: number

  // --- new (all optional) ---

  /** Display label shown inside the field box (e.g. "Company", "Address").
   *  When unset, the component falls back to the existing type-derived label
   *  ("Signature", "Full Name", "Title", "Date"). */
  label?: string

  /** Pre-filled value for the field.
   *  - For `type: 'signature'`: a PNG data URL (same format as `signatureDataUrl`).
   *  - For all other types: a plain text string.
   *  When set, `modifyPdf` embeds this value directly instead of deriving it from
   *  `SignerInfo` / `signatureDataUrl`. `SignatureField` renders the value as a
   *  non-editable preview. */
  value?: string

  /** When `true`, the field cannot be dragged, resized, or removed.
   *  `SignatureField` hides the remove button and resize handle, and disables
   *  pointer-capture drag. The field is still rendered at its position.
   *  `useFieldPlacement.updateField` and `removeField` ignore calls targeting a
   *  locked field. Default: `false`. */
  locked?: boolean
}
```

### 3.2 Rationale for each property


| Property | What it enables for consumers                                | Library concern                                      |
| -------- | ------------------------------------------------------------ | ---------------------------------------------------- |
| `label`  | Custom field labels beyond the 4 built-in types              | Field rendering: what text appears in the label slot |
| `value`  | Pre-filled content that `modifyPdf` embeds as-is             | PDF embedding: per-field content source              |
| `locked` | Preventing positional edits on fields that should stay fixed | Field interaction: drag/resize/remove gating         |


### 3.3 What is intentionally NOT added


| Omitted concept             | Why                                                                                                                     |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `assignee`, `owner`, `role` | Workflow semantics. The consumer tracks which fields belong to whom and passes the appropriate subset + `locked` state. |
| `required`                  | Validation semantics. The consumer validates completeness before calling `modifyPdf`.                                   |
| `fieldGroup`, `templateId`  | Organizational semantics. The consumer groups and labels fields in its own data model.                                  |


---

## 4. Changes to `FieldType`

### 4.1 Add `'text'`

```ts
type FieldType = 'signature' | 'fullName' | 'title' | 'date' | 'text'
```

The `'text'` type represents a generic text field. In `modifyPdf`:

- If the field has a `value`, embed that value.
- If the field has no `value`, skip it (same as the existing behavior when a derived value is empty).

In `SignatureField` rendering:

- The label slot shows `field.label ?? 'Text'`.
- The preview slot shows `field.value ?? '—'`.

### 4.2 `FieldPalette` updates

`FieldPalette` should render the `'text'` type with label "Text" in its button list. The internal `FIELD_TYPES` array becomes `['signature', 'fullName', 'title', 'date', 'text']`.

**Optional enhancement (lower priority):** Accept a `fieldTypes` prop to let consumers control which buttons appear and in what order:

```ts
interface FieldPaletteProps {
  selectedFieldType: FieldType | null
  onSelectFieldType: (fieldType: FieldType | null) => void
  /** Override the default set and order of field type buttons.
   *  When omitted, all built-in types are shown. */
  fieldTypes?: Array<{ type: FieldType; label: string }>
  className?: string
}
```

---

## 5. Changes to `useFieldPlacement`

### 5.1 Accept initial fields

```ts
interface UseFieldPlacementOptions {
  defaultWidthPercent?: number
  defaultHeightPercent?: number
  /** Fields to initialize with. Useful for restoring a previously saved field
   *  configuration. The hook uses this value once on mount; subsequent changes
   *  to the reference are ignored (same pattern as `useState(initialValue)`). */
  initialFields?: FieldPlacement[]
}
```

### 5.2 Expose `setFields`

```ts
function useFieldPlacement(options?: UseFieldPlacementOptions): {
  // --- existing ---
  fields: FieldPlacement[]
  addField: (input: AddFieldInput) => FieldPlacement
  updateField: (id: string, partial: Partial<FieldPlacement>) => void
  removeField: (id: string) => void
  clearFields: () => void

  // --- new ---
  /** Replace the entire field array. Useful for loading a saved configuration
   *  or switching between documents. */
  setFields: (fields: FieldPlacement[]) => void
}
```

### 5.3 Respect `locked` in mutations

- `updateField(id, partial)`: if the target field has `locked: true` **and** the partial contains positional keys (`xPercent`, `yPercent`, `widthPercent`, `heightPercent`), the positional keys are ignored. Updates to `value` and `label` are still allowed (so a consumer can programmatically set a field's value on a locked field).
- `removeField(id)`: no-op if the target field has `locked: true`.

This keeps the hook as the single source of truth for field mutation rules, without requiring every component to independently check `locked`.

---

## 6. Changes to `SignatureField`

### 6.1 Locked rendering

When `field.locked === true`:

- **Drag:** `onPointerDown` on the root element does not initiate pointer capture. The cursor should be `default` instead of `grab`/`move`.
- **Resize handle:** Not rendered (or rendered as visually hidden).
- **Remove button:** Not rendered.
- **Data attribute:** `data-locked="true"` on the root element, so consumers can style locked fields differently via CSS.

### 6.2 Per-field value display

Currently, `SignatureField` derives its preview content from the global `preview: SignatureFieldPreview` prop:

```ts
// current behavior
function getFieldPreviewText(field, preview) {
  if (field.type === 'fullName') return preview.fullName
  if (field.type === 'title')    return preview.title
  if (field.type === 'date')     return preview.dateText
  return ''
}
```

When `field.value` is set, the field should display that value instead of the global preview:

- `**type: 'signature'` with `field.value`:** Render `field.value` as an `<img>` in the preview image slot (same as the existing signature preview image rendering).
- **Other types with `field.value`:** Render `field.value` as text in the preview text slot.
- **No `field.value`:** Fall back to current behavior (derive from `preview` prop).

### 6.3 Label display

The label slot (`data-slot="signature-field-label"`) currently renders `field.type` directly. When `field.label` is set, render `field.label` instead.

```ts
// proposed
const displayLabel = field.label ?? FIELD_LABELS[field.type] ?? field.type
```

### 6.4 Data attributes for styling

Add to the root element:

- `data-locked="true" | "false"` — reflects `field.locked`
- `data-has-value="true" | "false"` — reflects whether `field.value` is truthy

These let consumers style pre-filled vs empty fields and locked vs unlocked fields without JavaScript.

---

## 7. Changes to `FieldOverlay`

### 7.1 Read-only mode

```ts
interface FieldOverlayProps {
  // --- existing (unchanged) ---
  pageIndex: number
  fields: FieldPlacement[]
  selectedFieldType: FieldType | null
  onAddField: (input: { pageIndex: number; type: FieldType; xPercent: number; yPercent: number }) => void
  onUpdateField: (fieldId: string, partial: Partial<FieldPlacement>) => void
  onRemoveField: (fieldId: string) => void
  preview: SignatureFieldPreview
  className?: string

  // --- new ---
  /** When `true`, clicking the overlay does not add new fields. The overlay
   *  still renders existing fields. Default: `false`. */
  readOnly?: boolean
}
```

When `readOnly` is `true`:

- `handleOverlayPointerDown` is a no-op (no field creation on click).
- The overlay `data-state` is `'readonly'` instead of `'placing'` or `'idle'`.
- The cursor remains `default` regardless of `selectedFieldType`.

This is distinct from per-field `locked`. A read-only overlay prevents **adding** fields. Individual field `locked` prevents **modifying** existing fields. Consumers combine both: set `readOnly` on the overlay and `locked` on each field to get a fully non-editable view.

---

## 8. Changes to `modifyPdf`

### 8.1 Per-field value embedding

```ts
interface ModifyPdfInput {
  pdfBytes: Uint8Array
  fields: FieldPlacement[]
  signer?: SignerInfo              // becomes optional
  signatureDataUrl?: string        // becomes optional
  pageDimensions: PdfPageDimensions[]
  dateText?: string
}
```

The embedding logic per field becomes:

```
for each field:
  if field.value is set:
    if field.type === 'signature':
      embed field.value as PNG image at the field's rectangle
    else:
      embed field.value as text at the field's rectangle
  else:
    derive value from signer/signatureDataUrl/dateText (current behavior)
    if derived value is empty, skip field
```

Making `signer` and `signatureDataUrl` optional allows consumers to call `modifyPdf` with only pre-filled fields (all carrying `value`) without needing to supply signer details. When any field lacks a `value` and its type requires `signer` or `signatureDataUrl`, the consumer must provide those — otherwise the field is silently skipped (current behavior for empty derived values).

### 8.2 Backward compatibility

When no field has a `value` set and `signer` + `signatureDataUrl` are provided, behavior is identical to v0.3.0. The only signature change is that `signer` and `signatureDataUrl` become optional in the type — callers that already provide them don't need to change anything.

---

## 9. No Changes Required

The following are explicitly out of scope. They work as-is and need no modifications.


| Surface                           | Why no change                                                |
| --------------------------------- | ------------------------------------------------------------ |
| `PdfViewer`                       | PDF rendering is independent of field metadata               |
| `PdfPageNavigator`                | Page navigation is independent of field metadata             |
| `usePdfDocument`                  | PDF loading is independent of field metadata                 |
| `usePdfPageVisibility`            | Scroll tracking is independent of field metadata             |
| `SignaturePreview`                | Signature style selection is independent of field metadata   |
| `SignaturePad`                    | Drawing capture is independent of field metadata             |
| `useSignatureRenderer`            | Typed signature rendering is independent of field metadata   |
| `SignerDetailsPanel`              | Signer info capture is independent of field metadata         |
| `SigningComplete`                 | Post-sign summary is independent of field metadata           |
| `mapToPoints` / `mapFromPoints`   | Coordinate mapping reads only existing positional properties |
| `sha256`                          | Hashing is independent of field metadata                     |
| `configure` / `loadSignatureFont` | Configuration is independent of field metadata               |


---

## 10. New `SLOTS` Entries

No new slots are required. Existing slots are sufficient:

- `signature-field-label` — already renders the label (just needs to read `field.label`)
- `signature-field-preview-image` — already renders signature images
- `signature-field-preview-text` — already renders text previews

New **data attributes** on existing slots:


| Element                         | Attribute        | Values                                             |
| ------------------------------- | ---------------- | -------------------------------------------------- |
| `[data-slot="signature-field"]` | `data-locked`    | `"true"` | `"false"`                               |
| `[data-slot="signature-field"]` | `data-has-value` | `"true"` | `"false"`                               |
| `[data-slot="field-overlay"]`   | `data-state`     | existing `"placing"` | `"idle"` + new `"readonly"` |


---

## 11. Consumer Usage Examples

These examples show how a consumer (not the library) composes these primitives. They are included to validate the API design, not as library implementation requirements.

### 11.1 Pre-filled document

A consumer has two phases. In phase 1, user A places fields and fills some of them. In phase 2, user B fills the remaining fields.

```tsx
// Phase 1: User A places fields and sets values for some of them
const { fields, addField, updateField, setFields } = useFieldPlacement()

// User A fills a field's value
updateField(someFieldId, { value: 'Acme Corp' })

// Consumer serializes and persists the field array
await saveToServer(JSON.stringify(fields))
```

```tsx
// Phase 2: User B loads the persisted fields
const savedFields = await loadFromServer()
const parsed: FieldPlacement[] = JSON.parse(savedFields)

// Lock the fields that already have values; leave the rest editable
const hydratedFields = parsed.map(f => ({
  ...f,
  locked: f.value != null,
}))

const { fields, updateField } = useFieldPlacement({ initialFields: hydratedFields })

// Overlay is read-only (no new fields), but unlocked fields can still be interacted with
<FieldOverlay readOnly fields={fields} ... />

// User B fills remaining fields, then calls modifyPdf with the complete set
```

### 11.2 Reusable field configuration

A consumer saves a field layout (positions + labels + types) without values, then reuses it across multiple documents.

```tsx
// Save: strip values, keep positions and labels
const templateFields = fields.map(({ value, ...rest }) => rest)
await saveTemplate(JSON.stringify(templateFields))

// Load: hydrate into useFieldPlacement
const template: FieldPlacement[] = JSON.parse(await loadTemplate())
const { fields, setFields } = useFieldPlacement({ initialFields: template })
```

---

## 12. Migration Guide (consumer-facing)


| v0.3.0 code                                    | v0.4.0 change                                                | Action required                                            |
| ---------------------------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------- |
| `useFieldPlacement()`                          | No change                                                    | None — `initialFields` defaults to `[]`                    |
| `modifyPdf({ ..., signer, signatureDataUrl })` | `signer` and `signatureDataUrl` become optional              | None — existing calls still work                           |
| `FieldOverlay` without `readOnly`              | `readOnly` defaults to `false`                               | None                                                       |
| `field.type` rendered as label                 | Falls back to type-derived label when `field.label` is unset | None                                                       |
| CSS targeting `[data-slot="signature-field"]`  | New `data-locked`, `data-has-value` attributes added         | None — additive attributes don't affect existing selectors |


**Zero breaking changes. All new properties are optional with defaults matching v0.3.0 behavior.**

---

## 13. Suggested Implementation Order

Each step is independently shippable and backward-compatible.

1. `**FieldPlacement` type** — add `label`, `value`, `locked` as optional properties.
2. `**useFieldPlacement`** — add `initialFields` option, `setFields` return, `locked` guards in `updateField`/`removeField`.
3. `**SignatureField**` — read `field.label`, `field.value`, `field.locked`; add data attributes; gate drag/resize/remove.
4. `**FieldOverlay**` — add `readOnly` prop and `data-state="readonly"`.
5. `**modifyPdf**` — read `field.value` first; make `signer`/`signatureDataUrl` optional.
6. `**FieldType**` — add `'text'`; update `FieldPalette` and `modifyPdf` text rendering; optionally add `fieldTypes` prop to `FieldPalette`.
7. **Default styles** — add baseline styles for `[data-locked="true"]` and `[data-has-value="true"]` in `styles.css`.

---

## 14. Acceptance Criteria

- `FieldPlacement` accepts optional `label`, `value`, and `locked` without type errors.
- `useFieldPlacement({ initialFields })` initializes with the provided array.
- `setFields(newFields)` replaces the field array.
- `updateField` on a `locked` field ignores positional changes but allows `value`/`label` updates.
- `removeField` on a `locked` field is a no-op.
- `SignatureField` renders `field.label` when set, falls back to type-derived label.
- `SignatureField` renders `field.value` when set (image for signature, text for others).
- `SignatureField` with `locked: true` has no drag, no resize handle, no remove button.
- `SignatureField` emits `data-locked` and `data-has-value` attributes.
- `FieldOverlay` with `readOnly` does not create fields on click; emits `data-state="readonly"`.
- `modifyPdf` with fields carrying `value` embeds those values directly.
- `modifyPdf` with only `value`-carrying fields works without `signer`/`signatureDataUrl`.
- `modifyPdf` without any `value` fields behaves identically to v0.3.0.
- `FieldType` includes `'text'`; `FieldPalette` renders a "Text" button.
- All existing tests pass without modification.
- `styles.css` includes baseline styles for locked and has-value states.

