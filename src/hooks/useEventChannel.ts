import { getCurrentInstance, onMounted, ref } from "vue";

declare module "vue" {
  interface ComponentCustomProperties {
    getOpenerEventChannel: () => UniApp.EventChannel;
  }
}

export const useEventChannel = (
  effect?: (eventChannel: UniApp.EventChannel) => void,
): UniApp.EventChannel => {
  const $eventChannel = ref<UniApp.EventChannel>();

  const eventChannel = new Proxy({} as UniApp.EventChannel, {
    get(_, p, receiver) {
      if ($eventChannel.value) {
        return Reflect.get($eventChannel.value, p, receiver);
      }
      return (key: string) => {
        console.warn(`${p.toString()}("${key}") 未获取到 eventChannel 实例`);
      };
    },
  });

  onMounted(() => {
    const instance = getCurrentInstance()?.proxy;
    $eventChannel.value = instance?.getOpenerEventChannel();
    effect?.(eventChannel);
  });

  return eventChannel;
};
