// =============================================================================
// narrator.ts – Hardcoded narrator string templates for WLT
// All templates follow film-noir 1930s crime-boss narration style.
// The server picks a random string from the matching array and substitutes
// {victim} with the actual player name before broadcasting.
// =============================================================================

/** Templates for when a kill succeeded (no save) */
export const KILL_TEMPLATES: string[] = [
  "Rain hammered the pavement last night... and it washed away more than just the grime. {victim} caught a one-way ticket to the morgue. A single shot — clean, professional. The city doesn't mourn its own.",
  "Neon flickered like a dying pulse. {victim} walked the wrong alley at the wrong hour. Shadows moved. Now there's one less voice in the rain.",
  "A scream swallowed by thunder. {victim}'s luck ran dry — the syndicate doesn't forgive debts. Dawn found only echoes and blood.",
  "The night took its toll. {victim} paid the price for knowing too much... or too little. Another ghost for the city to forget.",
];

/** Templates for when a kill was attempted but the Doctor saved the target */
export const SAVE_TEMPLATES: string[] = [
  "The trigger was pulled, the blade flashed... but fate had other plans. {victim} should be cold by now — yet here they stand, breathing, courtesy of a shadow with a syringe. The medic moves quietly in this town.",
  "Death came knocking last night, but someone answered the door first. {victim} stares at the ceiling instead of lying under it. A life spared... for now.",
  "Blood was supposed to spill. Instead, a needle did its work. {victim} lives — barely. The underground doc just bought them another sunrise.",
];

/** Templates for when no kill happened (mafia held back or no mafia) */
export const NO_KILL_TEMPLATES: string[] = [
  "The night passed quiet. Too quiet. No bodies in the gutters, no fresh chalk outlines. The syndicate held its breath... or its fire. For now.",
  "Dawn breaks clean. No screams, no sirens. The rain fell on living shoulders this time. Suspicion thickens like fog.",
  "The city slept uneasy, but no one paid the ultimate price. Yet. The wolves are circling... just not striking. Yet.",
];

/** Transition lines appended at day start (always broadcast after main text) */
export const DAY_START_TEMPLATES: string[] = [
  "The city wakes... bruised, wary, hungry for answers. Time to talk. Time to accuse. Time to vote. Who lies tonight?",
  "Sun cuts through the haze. Secrets don't die easy in this town. Speak now — or let the noose decide.",
];

/**
 * Pick a random narrator string for the given night outcome.
 * Returns the main narration + day-start transition joined with a newline.
 * @param outcome - type of what happened during the night
 * @param victimName - name to substitute for {victim} placeholder
 */
export function getNarratorText(
  outcome: 'killed' | 'saved' | 'no_kill',
  victimName: string | null
): string {
  let templates: string[];

  switch (outcome) {
    case 'killed':
      templates = KILL_TEMPLATES;
      break;
    case 'saved':
      templates = SAVE_TEMPLATES;
      break;
    case 'no_kill':
    default:
      templates = NO_KILL_TEMPLATES;
      break;
  }

  const mainText = templates[Math.floor(Math.random() * templates.length)];
  const dayText =
    DAY_START_TEMPLATES[Math.floor(Math.random() * DAY_START_TEMPLATES.length)];

  // Replace {victim} placeholder with actual player name
  const resolvedMain = victimName
    ? mainText.replace(/{victim}/g, victimName)
    : mainText;

  return `${resolvedMain}\n\n${dayText}`;
}
