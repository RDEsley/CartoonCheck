# Architecture

Cartoon Check is a single-page app with no backend. IndexedDB, accessed
through Dexie, is the only source of truth.

## Data flow

```text
screen -> domain command -> one Dexie transaction (entity + history)
       <- live query     <- committed data
```

Visual components never write to the database. Each feature folder holds its
screens, queries and commands. React state is used only for forms and
transient interface state; collections are never duplicated in memory.

A list query returns ordered identifiers, and each card observes its own
record, so a change in one item does not re-render the others. Photos are
fetched separately and never travel with list queries.

## Data model

Database `cartoon-check`, schema version 1.

| Store     | Contents                                                        |
| --------- | --------------------------------------------------------------- |
| `profile` | The single local profile: name, avatar, theme and preferences   |
| `lists`   | Name, emoji, status, currency and optional manual exchange rate |
| `items`   | Name, status, quantity, prices, note, store, link and photo     |
| `assets`  | Compressed photos, each referenced by exactly one owner         |
| `history` | Events with name snapshots, so they outlive removed entities    |
| `meta`    | The dataset epoch                                               |

Identifiers are UUIDs. Counts, totals and completion are always derived, never
stored. Prices are non-negative integers in minor units; `null` means absent
and zero is a valid price. Quantity never multiplies a price.

## Guards on every command

- **Revision.** Editable records carry a revision. A form saves against the
  revision it loaded and is rejected if the record changed meanwhile.
- **Dataset epoch.** Restoring a backup replaces the epoch. A session that
  loaded the previous data can no longer write.
- **Atomicity.** The change and its history entry share a transaction; if
  either fails, neither is stored.
- **Ordering.** Each change is timestamped after the previous one, so order is
  stable even within one millisecond or after the clock moves back.

Starting a list over returns every purchased item to pending in one
transaction and clears the price paid; it is confirmed first because it has no
undo.

Buying is explicit and idempotent. Only buying the last pending item of a
non-empty list records a completion; deleting it does not.

## Undo

One action can be undone: the last purchase or its reversal, an item removal,
or archiving and reactivating a list. The token holds the expected revision
and is refused if the data changed afterwards. A removed item's photo is kept
in memory for the undo and is gone after a reload.

## Photos

A file is inspected before it is decoded: the real type and the pixel size are
read from the header of JPEG, PNG or WebP, with limits of 15 MiB and 40
megapixels. The image is then resized and re-encoded (WebP, or JPEG as a
fallback) to at most 1280 px and 512 KiB, or 256 px and 128 KiB for an avatar.
The original and its metadata are not kept.

## Backup format

A `.cartooncheck.zip` archive with `backup.json` and one file per photo under
`assets/`. Every entry is stored uncompressed. The envelope is independent of
the database schema:

```json
{
  "format": "cartoon-check",
  "formatVersion": 1,
  "exportedAt": "2026-10-06T22:00:00.000Z",
  "appVersion": "0.1.0",
  "data": { "profile": {}, "lists": [], "items": [], "history": [] },
  "assets": []
}
```

Reading checks the archive structure (method, CRC, offsets, sizes, allowed
paths, no duplicates or gaps), then the schema, identities, parents, image
references, real image type and decoded dimensions. Restoring replaces all
data and the epoch in a single transaction and validates again inside the
command; a failure at any point leaves the current data untouched. Backups of
16 MiB or more are processed in a worker.

## Offline and updates

The service worker precaches every file of the build, including screens that
were never opened. Photos stay in IndexedDB. Navigation falls back to the app
only for its own routes, so a missing file is a real error.

A new version is offered, never forced. Each tab holds a shared Web Lock; an
update needs the exclusive lock, so it waits while another tab is open. A wait
that times out never approves the update. Forms checkpoint a draft per tab in
`sessionStorage`; a draft is restored as an edit and is never saved on its
own. A draft made before its record changed is not applied: the user chooses
to keep a copy or discard it.

## Motion

Purchase feedback is a short-lived DOM snapshot plus a 2D canvas that exists
only while particles are alive: at most 12 per purchase, 56 for a completion
and 72 in total. Nothing animates at rest. Reduced motion, from the system or
the local preference, removes particles, squash and displacement and leaves
the state change and its announcement intact.
