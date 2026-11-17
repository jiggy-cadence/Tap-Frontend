# Tap-Frontend

The Telegram mini-app frontend for TAP ("proof of meeting"). Static files, no build step.

| File | What it is |
|---|---|
| `index.html` | Knot collection, "tie a knot" (issues a meeting token), invite redemption |
| `ceremony.html` | The two-phone ceremony page |
| `ceremony-dsp.js` | Near-ultrasonic challenge/response between the two phones (`window.TapDSP`) |
| `art.js` | Generative art seeded by the knot id (`window.KnotArt`) |
| `safe.js` | Shared guards: API base, HTML escaping, token check (`window.TapSafe`) |

## What is and is not in this repo

- **Frontend only.** The backend (`/api/knots`, `/api/meeting/*`, `/api/ceremony/report`) lives elsewhere. Without it the collection page shows six demo knots and the ceremony cannot mint anything. Who met whom, and whether a knot is minted, is decided by that backend, not by this code.
- **The audio band is not validated here.** The ceremony uses eight tones from 18 to 19.75 kHz. That choice came from a separate test page (`tap-ceremony.html`) that is not in this repo. Many phone speakers and microphones roll off in this range; the MIC CHECK button shows what a given phone hears.
- **The decoder has unit tests but has not been run on phones from this branch.** The tests feed it synthetic slot sequences. They do not exercise microphones, speakers or timing on real devices.
- **The verify code is 8 hex characters (32 bits)** of `SHA-256(challenge + response)`. It is for two people to compare by eye. Whether that is enough depends on what the backend does with it.
- **The art is seeded from a 32-bit hash of the knot id.** The same knot always gives the same art; different knots almost always differ, but two ids can hash to the same seed (expect a repeat somewhere around tens of thousands of knots).

## Security notes

- Every backend call carries the signed Telegram `initData`. Calls are same-origin. `?api=` is honoured only for `localhost` / `127.0.0.1` (local development); any other value is ignored.
- Backend-supplied strings are escaped before being written to `innerHTML`, and meeting tokens must match `[A-Za-z0-9_-]+` before they are placed in a link.

## Tests

```
node --test test/*.test.js
```

Needs Node 20+ and nothing else. The pages are loaded into `node:vm` with a stub DOM.
