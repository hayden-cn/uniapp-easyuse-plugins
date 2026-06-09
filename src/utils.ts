type Many<T> = T | readonly T[];

export const cloneDeep = <T>(value: T): T => {
  if (value === null || typeof value !== "object") {
    return value;
  }
  if (value instanceof Date) {
    return new Date(value.getTime()) as T;
  }
  if (value instanceof RegExp) {
    return new RegExp(value.source, value.flags) as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => cloneDeep(item)) as T;
  }
  const result = {} as T;
  for (const key in value) {
    if (Object.hasOwn(value, key)) {
      result[key] = cloneDeep((value as any)[key]);
    }
  }
  return result;
};

export const merge = (target: any, ...sources: any[]): any => {
  for (const source of sources) {
    if (source == null) {
      continue;
    }
    for (const key in source) {
      if (Object.hasOwn(source, key)) {
        const targetVal = target[key];
        const sourceVal = source[key];
        if (
          sourceVal !== null &&
          typeof sourceVal === "object" &&
          !Array.isArray(sourceVal)
        ) {
          if (
            targetVal !== null &&
            typeof targetVal === "object" &&
            !Array.isArray(targetVal)
          ) {
            merge(targetVal, sourceVal);
          } else {
            target[key] = merge({}, sourceVal);
          }
        } else {
          target[key] = sourceVal;
        }
      }
    }
  }
  return target;
};

export const castArray = <T>(value?: Many<T>): T[] => {
  if (typeof value === "undefined" || value === null) {
    return [];
  }
  return Array.isArray(value) ? value : [value as T];
};

export const pick = <T extends object, U extends keyof T>(
  object: T,
  ...paths: Array<Many<U>>
): Pick<T, U> => {
  const result: any = {};
  const flatPaths = paths.flat();
  for (const path of flatPaths) {
    const key = path as keyof T;
    if (key in object) {
      result[key] = object[key];
    }
  }
  return result;
};
