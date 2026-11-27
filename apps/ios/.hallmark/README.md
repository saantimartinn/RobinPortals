# Hallmark checks for Robin iOS

Run from the `Project Robin` repository root:

```sh
node apps/ios/.hallmark/swiftui-audit.mjs
```

This small, dependency-free auditor checks the Hallmark rules that can be
reliably inspected in SwiftUI source: centralized color tokens, tracked or
uppercase labels, middle-dot metadata, decorative arrows in button copy, and
blanket transitions. It reports a manual review list for gates that require a
rendered screen or assistive technology.

Hallmark's `sloplint.mjs` remains the right check for its supported web files.
It does not parse `.swift`, so running it over SwiftUI would produce no useful
coverage. The auditor is deliberately limited to Robin's native shell; it does
not lint HTML/CSS rendered inside the product WebViews.
