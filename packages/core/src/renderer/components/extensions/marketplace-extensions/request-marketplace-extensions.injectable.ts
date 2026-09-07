/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) Maifee Ul Asad. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { loggerInjectionToken } from "@freelensapp/logger";
import { getInjectable } from "@ogre-tools/injectable";
import downloadJsonViaChannelInjectable from "../../../fetch/download-json-via-channel-copy.injectable";

import type { MarketplaceExtension, MarketplaceExtensionAuthor } from "./marketplace-extensions.injectable";

const extensionListUrl =
  "https://raw.githubusercontent.com/freelensapp/freelens-marketplace/refs/heads/main/extensions.json";

type MarketplaceExtensionStatus = "official" | "community";

interface MarketplaceAuthor {
  name: string;
  surname?: string;
  github?: string;
  website?: string;
  email?: string;
}

interface MarketplaceExtensionEntry {
  name: string;
  description: string;
  version: string;
  status: MarketplaceExtensionStatus;
  authors?: MarketplaceAuthor[];
}

interface MarketplaceExtensionsResponse {
  meta: {
    version: number;
  };
  extensions: MarketplaceExtensionEntry[];
}

// first change to lowercase then replace non-alphanumeric characters with underscores to create a id
const clean = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "_");

const isMarketplaceExtensionStatus = (value: unknown): value is MarketplaceExtensionStatus =>
  value === "official" || value === "community";

const isMarketplaceAuthor = (value: unknown): value is MarketplaceAuthor => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return typeof candidate.name === "string";
};

const isMarketplaceExtensionEntry = (value: unknown): value is MarketplaceExtensionEntry => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.name === "string" &&
    typeof candidate.description === "string" &&
    typeof candidate.version === "string" &&
    isMarketplaceExtensionStatus(candidate.status)
  );
};

const toMarketplaceExtension = ({
  name,
  description,
  version,
  status,
  authors,
}: MarketplaceExtensionEntry): MarketplaceExtension => {
  const parsedAuthors: MarketplaceExtensionAuthor[] | undefined = Array.isArray(authors)
    ? authors.filter(isMarketplaceAuthor).map((author) => ({
        name: author.name,
        surname: author.surname,
        github: author.github,
        website: author.website,
        email: author.email,
      }))
    : undefined;

  return {
    // id is computed from name and version to ensure uniqueness and stability across updates
    id: `${clean(name)}-${clean(version)}`,
    name,
    description,
    version,
    status,
    ...(parsedAuthors !== undefined ? { authors: parsedAuthors } : {}),
  };
};

const requestMarketplaceExtensionsInjectable = getInjectable({
  id: "request-marketplace-extensions",

  instantiate: (di) => {
    const downloadJson = di.inject(downloadJsonViaChannelInjectable);
    const logger = di.inject(loggerInjectionToken);

    return async (): Promise<MarketplaceExtension[]> => {
      const result = await downloadJson(extensionListUrl, {
        timeout: 10_000,
      });

      if (!result.callWasSuccessful) {
        logger.warn(`Failed to download marketplace extensions: ${result.error}`);

        return [];
      }

      const response = result.response as Partial<MarketplaceExtensionsResponse>;
      const extensions = Array.isArray(response.extensions) ? response.extensions : [];

      return extensions.filter(isMarketplaceExtensionEntry).map(toMarketplaceExtension);
    };
  },

  causesSideEffects: true,
});

export default requestMarketplaceExtensionsInjectable;
