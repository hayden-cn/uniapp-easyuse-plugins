import type { App } from "vue";
import { getInitializationInstance } from "../initialization/initialization";
import { getLoggingInstance, type LoggingInterface } from "../logging/logging";
import { castArray, cloneDeep, merge } from "../utils";

export type RequestId = symbol | string | number;

type OmitBy<T, K extends keyof T> = Omit<T, K>;
type PickBy<T, K extends keyof T> = Pick<T, K>;

type UniAppRequestOptions = OmitBy<
  UniApp.RequestOptions,
  "success" | "fail" | "complete"
>;

/**
 * UniHttpRequest 请求配置
 */
export interface UniHttpRequestOptions extends UniAppRequestOptions {
  /**
   * 基础请求路径
   */
  baseURL?: string;

  /**
   * 查询参数，内置了一个简单的解析器，用于将参数对象转换为查询字符串
   */
  params?: AnyObject;

  /**
   * 控制查询参数格式化数组索引的设置
   *
   * 允许设置的值：true | false
   *
   * - 未设置: foo=bar&foo=bar
   * - true: foo[0]=bar&foo[1]=bar
   * - false: foo[]=bar&foo[]=bar
   */
  paramsIndexes?: boolean;

  /**
   * 使用 FormData 作为请求体
   *
   * 手工将 data 内容从 json 格式转化为 FormData 格式
   */
  useMultipartFormData?: boolean;

  /**
   * 请求拦截
   */
  interceptors?: InterceptOptions;

  /**
   * 竞态条件，使用字符串作为竞态条件判断值，若同一时间存在相同条件，则取消较旧的请求
   *
   * 允许设置的值： string | boolean | undefined
   * - 直接设置字符串表示当前使用的竞态条件
   * - 设置为 true 表示使用当前 URL 作为竞态条件
   * - 设置为 false 表示当前请求不使用竞态条件
   * - undefined 表示跳过当前竞态条件判断，使用下一个竞态条件
   * - 可以传入一个函数，动态的返回设置值，返回值遵循上述规则
   */
  raceCondition?:
    | string
    | boolean
    | ((options: UniHttpRequestOptions) => string | boolean | undefined);

  /**
   * 跳过初始化检查
   */
  skipInitialized?: boolean;

  /**
   * 请求id，用于取消请求
   */
  requestId?: RequestId;
}

/**
 * 请求拦截器
 */
export interface InterceptOptions {
  /**
   * 请求拦截
   */
  request?: (options: UniHttpRequestOptions) => UniHttpRequestOptions;
  /**
   * 响应拦截
   */
  response?: (
    response: UniApp.RequestSuccessCallbackResult,
    options: UniHttpRequestOptions,
  ) => UniApp.RequestSuccessCallbackResult;
}

/**
 * 快捷请求配置
 */
type QuickRequestOption = OmitBy<UniHttpRequestOptions, "method">;

/**
 * 快捷请求配置，无 url 参数
 */
type QuickRequestOptionWithoutUrl = OmitBy<QuickRequestOption, "url">;

/**
 * 文件上传请求配置
 */
type UploadFileOption = OmitBy<UniHttpRequestOptions, "method"> &
  PickBy<
    UniApp.UploadFileOption,
    "fileType" | "file" | "filePath" | "name" | "files" | "formData"
  >;

/**
 * 文件下载请求配置
 */
type DownloadFileOption = OmitBy<UniHttpRequestOptions, "method"> &
  PickBy<UniApp.DownloadFileOption, "filePath">;

/**
 * 请求全局配置
 */
type UniHttpRequestCommonOptions = OmitBy<
  UniHttpRequestOptions,
  "url" | "method" | "data" | "useMultipartFormData" | "skipInitialized"
>;

/**
 * Request 控制器状态存储
 */
class RequestController {
  #status: "pending" | "fulfilled" | "rejected" = "pending";

  #error?: Error | string;

  requestId: RequestId;

  constructor(
    private requestOptions: UniHttpRequestOptions,
    private controller: RequestTaskController,
  ) {
    const requestId = requestOptions.requestId ?? Symbol();
    requestOptions.requestId = requestId;
    this.requestId = requestId;
  }

