/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "@testing-library/jest-dom";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { observable, runInAction, when } from "mobx";
import React from "react";
import directoryForDownloadsInjectable from "../../../../common/app-paths/directory-for-downloads/directory-for-downloads.injectable";
import directoryForUserDataInjectable from "../../../../common/app-paths/directory-for-user-data/directory-for-user-data.injectable";
import removePathInjectable from "../../../../common/fs/remove.injectable";
import extensionDiscoveryInjectable from "../../../../extensions/extension-discovery/extension-discovery.injectable";
import extensionInstallationStateStoreInjectable from "../../../../extensions/extension-installation-state-store/extension-installation-state-store.injectable";
import extensionLoaderInjectable from "../../../../extensions/extension-loader/extension-loader.injectable";
import { getDiForUnitTesting } from "../../../getDiForUnitTesting";
import currentlyInClusterFrameInjectable from "../../../routes/currently-in-cluster-frame.injectable";
import { ConfirmDialog } from "../../confirm-dialog";
import { renderFor } from "../../test-utils/renderFor";
import { Extensions } from "../extensions";
import installExtensionFromInputInjectable from "../install-extension-from-input.injectable";
import requestMarketplaceExtensionsInjectable from "../marketplace-extensions/request-marketplace-extensions.injectable";

import type { DiContainer } from "@ogre-tools/injectable";

import type { RemovePath } from "../../../../common/fs/remove.injectable";
import type { ExtensionDiscovery } from "../../../../extensions/extension-discovery/extension-discovery";
import type { ExtensionInstallationStateStore } from "../../../../extensions/extension-installation-state-store/extension-installation-state-store";
import type { ExtensionLoader } from "../../../../extensions/extension-loader";
import type { DownloadBinary } from "../../../../main/fetch/download-binary.injectable";
import type { DiRender } from "../../test-utils/renderFor";
import type { InstallExtensionFromInput } from "../install-extension-from-input.injectable";
import type { MarketplaceExtension } from "../marketplace-extensions/marketplace-extensions.injectable";

const marketplaceMockExtension = (overrides?: Partial<MarketplaceExtension>): MarketplaceExtension => ({
  id: "test_extension",
  name: "test",
  description: "Test marketplace extension",
  version: "2.0.0",
  status: "official",
  ...overrides,
});

