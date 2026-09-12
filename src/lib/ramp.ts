/* The hour scale.
 *
 * Twenty-four colours, midnight to midnight, running deep blue through dawn
 * to daylight and back. This is a DATA scale and not a set of theme tokens:
 * the colour means "it is 04:00 there", the same way the height of a bar
 * means a number. It lives in one file for the same reason the palette does.
 *
 * The scale carries meaning on its own, so nothing on the page depends on it
 * alone — every cell also states the hour, and the shared window is marked
 * with a border as well as a colour. */
export const RAMP = [
  "#0d1024", "#0e1128", "#10142d", "#131833", "#1a1f3e", "#26264c",
  "#3a2f55", "#56395a", "#7a4a58", "#9c6552", "#b8834f", "#cfa055",
  "#ddb96a", "#dcb264", "#cf9f58", "#bd8550", "#a3674f", "#824e56",
  "#5d3c5b", "#3e2f52", "#272543", "#181b36", "#11142c", "#0e1126",
] as const;

/** Readable text on that hour's colour: the four brightest need dark ink. */
export const rampInk = (hour: number) =>
  hour >= 11 && hour <= 14 ? "#2a1c14" : "#f2ece6";

export const hourColor = (hour: number) => RAMP[((hour % 24) + 24) % 24];
