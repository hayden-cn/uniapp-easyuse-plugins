import { onLoad } from "@dcloudio/uni-app";
import { ref } from "vue";

const stringifyQueryParams = (params: Record<string, any>) => {
  const results: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    const parsed = typeof value === "object" ? JSON.stringify(value) : value;
    results.push(`${key}=${parsed}`);
  }
  return results.join("&");
};

const parseQueryString = (options: Record<string, string>) => {
  const results: Record<string, string> = {};
  for (const [key, value] of Object.entries(options)) {
    try {
      const parsed = JSON.parse(value);
      results[key] = parsed;
    } catch {
      results[key] = value;
    }
  }
  return results;
};

export const useSimpleQueryString = () => {
  return { stringifyQueryParams, parseQueryString };
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
) => {
  const pageParameters = ref<T>({} as T);

  onLoad((options) => {
    pageParameters.value = parseQueryString(options || {});
    callback?.(pageParameters.value);
  });

  return pageParameters;
};
