# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.1] - 2026-10-07

### Fixed

- The screen title no longer shows a focus ring when the app opens.

## [0.2.0] - 2026-10-07

### Added

- Three themes: Candy, Doodle and Space, each with its own celebration
  particles.
- Five more profile stickers and a grid of suggested icons for lists.
- Start a list over: purchased items go back to pending for the next trip.
- Items show that their name opens the details.

### Changed

- Spacing follows a single scale and navigation uses the same chevron
  everywhere.
- The main action is docked above the navigation on the home screen too, over
  a solid band, so content no longer shows between the bars.
- The save button and its error stay in view in long sheets.
- File fields use the app's own buttons instead of the native control.
- The offline status moved from the top of every screen to the settings.

### Fixed

- The draft notice no longer appears behind the form that is being edited.

Backups made by this version may use the new themes and stickers and are not
accepted by 0.1.0.

## [0.1.0] - 2026-10-06

First public version.

### Added

- Local profile with a name, a sticker or photo, and no account.
- Shopping lists with emoji and currency: create, edit, archive, reactivate
  and delete, with the impact shown before deleting.
- Quick add by name, with the add button always within reach.
- Purchase and its reversal, with a drawn check, particles and a celebration
  when a list is completed.
- Undo for the last purchase, item removal and list archiving.
- Optional item details: compressed photo, note, store, link, quantity,
  planned and paid price.
- Manual exchange rate with exact arithmetic and an approximate total.
- History of lists and items.
- Comic Pop, Sakura and Night Cartoon themes, reduced motion and haptics
  preferences.
- Backup and restore in a single validated file, including photos.
- Offline use, installation guidance for Android and iOS, and updates that
  wait for other tabs and never discard an unsaved edit.
- Landing page with an interactive check.

### Known limitations

- Not yet tested on physical Android or iOS devices.
- Automated tests cover Chromium only.

[0.2.1]: https://github.com/RDEsley/CartoonCheck/releases/tag/v0.2.1
[0.2.0]: https://github.com/RDEsley/CartoonCheck/releases/tag/v0.2.0
[0.1.0]: https://github.com/RDEsley/CartoonCheck/releases/tag/v0.1.0
