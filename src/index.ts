import type { App } from "vue";
import {
  type CacheOptions,
  createCache,
  getCacheInstance,
} from "./cache/cache";
import {
  createInitialization,
  getInitializationInstance,
  type InitializationSetup,
} from "./initialization/initialization";
import { createLogging } from "./logging/logging";
import { createRequest, type RequestOptions } from "./request/request";
import { createRouter, type RouterOptions } from "./router/router";
import { createStore, type StoreOptions } from "./store/store";

export type AppConfig = {
  /**
   * 全局缓存配置
   */
  cache?: CacheOptions;

  /**
   * 应用初始化设置
   */
  init?: InitializationSetup;

  /**
   * 全局状态管理
   */
  store?: StoreOptions;

  /**
   * 全局请求配置
   */
  request?: RequestOptions;

  /**
   * 路由配置
   */
  router?: RouterOptions;
};

export function defineConfig(config: AppConfig | ((app: App) => AppConfig)) {
  return config;
}

export function registerPlugins(
  app: App,
  config: AppConfig | ((app: App) => AppConfig),
) {
  // 解析 app config
  const appConfig = typeof config === "function" ? config(app) : config;

  // 缓存
  app.use(createCache(), appConfig.cache);
  // 日志
  app.use(createLogging());
  // 初始化
  app.use(createInitialization(), appConfig.init);
  // 状态
  app.use(createStore(), appConfig.store);
  // 请求
  app.use(createRequest(), appConfig.request);
  // 路由
  app.use(createRouter(), appConfig.router);

  const initializationInstance = getInitializationInstance();
  const callInit = initializationInstance.run;
  const registerInitSetup = initializationInstance.register;

  return {
    callInit,
    registerInitSetup,
  };
}

export const cache = getCacheInstance();
