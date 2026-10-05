# Liquid History Gesture

A smooth liquid wave that follows an edge swipe and navigates browser history on touch devices. No runtime dependencies, React requirement or stylesheet. MIT licensed, including commercial use.

- **Left edge → swipe right:** back in history.
- **Right edge → swipe left:** forward in history.
- Hidden while idle; a grey, more transparent wave indicates unavailable forward or back history.
- Configurable wave and arrow colours, transparency and stacking order.
- TypeScript declarations included.

## Plain HTML: copy the module

1. Download this repository using **Code → Download ZIP**, or clone it.
2. Copy `index.mjs` into your website, for example to `/js/liquid-history-gesture/index.mjs`.
3. Retain the included MIT licence when distributing the module.
4. Add this before your closing `</body>` tag:

```html
<script type="module">
  import { mountLiquidHistoryGesture } from '/js/liquid-history-gesture/index.mjs';

  const gestures = mountLiquidHistoryGesture({
    backgroundColor: '#18181b',
    arrowColor: '#C0FF00',
  });
</script>
```

Use your normal HTTP/HTTPS web server, rather than opening HTML with `file://`. Mount once per page or persistent application layout, after the document body exists. No build step is needed.

### Alternative: load the tagged version from a CDN

```html
<script type="module">
  import { mountLiquidHistoryGesture } from
    'https://cdn.jsdelivr.net/gh/pprobbins/liquid-history-gesture@v0.1.2/index.mjs';

  mountLiquidHistoryGesture({ backgroundColor: '#18181b', arrowColor: '#C0FF00' });
</script>
```

Self-host the file if you prefer to avoid a third-party CDN. The CDN URL pins the version. For a site with a Content Security Policy, use a permitted external module script or nonce and allow your chosen module host.

## Install into a bundled application

This project is available on GitHub; it has **not been published to the npm registry**. Install the tagged GitHub version:

```sh
npm install github:pprobbins/liquid-history-gesture#v0.1.2
```

Then, in your browser-side entry point:

```js
import { mountLiquidHistoryGesture } from 'liquid-history-gesture';

const gestures = mountLiquidHistoryGesture({
  backgroundColor: '#18181b',
  arrowColor: '#C0FF00',
});

// When removing the host application/layout:
// gestures.destroy();
```

The module uses ES modules. Node.js 20+ runs the development checks; Node is not needed when self-hosting the browser file.

## React and Next.js

After installing from GitHub, create this component:

```tsx
'use client';

import { useEffect } from 'react';
import { mountLiquidHistoryGesture } from 'liquid-history-gesture';

export default function HistoryGestures() {
  useEffect(() => {
    const gestures = mountLiquidHistoryGesture({
      backgroundColor: '#18181b',
      arrowColor: '#C0FF00',
      opacity: 0.8,
      disabledOpacity: 0.5,
    });
    return () => gestures.destroy();
  }, []);

  return null;
}
```

Render `<HistoryGestures />` once in your persistent application layout. For Next.js App Router, a server layout can render this client component inside its body alongside the page content. Importing the module is safe during server rendering; mounting requires a browser. Cleanup is compatible with React Strict Mode.

## All options

Every option is optional. Colours accept CSS colour values.

| Option | Default | Description |
| --- | --- | --- |
| `backgroundColor` | `#18181b` | Active wave colour |
| `arrowColor` | `#C0FF00` | Active arrow colour |
| `disabledBackgroundColor` | `#71717a` | Unavailable wave colour |
| `disabledArrowColor` | `#d4d4d8` | Unavailable arrow colour |
| `opacity` | `0.8` | Active opacity, from 0 to 1 |
| `disabledOpacity` | `0.5` | Unavailable opacity, from 0 to 1 |
| `zIndex` | `100` | Overlay stacking order |
| `canNavigate` | Allow available history | Optional function receiving `"back"` or `"forward"`; return false to grey out and prevent that navigation |

`opacity: 0.8` means 20% transparent; `0.5` means 50% transparent.

```js
const gestures = mountLiquidHistoryGesture({
  backgroundColor: '#0f172a',
  arrowColor: '#ffffff',
  disabledBackgroundColor: '#64748b',
  disabledArrowColor: '#e2e8f0',
  opacity: 0.85,
  disabledOpacity: 0.4,
  zIndex: 1000,
});
```

To change options later, destroy the existing instance and mount a new one. Do not mount multiple instances at the same time.

## Exclude a region

Inputs, textareas, selects, editable content and dialogs are excluded automatically. Exclude additional areas such as carousels or drawing surfaces:

```html
<div data-edge-gesture="off">
  <!-- This region keeps its own touch interactions. -->
</div>
```

## Gesture behaviour

- Start within 20px of either screen edge and drag towards the centre.
- The wave appears after a deliberate horizontal drag; vertical scrolling remains available.
- Release after roughly 90px of inward travel to navigate. Short swipes retract without navigating.
- Unavailable forward or back history shows the disabled wave and retracts without navigating.
- Multiple touches and cancelled gestures never navigate.
- Reduced-motion preferences shorten the retract animation.
- The wave is decorative and hidden from assistive technology. Keep ordinary, accessible navigation buttons available.

## Browser support and limitations

This is a website gesture, not an operating-system gesture. It runs on devices reporting a coarse pointer and receiving touch events, including phones and tablets. A normal desktop mouse drag does not trigger it; use touch emulation or a real device.

Where available, the browser Navigation API reports whether back/forward history exists. Older browsers track entries created after installation by adding a namespaced field to object history state, preserving the existing fields. They cannot reliably discover earlier, untracked entries. Reloading a tracked entry retains the known index; a full-page navigation to a previously untracked page starts a new known stack. This fallback is intended for applications using object history state.

Native browser or system edge gestures can take priority and prevent a website receiving touch events. This module cannot override those gestures reliably. Where the browser owns the swipe, it can show feedback if touch events arrive, but will not trigger its own duplicate navigation.

It navigates actual browser history, rather than a custom route list, and can therefore leave your site. It does not add an unsaved-form confirmation. Use your application's existing navigation protections and exclude sensitive editing regions where appropriate.

## Cleanup

```js
gestures.destroy();
```

Removes the overlay, event listeners and pending animation. In fallback browsers, restores history methods wrapped by this instance if they have not subsequently been replaced by another integration. Calling `destroy()` more than once is safe.

## Run the included example

```sh
git clone https://github.com/pprobbins/liquid-history-gesture.git
cd liquid-history-gesture
python -m http.server 8080
```

Open `http://localhost:8080/examples/`. On Windows, `py -m http.server 8080` can be used instead. Alternatively, serve the folder with your preferred static web server.

To test on a phone on the same network, use your computer's local network address, for example `http://192.168.1.20:8080/examples/`, and allow your development server through the local firewall.

In the example, tap **Add history entry**, then use the left edge to go back. There is now a forward entry: use the right edge to go forward. Once at the newest entry, repeat the right-edge swipe to see the disabled wave. Try a short swipe and a vertical drag too.

## Development and checks

No dependency installation is required for tests:

```sh
npm test
npm run check
```

Automated checks cover configurable appearance, unavailable history feedback, both navigation directions, cancellation, exclusions, history-state preservation and cleanup. They use a simulated browser; check the animation and native gesture interaction on real devices before shipping an integration.

## Licence

[MIT](LICENSE). You can use, modify and redistribute it, including commercially, provided you retain the copyright and licence notice.

The edge directions match conventional browser history gestures. The optional `canNavigate` guard lets applications exclude destinations such as sign-in pages or duplicate entries.
