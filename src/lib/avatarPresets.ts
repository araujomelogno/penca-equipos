// Predefined avatar options for user profile selection.
// Each has a unique id and a URL. Users can pick one from the gallery.

export interface AvatarPreset {
  id: string;
  url: string;
  label: string;
}

export const AVATAR_PRESETS: AvatarPreset[] = [
  { id: "octopus-gold", url: "/avatars/octopus-gold.svg", label: "Gold Octopus" },
  { id: "octopus-blue", url: "/avatars/octopus-blue.svg", label: "Blue Octopus" },
  { id: "octopus-coral", url: "/avatars/octopus-coral.svg", label: "Coral Octopus" },
  { id: "octopus-purple", url: "/avatars/octopus-purple.svg", label: "Wizard Octopus" },
  { id: "octopus-green", url: "/avatars/octopus-green.svg", label: "Green Octopus" },
  { id: "octopus-red", url: "/avatars/octopus-red.svg", label: "Pirate Octopus" },
  { id: "octopus-teal", url: "/avatars/octopus-teal.svg", label: "Nerdy Octopus" },
  { id: "octopus-orange", url: "/avatars/octopus-orange.svg", label: "Orange Octopus" },
  { id: "octopus-pink", url: "/avatars/octopus-pink.svg", label: "Royal Octopus" },
  { id: "octopus-navy", url: "/avatars/octopus-navy.svg", label: "Fancy Octopus" },
  { id: "octopus-mint", url: "/avatars/octopus-mint.svg", label: "Mint Octopus" },
  { id: "octopus-lavender", url: "/avatars/octopus-lavender.svg", label: "Chef Octopus" },
];

export function getPresetUrl(presetId: string): string | null {
  return AVATAR_PRESETS.find((p) => p.id === presetId)?.url ?? null;
}
