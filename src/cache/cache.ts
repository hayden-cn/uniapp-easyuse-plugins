import type { App } from "vue";

export interface CacheOptions {
  /**
   * 缓存键名前缀
   */
  prefix?: string;
  /**
   * 缓存前缀与键名之间的分隔符，默认为短横线 '-'
   *
   * 如果未配置 prefix，delimiter 则不生效
   *
   * 如果不需要分隔符，可以配置为空字符串 ''
   */
  delimiter?: string;
}

export class UniCache {
  constructor(private options?: CacheOptions) {}

  getStorageKey(key: string) {
    const delimiter = this.options?.delimiter ?? "-";
    const prefix = this.options?.prefix;
    return prefix ? `${prefix}${delimiter}${key}` : key;
  }

  set(key: string, value: any, expire?: number) {
    const type = typeof value;
    const data = {
      type: type,
      value: value,
      expire: expire ? Date.now() + expire : null,
    };
    uni.setStorageSync(this.getStorageKey(key), data);
  }

  get<T = any>(key: string): T | undefined {
    const storageKey = this.getStorageKey(key);
    if (this.has(key)) {
      const content = uni.getStorageSync(storageKey);
      try {
        const data =
          typeof content === "string" ? JSON.parse(content) : content;
        const { value, expire } = data;
        if (expire && expire < Date.now()) {
          this.remove(key);
          return undefined;
        }
        return value;
      } catch {
        return content;
      }
    }
    return undefined;
  }

  has(key: string): boolean {
    const storageKey = this.getStorageKey(key);
    const storageInfo = uni.getStorageInfoSync();
    return storageInfo.keys.includes(storageKey);
  }

  remove(key: string) {
    uni.removeStorageSync(this.getStorageKey(key));
  }

  clear() {
    uni.clearStorageSync();
  }
}

class Cache {
  static instance: UniCache;

  install(app: App, options: CacheOptions = {}) {
    if (!Cache.instance) {
      Cache.instance = new UniCache(options);
    }
    app.config.globalProperties.$cache = Cache.instance;
  }
}

export function getCacheInstance(): UniCache {
  return new Proxy(Cache.instance, {
    get(target, p, receiver) {
      return Reflect.get(target, p, receiver);
    },
  });
}

export function createCache() {
  return new Cache();
}
