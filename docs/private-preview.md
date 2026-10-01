# Private Tailscale learning preview

This optional development helper exposes the isolated learning rehearsal to the
devices/users allowed by the existing tailnet policy. It is not a production
deployment. Obtain approval for that audience before adding a Serve listener.

With dependencies already installed, start from the repository root:

```powershell
node scripts/start-private-preview.mjs homelab.YOUR-TAILNET.ts.net
```

Use the actual lowercase MagicDNS hostname. The helper starts Vite on
`127.0.0.1:3000` and a restrictive proxy on `127.0.0.1:11444`. Neither listens on
LAN interfaces. It disables HMR, the Worker inspector, remote bindings and Clerk
credentials for this process; it preserves the isolated rehearsal storage.

After the proxy is ready and remote access has been approved, add only the new
HTTPS port; do not reset existing Serve configuration:

```powershell
tailscale serve --bg --https=11443 http://127.0.0.1:11444
tailscale serve status
```

Open `https://YOUR-EXACT-HOSTNAME:11443/admin/preview/curricula` from a device
connected to the tailnet. This catalog includes implemented unpublished chapters.
The remote browser has its own local rehearsal progress. Account saving,
discussion writes and analytics remain disabled. Browser Python needs access to
its external runtime/package CDN.

The proxy accepts only the exact configured Host, learning/preview pages, client
assets and a fixed list of read-only learning server functions. It strips account
cookies and credentials, rejects every non-GET/HEAD request and all WebSocket or
CONNECT upgrades, rejects encoded/traversal paths and arbitrary module queries,
and blocks unrelated administration, debug, filesystem and local explorer APIs.
Client source modules are still visible as required by a Vite development app.
The proxy intentionally converts approved requests to localhost; the application
loopback gate itself is unchanged. It must never be exposed with Funnel.

Validate before use:

```powershell
node --test tests/private-preview-proxy.test.mjs
```

Also check the real HTTPS URL in a browser, all implemented chapter links, asset
loading, navigation, Python execution and blocked routes. Loopback tests do not
prove another device can connect through Tailscale.

The `--bg` Serve configuration persists in Tailscale. The Node helper is a normal
process, not a Windows service or startup task: keep its process tree running;
after reboot/logout/process termination, start it again. HMR is disabled; refresh
the browser after edits. No changes to tailnet ACLs or Windows firewall are needed.

To remove only this preview listener:

```powershell
tailscale serve --https=11443 off
```

Then stop the helper and its child process tree. Leave all other Serve ports and
the repository/rehearsal data intact. Do not use `tailscale serve reset`.
