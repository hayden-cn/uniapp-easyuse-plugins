import type { App } from "vue";

type LoggingType = "info" | "warn" | "error" | "debug" | "log";

export type LoggingInterface = Pick<typeof window.console, LoggingType>;

function print(type: LoggingType, message?: any, ...optionalParams: any[]) {
  console[type](message, ...optionalParams);
}

class UniLogging implements LoggingInterface {
  info(message?: any, ...optionalParams: any[]) {
    print("info", message, ...optionalParams);
  }

  warn(message?: any, ...optionalParams: any[]) {
    print("warn", message, ...optionalParams);
  }

  error(message?: any, ...optionalParams: any[]) {
    print("error", message, ...optionalParams);
  }

  debug(message?: any, ...optionalParams: any[]) {
    print("debug", message, ...optionalParams);
  }

  log(message?: any, ...optionalParams: any[]) {
    print("log", message, ...optionalParams);
  }
}

class Logging {
  static instance: UniLogging;

  install(app: App) {
    if (!Logging.instance) {
      Logging.instance = new UniLogging();
    }

    Object.defineProperty(app.config.globalProperties, "$logging", {
      get() {
        return Logging.instance;
      },
      enumerable: true,
      configurable: false,
    });
  }
}

export function getLoggingInstance() {
  return new Proxy({} as UniLogging, {
    get(_, p, receiver) {
      return Reflect.get(Logging.instance, p, receiver);
    },
  });
}

export function createLogging() {
  return new Logging();
}
