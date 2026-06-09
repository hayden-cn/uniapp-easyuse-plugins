import type { App } from "vue";
import {
  type CacheOptions,
  createCache,
  getCacheInstance,
} from "./cache/cache";
import {
  createInitialization,
  type InitializationSetup,
} from "./initialization/initialization";
import { createLogging } from "./logging/logging";
import { createRequest, type RequestOptions } from "./request/request";
import { createRouter, type RouterOptions } from "./router/router";
import { createStore, type StoreOptions } from "./store/store";

export type AppConfigOptions = {
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

export function defineOptions(options: AppConfigOptions) {
  return options;
}

export function registerPlugins(app: App, options: AppConfigOptions) {
  // 缓存
  app.use(createCache(), options.cache);
  // 日志
  app.use(createLogging());
  // 初始化
  app.use(createInitialization(), options.init);
  // 状态
  app.use(createStore(), options.store);
  // 请求
  app.use(createRequest(), options.request);
  // 路由
  app.use(createRouter(), options.router);

  const callInit = () => {
    app.config.globalProperties.$init.run();
  };

  const registerInitSetup = () => {};

  return {
    callInit,
    registerInitSetup,
  };
}

export const cache = getCacheInstance();
