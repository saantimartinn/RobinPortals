# Shared portal navigation

`links.js` is the single source of cross-portal destinations used by Robin Jr, the student portal, Community and Admin. All apps live on one origin (`/portal`, `/robinjr`, `/therobinplan`, `/admin`), so the links are same-origin paths. Set `VITE_ROBIN_ORIGIN` only to point them at another host. Each app keeps its product-specific navigation UI and permission checks.
