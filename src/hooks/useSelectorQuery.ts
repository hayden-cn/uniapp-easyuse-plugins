import { getCurrentInstance, onMounted, ref } from "vue";

export const useSelectorQuery = (
  callback?: (query: UniNamespace.SelectorQuery) => void,
) => {
  const selectorQuery = ref<UniNamespace.SelectorQuery>();

  onMounted(() => {
    const instance = getCurrentInstance()?.proxy;
    selectorQuery.value = uni.createSelectorQuery().in(instance);
    callback?.(selectorQuery.value);
  });

  return selectorQuery.value;
};

export const useGlobalSelectorQuery = (
  callback?: (query: UniNamespace.SelectorQuery) => void,
) => {
  const selectorQuery = ref<UniNamespace.SelectorQuery>();

  onMounted(() => {
    selectorQuery.value = uni.createSelectorQuery();
    callback?.(selectorQuery.value);
  });

  return selectorQuery.value;
};
