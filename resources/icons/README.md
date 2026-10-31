<!-- resources/icons/README.md -->

# Symphony icons

`symphony-mark.svg` is the canonical vector source for Symphony's flat posthorn mark. It keeps a `0 0 32 32` view box and the `symphony-mark` group, with its paint inherited through `currentColor`. Application surfaces load this source instead of copying its paths into templates.

Run `yarn icons:generate` after changing the source. The generator creates:

- `symphony.svg`, the self-contained application icon with the red posthorn on a flat off-white rounded tile, without baked-in shadows or an inner border;
- transparent mark PNGs in `png/mark`;
- monochrome macOS menu-bar template PNGs in `png/tray`, including running and failed badges;
- application PNGs in `png/app`;
- the multi-resolution macOS `symphony.icns` and Windows `symphony.ico` files.

The generator inherits paint from the surrounding SVG, so both filled and stroked `currentColor` geometry work for app icons and monochrome templates. The app palette is warm red `#c43c35` on off-white `#fafaf9`; tray templates use black. The mobile manifest uses the same off-white background. Running and failed templates retain their status meanings and filenames. All three tray variants use the same full-scale, vertically centered mark in a 24-point canvas: 24×24 pixels at 1× and 48×48 pixels at 2×. The visible posthorn is approximately 21×14 points. Status badges occupy the upper-right clear space without masking the posthorn. These badges remain separate from the canonical posthorn; app icons and standalone mark PNGs retain their existing geometry.

## Consumers and paths

| Surface                                                    | Source or generated asset                                    |
| ---------------------------------------------------------- | ------------------------------------------------------------ |
| Desktop startup, mobile header                             | `symphony-mark.svg`                                          |
| Browser favicon, mobile home view                          | `symphony.svg`                                               |
| Browser PNG favicon, Apple touch icon, mobile manifest     | App PNGs from `png/app`                                      |
| Desktop window, macOS runtime Dock icon and Debian package | `png/app/symphony-256.png`                                   |
| macOS application bundle and DMG                           | `symphony.icns`                                              |
| Windows application and Squirrel installer                 | `symphony.ico`                                               |
| macOS menu bar                                             | The idle, running and failed templates in `png/tray`         |
| Windows installed-application icon                         | `symphony.ico`, also copied into the release's shared assets |

The PNG sizes cover browser favicons, common desktop surfaces, Apple touch icons, Android home-screen icons, and native packaging. Both Angular applications copy `png/app/*.png` to the browser-facing `icons/png` directory, and the SVGs to `icons`. The mobile build copies `symphony.webmanifest` to its output root. Therefore the HTML and manifest URLs intentionally use `icons/png/symphony-*.png`; the source-only `app` directory is not part of those public URLs.

Electron Main and Forge keep their existing native asset paths. Regenerate the assets before rebuilding an application or installer; changing the canonical SVG alone does not replace the already generated PNG, ICO or ICNS files.

Electron Main applies the application PNG to the macOS Dock when launching either a packaged or development build. The installed bundle and DMG still carry the native ICNS icon.
