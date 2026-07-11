import { onLoad } from "@dcloudio/uni-app";
import type { Ref } from "vue";
import { ref } from "vue";

export const stringifyQueryParams = (params: Record<string, any>): string => {
  const results: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    const serialized =
      typeof value === "object" ? JSON.stringify(value) : String(value);
    results.push(
      `${encodeURIComponent(key)}=${encodeURIComponent(serialized)}`,
    );
  }
  return results.join("&");
};

export const parseQueryString = (
  options: Record<string, string>,
): Record<string, any> => {
  const results: Record<string, any> = {};
  for (const [key, value] of Object.entries(options)) {
    const decodeKey = decodeURIComponent(key);
    const decodeValue = decodeURIComponent(value);
    if (/^\d{15,}$/.test(decodeValue)) {
      results[decodeKey] = decodeValue;
    } else {
      try {
        results[decodeKey] = JSON.parse(decodeValue);
      } catch {
        results[decodeKey] = decodeValue;
      }
    }
  }
  return results;
};

/**
 * 自动解析页面参数
 *
 * 推荐使用 useSimpleQueryString 生成页面参数
 *
 * @example
 * const { stringifyQueryParams } = useSimpleQueryString()
 * const params = {}
 * uni.navigateTo({ url: `/pages/to/path?${stringifyQueryParams(params)}` })
 */
export const usePageParameters = <T extends AnyObject = AnyObject>(
  callback?: (options: T) => void,
): Ref<T> => {
  const pageParameters = ref<T>({} as T) as Ref<T>;

  onLoad((options) => {
    pageParameters.value = parseQueryString(options || {}) as T;
    callback?.(pageParameters.value);
  });

  return pageParameters;
};
