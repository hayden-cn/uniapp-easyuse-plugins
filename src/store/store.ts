import { type App, type Ref, ref, toRaw, watch } from "vue";
import { cloneDeep } from "../utils";

declare global {
  interface GlobalStoreValue {}
}

export interface StoreOptions {
  /**
   * 初始值
   */
  initialValue?: GlobalStoreValue | (() => GlobalStoreValue);
  /**
   * store 更新时触发
   */
  onUpdate?: (
    value: GlobalStoreValue,
    oldValue: GlobalStoreValue,
    onCleanup: (cleanupFn: () => void) => void,
  ) => void;
}

export class Store {
  static instance: Ref<GlobalStoreValue>;

  install(app: App, options?: StoreOptions) {
    const initialValue =
      typeof options?.initialValue === "function"
        ? options.initialValue()
        : (options?.initialValue ?? ({} as GlobalStoreValue));

    if (!Store.instance) {
      Store.instance = ref<GlobalStoreValue>(initialValue);
    }

    const store = Store.instance;

    const callback = options?.onUpdate ?? (() => {});
    let lastStoreValue: GlobalStoreValue = cloneDeep(toRaw(store.value));
    watch(
      store,
      (value, _, onCleanup) => {
        const currentValue = cloneDeep(toRaw(value));
        callback(currentValue, cloneDeep(lastStoreValue), onCleanup);
        lastStoreValue = currentValue;
      },
      { deep: true },
    );

    Object.defineProperty(app.config.globalProperties, "$store", {
      get() {
        return store.value;
      },
      enumerable: true,
      configurable: false,
    });
  }
}

export function createStore() {
  return new Store();
}

export function useStore(): Ref<GlobalStoreValue> {
  return Store.instance;
}
