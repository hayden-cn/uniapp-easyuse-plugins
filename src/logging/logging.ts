import type { App } from "vue";

type LoggingType = "info" | "warn" | "error" | "debug" | "log";

export type LoggingInterface = Pick<typeof window.console, LoggingType>;

class UniLogging implements LoggingInterface {
  private printer(type: LoggingType, message?: any, ...optionalParams: any[]) {
    console[type](message, ...optionalParams);
  }

  info(message?: any, ...optionalParams: any[]) {
    this.printer("info", message, ...optionalParams);
  }

  warn(message?: any, ...optionalParams: any[]) {
    this.printer("warn", message, ...optionalParams);
  }

  error(message?: any, ...optionalParams: any[]) {
    this.printer("error", message, ...optionalParams);
  }

  debug(message?: any, ...optionalParams: any[]) {
    this.printer("debug", message, ...optionalParams);
  }

  log(message?: any, ...optionalParams: any[]) {
    this.printer("log", message, ...optionalParams);
  }
}

class Logging {
  static instance: UniLogging;

  install(app: App) {
    if (!Logging.instance) {
      Logging.instance = new UniLogging();
    }
    app.config.globalProperties.$logging = Logging.instance;
  }
}

export function getLoggingInstance() {
  return new Proxy(Logging.instance, {
    get(target, p, receiver) {
      return Reflect.get(target, p, receiver);
    },
  });
}

export function createLogging() {
  return new Logging();
}