describe("Extensions", () => {
  let extensionLoader: ExtensionLoader;
  let extensionDiscovery: ExtensionDiscovery;
  let installExtensionFromInput: jest.MockedFunction<InstallExtensionFromInput>;
  let extensionInstallationStateStore: ExtensionInstallationStateStore;
  let render: DiRender;
  let deleteFileMock: jest.MockedFunction<RemovePath>;
  let downloadBinary: jest.MockedFunction<DownloadBinary>;
  let di: DiContainer;

  beforeEach(() => {
    try {
      localStorage.clear();

      di = getDiForUnitTesting();

      di.override(directoryForUserDataInjectable, () => "some-directory-for-user-data");
      di.override(directoryForDownloadsInjectable, () => "some-directory-for-downloads");
      di.override(currentlyInClusterFrameInjectable, () => false);

      render = renderFor(di);

      installExtensionFromInput = jest.fn();
      di.override(installExtensionFromInputInjectable, () => installExtensionFromInput);

      di.override(requestMarketplaceExtensionsInjectable, () => async () => [marketplaceMockExtension()]);

      deleteFileMock = jest.fn();
      di.override(removePathInjectable, () => deleteFileMock);

      downloadBinary = jest.fn().mockImplementation((url) => {
        throw new Error(`Unexpected call to downloadJson for url=${url}`);
      });

      extensionLoader = di.inject(extensionLoaderInjectable);
      extensionDiscovery = di.inject(extensionDiscoveryInjectable);
      extensionInstallationStateStore = di.inject(extensionInstallationStateStoreInjectable);

      extensionLoader.addExtension({
        id: "extensionId",
        manifest: {
          name: "test",
          version: "1.2.3",
          engines: { freelens: "^0.1.0" },
        },
        absolutePath: "/absolute/path",
        manifestPath: "/symlinked/path/package.json",
        isBundled: false,
        isEnabled: true,
        isCompatible: true,
      });

      extensionDiscovery.uninstallExtension = jest.fn(() => Promise.resolve());
    } catch (e) {
      console.error(e);
      throw e;
    }
  });

  it("disables uninstall button while uninstalling", async () => {
    extensionDiscovery.isLoaded = true;

    render(
      <>
        <Extensions />
        <ConfirmDialog />
      </>,
    );

    const card = await screen.findByTestId("installed-extension-card");
    const uninstallButton = within(card).getByRole("button", { name: /uninstall/i });
    fireEvent.click(uninstallButton);

    fireEvent.click(await screen.findByText("Yes"));

    await waitFor(
      () => {
        expect(extensionDiscovery.uninstallExtension).toHaveBeenCalled();
        const button = within(card).getByRole("button");
        expect(button).toBeDisabled();
        expect(button.querySelector(".Spinner")).toBeInTheDocument();
      },
      {
        timeout: 30000,
      },
    );
  });

  it("disables install button while installing", async () => {
    render(<Extensions />);

    const resolveInstall = observable.box(false);
    const url = "https://test.extensionurl/package.tgz";

    deleteFileMock.mockReturnValue(Promise.resolve());
    installExtensionFromInput.mockImplementation(async (input) => {
      expect(input).toBe("https://test.extensionurl/package.tgz");

      const clear = extensionInstallationStateStore.startPreInstall();

      await when(() => resolveInstall.get());
      clear();
    });

    fireEvent.change(
      await screen.findByPlaceholderText("File path or URL", {
        exact: false,
      }),
      {
        target: {
          value: url,
        },
      },
    );

    const doResolve = observable.box(false);

    downloadBinary.mockImplementation(async (targetUrl) => {
      expect(targetUrl).toBe(url);

      await when(() => doResolve.get());

      return {
        callWasSuccessful: false,
        error: "unknown location",
      };
    });

    fireEvent.click(await screen.findByText("Install"));
    expect((await screen.findByText("Install")).closest("button")).toBeDisabled();
    doResolve.set(true);
  });

  it("displays spinner while extensions are loading", () => {
    extensionDiscovery.isLoaded = false;
    const { container } = render(<Extensions />);

    expect(container.querySelector(".Spinner")).toBeInTheDocument();
  });

  it("does not display the spinner while extensions are not loading", async () => {
    extensionDiscovery.isLoaded = true;
    const { container } = render(<Extensions />);

    expect(container.querySelector(".Spinner")).not.toBeInTheDocument();
  });

  it("shows Update button in the marketplace when a newer version is available", async () => {
    render(<Extensions />);

    fireEvent.click(await screen.findByText("Marketplace"));

    const updateButton = await screen.findByRole("button", { name: /update/i });
    expect(updateButton).toBeInTheDocument();
  });

  it("installs the new version when Update is clicked in the marketplace", async () => {
    installExtensionFromInput.mockImplementation(async () => {});

    render(<Extensions />);

    fireEvent.click(await screen.findByText("Marketplace"));

    fireEvent.click(await screen.findByRole("button", { name: /update/i }));

    await waitFor(() => {
      expect(installExtensionFromInput).toHaveBeenCalledWith("test@2.0.0");
    });

    // complete the update so the pending update tracking settles
    runInAction(() => {
      extensionLoader.addExtension({
        id: "extensionId",
        manifest: {
          name: "test",
          version: "2.0.0",
          engines: { freelens: "^0.1.0" },
        },
        absolutePath: "/absolute/path",
        manifestPath: "/symlinked/path/package.json",
        isBundled: false,
        isEnabled: true,
        isCompatible: true,
      });
    });
  });

  it("keeps showing the Update spinner while the update is in progress and shows Uninstall when it completes", async () => {
    installExtensionFromInput.mockImplementation(async () => {});

    render(<Extensions />);

    fireEvent.click(await screen.findByText("Marketplace"));

    fireEvent.click(await screen.findByRole("button", { name: /update/i }));

    // simulate the uninstall phase of the update: the extension is removed from the loader
    runInAction(() => {
      extensionLoader.removeExtension("extensionId");
    });

    const card = await screen.findByTestId("marketplace-extension-card");
    const button = within(card).getByRole("button");

    expect(button).toBeDisabled();
    expect(button.querySelector(".Spinner")).toBeInTheDocument();
    expect(within(card).queryByRole("button", { name: /install/i })).not.toBeInTheDocument();
    expect(within(card).queryByRole("button", { name: /update/i })).not.toBeInTheDocument();

    // simulate the reinstall phase: the extension is back at the new version
    runInAction(() => {
      extensionLoader.addExtension({
        id: "extensionId",
        manifest: {
          name: "test",
          version: "2.0.0",
          engines: { freelens: "^0.1.0" },
        },
        absolutePath: "/absolute/path",
        manifestPath: "/symlinked/path/package.json",
        isBundled: false,
        isEnabled: true,
        isCompatible: true,
      });
    });

    const uninstallButton = await within(await screen.findByTestId("installed-extension-card")).findByRole("button", {
      name: /uninstall/i,
    });
    expect(uninstallButton).toBeInTheDocument();
  });

  it("renders the package title as a link when the marketplace extension has a repository", async () => {
    di.override(requestMarketplaceExtensionsInjectable, () => async () => [
      marketplaceMockExtension({ repository: "https://github.com/foo/bar" }),
    ]);

    render(<Extensions />);

    fireEvent.click(await screen.findByText("Marketplace"));

    expect(await screen.findByTestId("extension-package-title-link")).toBeInTheDocument();
  });

  it("stays on the marketplace tab after uninstalling an extension from the marketplace", async () => {
    di.override(requestMarketplaceExtensionsInjectable, () => async () => [
      marketplaceMockExtension({ version: "1.2.3" }),
    ]);

    render(
      <>
        <Extensions />
        <ConfirmDialog />
      </>,
    );

    fireEvent.click(await screen.findByText("Marketplace"));

    fireEvent.click(await screen.findByRole("button", { name: /uninstall/i }));
    fireEvent.click(await screen.findByText("Yes"));

    // complete the uninstall by removing the extension from the loader
    runInAction(() => {
      extensionLoader.removeExtension("extensionId");
    });

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Search Extensions...")).toBeInTheDocument();
    });
  });

  it("stays on the marketplace tab after the Extensions page remounts", async () => {
    const { unmount } = render(<Extensions />);

    fireEvent.click(await screen.findByText("Marketplace"));

    await screen.findByPlaceholderText("Search Extensions...");

    unmount();

    render(<Extensions />);

    expect(await screen.findByPlaceholderText("Search Extensions...")).toBeInTheDocument();
  });

  it("allows uninstalling an extension with an available update from the card menu", async () => {
    render(
      <>
        <Extensions />
        <ConfirmDialog />
      </>,
    );

    fireEvent.click(await screen.findByText("Marketplace"));

    const card = await screen.findByTestId("installed-extension-card");
    const menuTrigger = within(card).getByText("more_vert");

    fireEvent.click(menuTrigger);

    fireEvent.click(await screen.findByText("Uninstall"));

    fireEvent.click(await screen.findByText("Yes"));

    await waitFor(() => {
      expect(extensionDiscovery.uninstallExtension).toHaveBeenCalledWith("extensionId");
    });
  });

  it("shows Uninstall button in the marketplace when the installed version is up to date", async () => {
    di.override(requestMarketplaceExtensionsInjectable, () => async () => [
      marketplaceMockExtension({ version: "1.2.3" }),
    ]);

    render(<Extensions />);

    fireEvent.click(await screen.findByText("Marketplace"));

    const uninstallButton = await screen.findByRole("button", { name: /uninstall/i });
    expect(uninstallButton).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /update/i })).not.toBeInTheDocument();
  });
});
