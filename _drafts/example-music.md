---
title: Example — a fifth, a semitone, and 700 cents
description: An example music entry kept in drafts. It proves the audio element, both front-matter forms for a recording, and mathematics in a music entry.
date: 2026-11-22 09:00:00 -0500
topic: music
audio:
  title: Example recording
  src: /assets/audio/example-tone.mp3
  note: A placeholder tone, so the player has something to load. Replace the source with the recording.
---

> **Example draft.** Not published. This one proves the audio element and the music path through the layout.

An octave is a factor of two. Everything else in tuning is a decision about how to divide that factor, and the arithmetic is small enough to hold in your head once it is written as logarithms.

## Cents

Take the interval between two frequencies and measure it in cents:

$$
c = 1200 \log_2 \frac{f_2}{f_1}.
$$

An octave is 1200 cents by construction, a semitone in equal temperament is 100, and a just perfect fifth — the ratio $3{:}2$ — comes out at

$$
1200 \log_2 \tfrac{3}{2} \approx 701.955 \text{ cents}.
$$

The four cent gap to equal temperament's 700 is not a rounding error. It accumulates: twelve just fifths overshoot seven octaves by about 23.5 cents, which is why a keyboard has to be tuned to a compromise rather than to the ratios.

<figure>
  <img src="/assets/art/orbits.png" alt="Two rough black ink rings cross a vermilion disc." width="1902" height="827">
  <figcaption>Placeholder artwork. A real entry puts a spectrum, a score detail or a photograph of the instrument here.</figcaption>
</figure>

## The other audio form

A recording can also arrive as an embed, for a player that is hosted elsewhere. In front matter that is:

```yaml
audio:
  title: Étude, first pass
  embed: https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/TRACK_ID
  note: Recorded in one take, no edits.
```

The layout renders either form in the same place, above the prose.
