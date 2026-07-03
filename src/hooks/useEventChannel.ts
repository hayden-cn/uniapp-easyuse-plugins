import { getCurrentInstance, onMounted, ref } from "vue";

declare module "vue" {
  interface ComponentCustomProperties {
    getOpenerEventChannel: () => UniNamespace.EventChannel;
  }
}

export const useEventChannel = (
  effect?: (eventChannel: UniNamespace.EventChannel) => void,
): UniNamespace.EventChannel => {
  const $eventChannel = ref<UniNamespace.EventChannel>();

  const assetEventChannel = () => {
    if ($eventChannel.value) {
      console.warn(`未获取到 eventChannel 实例`);
    }
  };

  const eventChannel = {
    emit: (eventName: string, data?: any) => {
      assetEventChannel();
      $eventChannel.value?.emit(eventName, data);
    },
    on: (eventName: string, callback: (data: any) => void) => {
      assetEventChannel();
      $eventChannel.value?.on(eventName, callback);
    },
    off: (eventName: string, callback?: (data: any) => void) => {
      assetEventChannel();
      $eventChannel.value?.off(eventName, callback);
    },
    once: (eventName: string, callback: (data: any) => void) => {
      assetEventChannel();
      $eventChannel.value?.once(eventName, callback);
    },
  };

  onMounted(() => {
    const instance = getCurrentInstance()?.proxy;
    $eventChannel.value = instance?.getOpenerEventChannel();
    effect?.(eventChannel);
  });

  return eventChannel;
};
