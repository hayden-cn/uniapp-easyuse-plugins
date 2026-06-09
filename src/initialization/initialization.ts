import type { App } from "vue";
import type { LoggingInterface } from "../logging/logging";

export type InitializationSetup = () => void | Promise<void>;

export type InitializationSetupObject = {
  order?: number;
  setup: InitializationSetup;
};

export type InitializationOptionOrSetup =
  | InitializationSetupObject
  | InitializationSetup;

interface InitializationOption {
  logging: LoggingInterface;
}

class UniInitialization {
  promise: Promise<void>;

  private called: boolean = false;

  private promiseResolve: any;

  private queue: (InitializationSetupObject & { cause: Error })[] = [];

  private logging: LoggingInterface;

  constructor(options: InitializationOption) {
    this.promise = new Promise((resolve) => {
      this.promiseResolve = resolve;
    });

    this.logging = options.logging;
  }

  private printWarn(...data: any[]) {}

  private printError(...data: any[]) {}

  register(fn: InitializationOptionOrSetup) {
    const task: InitializationSetupObject =
      typeof fn === "function" ? { setup: fn } : fn;
    const cause = new Error();
    cause.name = "UniInitializeError";
    this.queue.push({ ...task, cause });
  }

  async run() {
    if (this.called) {
      this.printWarn("请勿重复调用初始化方法");
      return;
    }
    this.called = true;
    const queue = this.queue.sort((a, b) => {
      const beforeOrder = a.order ?? 0;
      const afterOrder = b.order ?? 0;
      return beforeOrder - afterOrder;
    });

    for (const { setup, cause } of queue) {
      try {
        await setup();
      } catch (e) {
        const caused = e instanceof Error ? e : new Error(String(e));
        cause.cause = caused;
        const message = "初始化运行错误";
        const error = new Error(message, { cause: cause });
        this.printError(error);
      }
    }

    this.promiseResolve();
  }
}

class Initialization {
  static instance: UniInitialization;

  install(app: App, options?: InitializationOptionOrSetup) {
    if (!Initialization.instance) {
      Initialization.instance = new UniInitialization({
        logging: app.config.globalProperties.$logging,
      });
    }

    const defaultSetup = options || { setup: () => {} };
    Initialization.instance.register(defaultSetup);

    Object.defineProperty(app.config.globalProperties, "$init", {
      get() {
        return Initialization.instance;
      },
      enumerable: true,
      configurable: false,
    });
  }
}

export function createInitialization() {
  return new Initialization();
}

export function useInit() {
  const init = async () => {
    return Initialization.instance.promise;
  };

  return {
    init,
  };
}