  /**
   * 检查请求任务状态
   */
  checkStatus() {
    if (this.#status === "rejected") {
      const cause =
        this.#error instanceof Error
          ? this.#error
          : new Error(this.#error ?? "请求已被取消");

      const requestMethod = this.requestOptions.method;
      const requestUrl = this.requestOptions.url;
      const message = `请求 ${requestMethod} ${requestUrl} 已取消`;
      const error = new Error(message, { cause: cause });
      error.name = "RequestAbortError";
      throw error;
    }
  }

  private requestTask?: UniApp.RequestTask;

  /**
   * 连接请求任务
   *
   * @param requestTask
   * @param options
   */
  connect(
    requestTask: UniApp.RequestTask,
    options?: {
      raceCondition?: string | false;
    },
  ) {
    this.requestTask = requestTask;
    const raceCondition = options?.raceCondition;
    // 如果存在竞态条件，先查询已存在的请求，取消请求并移除请求任务
    // 再加入新的请求id
    if (raceCondition) {
      const existedRequestId = this.controller.getRaceRequestId(raceCondition);
      if (existedRequestId) {
        const controller = this.controller.get(existedRequestId);
        controller?.abort();
      }
      this.controller.setRaceRequestId(raceCondition, this.requestId);
    }
  }

  /**
   * 标记请求任务已完成
   */
  done() {
    if (this.#status === "pending") {
      this.#status = "fulfilled";
      this.controller.remove(this.requestId);
    }
  }

  /**
   * 标记请求任务被取消
   *
   * @param error
   */
  abort(error?: Error | string) {
    if (this.#status === "pending") {
      this.#error = error;
      this.#status = "rejected";
      this.requestTask?.abort();
      this.controller.remove(this.requestId);
    }
  }
}

/**
 * Request 任务控制器
 */
export class RequestTaskController {
  private controllerCollection: Map<RequestId, RequestController> = new Map();

  private racingRequestId: Map<string, RequestId> = new Map();

  createController(options: UniHttpRequestOptions) {
    const controller = new RequestController(options, this);
    const requestId = controller.requestId;
    this.controllerCollection.set(requestId, controller);
    return controller;
  }

  get(id: RequestId) {
    return this.controllerCollection.get(id);
  }

  setRaceRequestId(raceCondition: string, id: RequestId) {
    this.racingRequestId.set(raceCondition, id);
  }

  getRaceRequestId(raceCondition: string) {
    return this.racingRequestId.get(raceCondition);
  }

  keys() {
    return this.controllerCollection.keys();
  }

  remove(id: RequestId) {
    this.controllerCollection.delete(id);
    // 如果请求任务存在竞态条件，一并移除
    for (const [raceCondition, requestId] of this.racingRequestId.entries()) {
      if (requestId === id) {
        this.racingRequestId.delete(raceCondition);
      }
    }
  }
}

/**
 * uniapp request 封装
 */
export class UniHttpRequest {
  /**
   * 日志接口
   */
  private logging: LoggingInterface;

  /**
   * 系统初始化标识
   */
  private initialized: Promise<void>;

  /**
   *
   */
  private readonly config: UniHttpRequestCommonOptions;

  /**
   * 请求任务控制管理
   */
  private readonly requestTaskController: RequestTaskController;

  constructor(config: UniHttpRequestCommonOptions = {}) {
    this.logging = getLoggingInstance();
    this.initialized = getInitializationInstance().promise;
    this.config = Object.freeze(config);
    this.requestTaskController = new RequestTaskController();
  }

