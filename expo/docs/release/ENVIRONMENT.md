# Environment Separation — Momir Basic

## EAS Update Channels

| Channel | Branch | Purpose | Runtime | Auto-promote |
|---------|--------|---------|---------|-------------|
| `preview` | `main` | Internal dogfooding | Latest native build | No |
| `production` | `release/*` | Public rollout | Latest native build | No |

## Environment Variables

### Preview Channel
- Environment: `development` or `preview`
- API endpoints: Use Scryfall's public API (no staging backend currently)

### Production Channel
- Environment: `production`
- API endpoints: Use Scryfall's public API (no separate backend)

Note: Since this app is primarily a client to Scryfall's public API with local storage only, there are no separate backend environments. If a backend is added in the future, production backend URLs must be used for the production channel.

## Build Provenance
- Every build is tagged with: `YYMM.RR` runtime version
- Every EAS Update is tagged with a message describing the change
- Build IDs are recorded in GitHub Actions artifacts
