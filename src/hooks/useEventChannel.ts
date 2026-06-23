import { getCurrentInstance, onMounted, ref } from "vue";
import { getLoggingInstance } from "../logging/logging";

declare module "vue" {
  interface ComponentCustomProperties {
    getOpenerEventChannel: () => UniNamespace.EventChannel;
  }
}

export const useEventChannel = (
  effect?: (eventChannel: UniNamespace.EventChannel) => void,
): UniNamespace.EventChannel => {
  const $eventChannel = ref<UniNamespace.EventChannel>();

  const eventChannel = {
    emit: (eventName: string, data?: any) => {
      $eventChannel.value?.emit(eventName, data);
    },
    on: (eventName: string, callback: (data: any) => void) => {
      $eventChannel.value?.on(eventName, callback);
    },
    off: (eventName: string, callback?: (data: any) => void) => {
      $eventChannel.value?.off(eventName, callback);
    },
    once: (eventName: string, callback: (data: any) => void) => {
      $eventChannel.value?.once(eventName, callback);
    },
  };

  onMounted(() => {
    const instance = getCurrentInstance()?.proxy;
    $eventChannel.value = instance?.getOpenerEventChannel();
    if ($eventChannel.value) {
      effect?.(eventChannel);
    } else {
      getLoggingInstance().warn("[useEventChannel] 未获取到 eventChannel 实例");
    }
  });

  return eventChannel;
};
