# Curated Google Fonts cache

This directory contains a deliberately limited font cache for a later self-hosting pass. The
editor does not import `curated.css` yet; its current Google Fonts loading behavior is unchanged.

The curation follows real editor preset usage and covers:

- neutral, humanist, geometric, modern and display sans faces;
- text, warm, screen and high-contrast display serifs;
- coding, ligature, modern, humanist and geometric display monos.

Variable WOFF2 files are used whenever Google Fonts supplies them. The files retain the complete
supported-script coverage returned by the Developer API rather than silently subsetting glyphs.
Space Mono is the only static exception because its distinctive role and preset usage justify four
files (regular/italic at 400 and 700). Each family directory retains the upstream `OFL.txt` and
`METADATA.pb`. `manifest.json` records the exact Google Fonts repository commit, API version
metadata, source URL, byte size and SHA-256 digest for every copied file.

Refresh the cache from `apps/editor` with:

```text
pnpm fonts:vendor
pnpm fonts:check
```

The command reads `GOOGLE_FONTS_API_KEY` from the ignored `.env.local`. Never commit that file or
the credential. Review the generated manifest and repository diff before accepting an upstream
refresh.