  /**
   * 手动组装 MultipartFormData，用于支持小程序上传文件或表单数据
   *
   * @param requestOptions
   */
  private parseMultipartFormData(requestOptions: UniHttpRequestOptions) {
    const fields = requestOptions.data as AnyObject;

    const boundary = `--------${Math.random().toString(16).substring(2)}`;
    let body = "";

    // 添加普通字段
    for (const [name, value] of Object.entries(fields)) {
      body +=
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="${name}"\r\n\r\n` +
        `${value}\r\n`;
    }

    // 结束边界
    body += `--${boundary}--\r\n`;

    const contentType = `multipart/form-data; boundary=${boundary}`;

    requestOptions.data = body;
    requestOptions.header["Content-Type"] = contentType;
  }

  /**
   * 解析竞态条件
   *
   * @param requestOptions
   * @returns
   */
  private parseRaceCondition(requestOptions: UniHttpRequestOptions) {
    let raceCondition = requestOptions.raceCondition;
    if (typeof raceCondition === "function") {
      raceCondition = raceCondition(requestOptions);
    }
    if (typeof raceCondition === "boolean") {
      raceCondition = raceCondition ? requestOptions.url : false;
    }

    if (
      typeof raceCondition === "string" ||
      typeof raceCondition === "undefined" ||
      raceCondition === false
    ) {
      return raceCondition;
    }

    this.logging.warn(
      `[UniHttpRequest] 竞态条件值类型错误，期待类型 string | false | undefined ，实际类型 %s ，跳过当前竞态条件`,
      typeof raceCondition,
    );
    return undefined;
  }

  /**
   * 准备请求，处理公共逻辑
   *
   * @param options 请求选项
   * @returns 准备好的请求数据
   */
  private async prepareRequest(options: UniHttpRequestOptions) {
    const controller = this.requestTaskController.createController(options);

    const skipInitialized = options.skipInitialized ?? false;
    if (!skipInitialized) {
      await this.initialized;
      controller.checkStatus();
    }

    const config = cloneDeep(this.config);
    const custom = cloneDeep(options);
    let requestOptions: UniHttpRequestOptions = merge({}, config, custom);
    requestOptions.header ??= {};

    // 类似于洋葱中间件拦截器，顺序如下：
    // 全局请求拦截 -> 独立请求拦截 -> 请求 -> 独立响应拦截 -> 全局响应拦截
    if (config.interceptors?.request) {
      requestOptions = config.interceptors.request(requestOptions);
    }
    if (custom.interceptors?.request) {
      requestOptions = custom.interceptors.request(requestOptions);
    }

    // 解析 url 查询参数
    let requestUrl = requestOptions.url;
    const [relativeUrl, searchString] = requestUrl.split("?");
    const searchParams = searchString ? searchString.split("&") : [];

    const { params = {}, useMultipartFormData } = requestOptions;

    const indexes = requestOptions.paramsIndexes;
    // 解析 params 查询参数
    for (const [key, value] of Object.entries(params)) {
      const isArrayValue = Array.isArray(value);
      const arrayValues = isArrayValue ? value : [value];

      for (const [index, param] of arrayValues.entries()) {
        if (isArrayValue === false || typeof indexes !== "boolean") {
          searchParams.push(`${key}=${encodeURIComponent(param)}`);
        } else if (indexes === true) {
          searchParams.push(`${key}[${index}]=${encodeURIComponent(param)}`);
        } else if (indexes === false) {
          searchParams.push(`${key}[]=${encodeURIComponent(param)}`);
        }
      }
    }

    // 添加 url 查询参数
    const queryString = searchParams.filter(Boolean).join("&");
    requestUrl = [relativeUrl, queryString].filter(Boolean).join("?");

    const baseUrl = config.baseURL ?? "";
    const absoluteUrlRegexp = /^(https?|ftp|file|wss?):\/\//i;
    const prefixUrl = absoluteUrlRegexp.test(requestUrl) ? "" : baseUrl;
    requestOptions.url = `${prefixUrl}${requestUrl}`;

    if (useMultipartFormData) {
      this.parseMultipartFormData(requestOptions);
    }

    // 解析竞态条件
    const raceCondition =
      this.parseRaceCondition({
        ...requestOptions,
        raceCondition: custom.raceCondition,
      }) ??
      this.parseRaceCondition({
        ...requestOptions,
        raceCondition: config.raceCondition,
      });

    // 在实际请求前，再次检查任务是否被取消
    controller.checkStatus();

    return { controller, config, custom, requestOptions, raceCondition };
  }

  /**
   * 处理响应拦截器
   */
  private applyResponseInterceptors<T>(
    response: T,
    requestOptions: UniHttpRequestOptions,
    custom: UniHttpRequestOptions,
    config: UniHttpRequestCommonOptions,
  ): T {
    let result = cloneDeep(response);
    if (custom.interceptors?.response) {
      result = custom.interceptors.response(
        result as unknown as UniApp.RequestSuccessCallbackResult,
        requestOptions,
      ) as unknown as T;
    }
    if (config.interceptors?.response) {
      result = config.interceptors.response(
        result as unknown as UniApp.RequestSuccessCallbackResult,
        requestOptions,
      ) as unknown as T;
    }
    return result;
  }

  /**
   * 创建请求错误
   */
  private createRequestError(
    err: UniApp.GeneralCallbackResult,
    failName: string,
    abortName: string,
    fallbackMessage: string,
  ): Error {
    const error = new Error(err.errMsg || fallbackMessage);
    error.name = failName;
    if (err.errMsg?.endsWith(":fail")) {
      error.name = failName;
    }
    if (err.errMsg?.endsWith(":abort")) {
      error.name = abortName;
    }
    return error;
  }

  /**
   * 通用 http 请求
   *
   * @param options
   * @returns
   */
  async httpRequest<T>(options: UniHttpRequestOptions) {
    const { controller, config, custom, requestOptions, raceCondition } =
      await this.prepareRequest(options);

    return new Promise<T>((resolve, reject) => {
      const requestTask = uni.request({
        ...requestOptions,
        success: (res) => {
          const response = this.applyResponseInterceptors(
            res,
            requestOptions,
            custom,
            config,
          );
          if (response.errMsg === "request:ok") {
            resolve(response.data as T);
          } else {
            reject(new Error(response.errMsg || "请求失败，未知错误"));
          }
        },
        fail: (err) => {
          reject(
            this.createRequestError(
              err,
              "RequestFailError",
              "RequestAbortError",
              "请求失败",
            ),
          );
        },
        complete: () => {
          controller.done();
        },
      });
      controller.connect(requestTask, { raceCondition });
    });
  }

  /**
   * 文件上传请求
   *
   * @param options
   * @returns
   */
  async uploadFile<T>(options: UploadFileOption) {
    const { controller, config, custom, requestOptions, raceCondition } =
      await this.prepareRequest(options);

    return new Promise<T>((resolve, reject) => {
      const requestTask = uni.uploadFile({
        ...requestOptions,
        success: (res) => {
          const contentType = res.header?.["Content-Type"];
          if (contentType?.includes("application/json")) {
            try {
              const data = res.data;
              res.data = typeof data === "string" ? JSON.parse(data) : data;
            } catch {}
          }
          const response = this.applyResponseInterceptors(
            res,
            requestOptions,
            custom,
            config,
          );
          if (response.errMsg === "uploadFile:ok") {
            resolve(response.data as T);
          } else {
            reject(new Error(response.errMsg || "请求失败，未知错误"));
          }
        },
        fail: (err) => {
          reject(
            this.createRequestError(
              err,
              "UploadFailError",
              "UploadAbortError",
              "上传失败",
            ),
          );
        },
        complete: () => {
          controller.done();
        },
      });
      controller.connect(requestTask, { raceCondition });
    });
  }

  /**
   * 文件下载请求
   *
   * @param options
   * @returns
   */
  async downloadFile(options: DownloadFileOption) {
    const { controller, config, custom, requestOptions, raceCondition } =
      await this.prepareRequest(options);

    return new Promise<UniApp.DownloadSuccessData>((resolve, reject) => {
      const requestTask = uni.downloadFile({
        ...requestOptions,
        success: (res) => {
          const response = this.applyResponseInterceptors(
            res,
            requestOptions,
            custom,
            config,
          );
          if (response.errMsg === "downloadFile:ok") {
            resolve(response);
          } else {
            reject(new Error(response.errMsg || "请求失败，未知错误"));
          }
        },
        fail: (err) => {
          reject(
            this.createRequestError(
              err,
              "DownloadFailError",
              "DownloadAbortError",
              "下载失败",
            ),
          );
        },
        complete: () => {
          controller.done();
        },
      });
      controller.connect(requestTask as unknown as UniApp.RequestTask, {
        raceCondition,
      });
    });
  }

  /**
   * 取消请求
   *
   * @param requestId
   *
   * @example
   *
   */
  cancel(requestId?: RequestId | RequestId[]) {
    const ids = requestId
      ? castArray(requestId)
      : this.requestTaskController.keys();

    const cause = new Error();
    cause.name = "UniHttpRequestCancel";
    for (const id of ids) {
      const controller = this.requestTaskController.get(id);
      controller?.abort(cause);
    }
  }

  /**
   * 解析快捷请求参数
   *
   * @param urlOrOption
   * @param alternativeOptions
   * @returns
   */
  private parseQuickOptions(
    urlOrOption: string | QuickRequestOption,
    alternativeOptions: QuickRequestOptionWithoutUrl = {},
  ) {
    const requestOption: QuickRequestOption =
      typeof urlOrOption === "string"
        ? { ...alternativeOptions, url: urlOrOption }
        : urlOrOption;
    return requestOption;
  }

  /**
   * GET 快捷请求
   *
   * @param options
   * @returns
   */
  async get<T>(options: QuickRequestOption): Promise<T>;
  async get<T>(url: string, options?: QuickRequestOptionWithoutUrl): Promise<T>;
  async get<T>(
    urlOrOption: string | QuickRequestOption,
    alternativeOptions: QuickRequestOptionWithoutUrl = {},
  ): Promise<T> {
    const options = this.parseQuickOptions(urlOrOption, alternativeOptions);
    return this.httpRequest<T>({ ...options, method: "GET" });
  }

  /**
   * POST 快捷请求
   *
   * @param options
   * @returns
   */
  async post<T>(options: QuickRequestOption): Promise<T>;
  async post<T>(
    url: string,
    options?: QuickRequestOptionWithoutUrl,
  ): Promise<T>;
  async post<T>(
    urlOrOption: string | QuickRequestOption,
    alternativeOptions: QuickRequestOptionWithoutUrl = {},
  ): Promise<T> {
    const options = this.parseQuickOptions(urlOrOption, alternativeOptions);
    return this.httpRequest<T>({ ...options, method: "POST" });
  }

  /**
   * PUT 快捷请求
   *
   * @param options
   * @returns
   */
  async put<T>(options: QuickRequestOption): Promise<T>;
  async put<T>(url: string, options: QuickRequestOptionWithoutUrl): Promise<T>;
  async put<T>(
    urlOrOption: string | QuickRequestOption,
    alternativeOptions: QuickRequestOptionWithoutUrl = {},
  ): Promise<T> {
    const options = this.parseQuickOptions(urlOrOption, alternativeOptions);
    return this.httpRequest<T>({ ...options, method: "PUT" });
  }

  /**
   * DELETE 快捷请求
   *
   * @param options
   * @returns
   */
  async delete<T>(options: QuickRequestOption): Promise<T>;
  async delete<T>(
    url: string,
    options: QuickRequestOptionWithoutUrl,
  ): Promise<T>;
  async delete<T>(
    urlOrOption: string | QuickRequestOption,
    alternativeOptions: QuickRequestOptionWithoutUrl = {},
  ): Promise<T> {
    const options = this.parseQuickOptions(urlOrOption, alternativeOptions);
    return this.httpRequest<T>({ ...options, method: "DELETE" });
  }
}

export type RequestOptions = UniHttpRequestCommonOptions;

class Request {
  static instance: UniHttpRequest;

  install(app: App, options: UniHttpRequestCommonOptions = {}) {
    if (!Request.instance) {
      Request.instance = new UniHttpRequest(options);
    }

    Object.defineProperty(app.config.globalProperties, "$request", {
      get() {
        return Request.instance;
      },
      enumerable: true,
      configurable: false,
    });
  }
}

export function createRequest() {
  return new Request();
}

export function getUniHttpRequestInstance() {
  return new Proxy({} as UniHttpRequest, {
    get(_, p, receiver) {
      return Reflect.get(Request.instance, p, receiver);
    },
  });
}
