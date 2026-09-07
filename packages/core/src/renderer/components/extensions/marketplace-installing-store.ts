import { observable } from "mobx";

const installingKeys = observable.set<string>();

export const markMarketplaceInstalling = (key: string): void => {
  installingKeys.add(key);
};

export const clearMarketplaceInstalling = (key: string): void => {
  installingKeys.delete(key);
};

export const isMarketplaceInstalling = (key: string): boolean => installingKeys.has(key);
