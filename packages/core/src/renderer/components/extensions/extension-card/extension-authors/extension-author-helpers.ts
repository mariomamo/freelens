import type { MarketplaceExtensionAuthor } from "../../marketplace-extensions/marketplace-extensions.injectable";

export const initialsOf = (author: MarketplaceExtensionAuthor): string => {
  const first = author.name[0] ?? "";
  const second = author.surname?.[0] ?? "";
  return (first + second).toUpperCase();
};

export const fullNameOf = (author: MarketplaceExtensionAuthor): string =>
  author.surname ? `${author.name} ${author.surname}` : author.name;

// Marketplace data may provide URLs without a scheme (e.g. "www.example.com")
export const toHttpUrl = (url: string): string => {
  const trimmed = url.trim();

  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
};

export type AvatarPaletteClass =
  | "avatarEmerald"
  | "avatarCyan"
  | "avatarPurple"
  | "avatarRose"
  | "avatarAmber"
  | "avatarBlue"
  | "avatarPink"
  | "avatarSlate";

export const AVATAR_PALETTE: AvatarPaletteClass[] = [
  "avatarEmerald",
  "avatarCyan",
  "avatarPurple",
  "avatarRose",
  "avatarAmber",
  "avatarBlue",
  "avatarPink",
  "avatarSlate",
];

export const avatarClassFor = (name: string): AvatarPaletteClass =>
  AVATAR_PALETTE[name.charCodeAt(0) % AVATAR_PALETTE.length];

export const authorKey = (author: MarketplaceExtensionAuthor): string => `${author.name}-${author.surname ?? ""}`;
