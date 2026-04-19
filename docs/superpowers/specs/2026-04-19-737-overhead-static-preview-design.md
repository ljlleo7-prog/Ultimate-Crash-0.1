# 737 Overhead Static Preview Design

## Goal

Create a single standalone static HTML preview of a professional-level Boeing 737 overhead panel. The preview is a visual design artifact only: it should help evaluate cockpit accuracy and realism before any React or simulator-state integration work begins.

## Visual Target

The preview should look like a photographed simulator-grade cockpit overhead panel rather than a web app. It should use a grey-blue metal base, bolted subpanels, dense engraved typography, realistic screws, annunciator windows, red guarded switches, rotary selectors, toggle rows, analog gauges, and dark LCD-style numeric displays.

The visual priority is cockpit accuracy and professional density. Controls should not be enlarged for gameplay usability in this first pass. Tiny labels, close spacing, and repeated hardware patterns are intentional because they are part of the 737 overhead panel look.

## Scope

Included in the first preview:

- Full overhead-panel silhouette and fixed-proportion canvas.
- Major 737 overhead zones placed roughly like the provided reference image:
  - electrical
  - fuel
  - hydraulics
  - window heat
  - anti-ice
  - pressurization
  - air conditioning and bleed air
  - lighting
  - engine start
  - wipers
- Realistic static controls:
  - toggle switches
  - guarded red switches
  - square annunciator/buttons
  - rotary knobs
  - analog gauges
  - seven-segment numeric displays
  - screw heads and panel seams
- A few representative lit indicators in amber, blue, green, and white for visual realism.
- Embedded CSS only, with material effects such as bevels, inset shadows, subtle grain, and indicator glow.

Excluded from the first preview:

- React component changes.
- Simulator state wiring.
- Click behavior.
- Localization.
- Test-suite changes.
- App build or routing changes.

## File Shape

Create one standalone file:

`previews/737-overhead-static.html`

The file should contain plain HTML and embedded CSS. It must not depend on React, Vite, external libraries, external fonts, or network assets. It should be viewable by opening the file directly in a browser.

The internal structure should use reusable semantic CSS classes for repeated cockpit hardware, such as:

- `.overhead-shell`
- `.subpanel`
- `.panel-title`
- `.annunciator`
- `.toggle`
- `.guard`
- `.knob`
- `.gauge`
- `.seven-seg`
- `.screw`

These classes are only for the static preview. They do not need to match the current React component yet.

## Design Principles

1. **Reference-justified components:** Every visible control, gauge, annunciator, switch guard, seam, screw, and display must correspond to a visible element or repeated hardware pattern in the provided 737 overhead reference image. Do not invent decorative components just to fill space.
2. **Accuracy over usability:** The first artifact should feel like a professional cockpit reference, not a simplified game UI.
3. **Material realism:** Use layered CSS backgrounds, bevels, inner shadows, screw details, and subtle surface noise to make the panel feel physical.
4. **Dense hierarchy:** Labels should be small and highly structured. Section grouping should come from panel seams, hardware alignment, and annunciator placement visible in the reference.
5. **Self-contained preview:** Keep the file portable so it can be shared or opened without the development server.
6. **No behavior yet:** Static realism comes first. Interaction and React migration are future steps after visual approval.

## Reference Discipline

The preview must treat the provided 737 overhead photo as the authority for what belongs on the panel. If a component is included, it should be explainable as one of these:

- a directly represented item visible in the photo;
- a repeated item in a visible row or cluster, such as a switch bank, annunciator row, rotary group, or screw pattern;
- a simplified CSS rendering of a real 737 overhead subsystem area visible in the photo.

Avoid decorative filler, fantasy controls, generic aviation widgets, or components borrowed from unrelated aircraft panels.

## Validation

Validation for this first artifact is visual inspection:

1. Open `previews/737-overhead-static.html` directly in a browser.
2. Compare the overall density, subpanel placement, material feel, and hardware variety against the provided 737 overhead reference image.
3. Confirm it reads as a professional simulator-style 737 overhead panel before porting any design into `src/components/OverheadPanel.jsx`.
