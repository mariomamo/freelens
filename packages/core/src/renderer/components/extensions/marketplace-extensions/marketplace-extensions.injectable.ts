/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { asyncComputed } from "@ogre-tools/injectable-react";
import requestMarketplaceExtensionsInjectable from "./request-marketplace-extensions.injectable";

export interface MarketplaceExtensionAuthor {
  name: string;
  surname?: string;
  github?: string;
  website?: string;
  email?: string;
}

export interface MarketplaceExtension {
  id: string;
  name: string;
  description: string;
  version: string;
  status: "official" | "community";
  repository?: string;
  authors?: MarketplaceExtensionAuthor[];
}

const marketplaceExtensionsInjectable = getInjectable({
  id: "marketplace-extensions",

  instantiate: (di) =>
    asyncComputed({
      getValueFromObservedPromise: di.inject(requestMarketplaceExtensionsInjectable),
      valueWhenPending: [],
    }),
});

export default marketplaceExtensionsInjectable;
