/** Dicebear 7.x styles we expose in Settings (all support `seed`). */
export const NEST_AVATAR_STYLES = [
  { id: "lorelei", label: "Lorelei" },
  { id: "adventurer", label: "Adventurer" },
  { id: "notionists", label: "Notionists" },
  { id: "open-peeps", label: "Open peeps" },
  { id: "thumbs", label: "Thumbs" },
  { id: "pixel-art", label: "Pixel" },
] as const

export type NestAvatarStyleId = (typeof NEST_AVATAR_STYLES)[number]["id"]

export type NestUserAvatar = {
  style: NestAvatarStyleId
  seed: string
}

const STYLE_SET = new Set<string>(NEST_AVATAR_STYLES.map((s) => s.id))

export function isNestAvatarStyle(id: string): id is NestAvatarStyleId {
  return STYLE_SET.has(id)
}

export function nestAvatarImageUrl(
  avatar: NestUserAvatar | null | undefined,
  fallbackSeed: string
): string {
  const style = avatar?.style && isNestAvatarStyle(avatar.style)
    ? avatar.style
    : "lorelei"
  const seed = (avatar?.seed?.trim() || fallbackSeed || "nest").slice(0, 80)
  return `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(seed)}`
}
