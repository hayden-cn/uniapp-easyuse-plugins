# uniapp-easyuse-plugins

## Usage

```typescript
import { defineConfig, registerPlugins } from "uniapp-easyuse-plugins";
import appPagesConfig from "@/pages.json";

export function createApp() {
  const app = createSSRApp(App);

  const appConfig = defineConfig({
    router: { appPagesConfig }
  })
  const { callInit } = registerPlugins(app, appConfig);
  callInit();
}

```

## AppConfig

```typescript
// appConfig 允许接收一个函数，函数接收 vue app 实例作为参数
// 支持的配置和使用方法示列
const appConfig = defineConfig((app) => {
  return {
    // 缓存配置
    cache: {
      prefix: 'app', // 缓存键名前缀
      delimiter: '-', // 缓存前缀与键名之间的分隔符，默认为短横线 '-'
    },

    // 初始化配置
    // 代替 App.vue 中的 onLoad 等方法
    // 初始化参数获取
    init: async () => {
      const $cache = app.config.globalProperties.$cache
      const $store = app.config.globalProperties.$store

      // 获取当前租户
      $store.tenantId = $cache.get('tenantId') ?? '1'

      let accessToken: string | undefined = undefined

      // 获取缓存的 accessToken
      accessToken = $cache.get(config.accessTokenCacheName)

      // 从 url 中获取 accessToken
      const { query } = uni.getLaunchOptionsSync()
      if (query.access_token) {
        accessToken = query.access_token
      }

      const $request = app.config.globalProperties.$request
      if (!accessToken) {
        // 如果没有访问令牌，则取消所有等待发出的请求
        $request.cancel()
      }

      $store.accessToken = accessToken
    },

    // 状态管理配置
    // 一个简易的全局状态管理
    store: {
      onUpdate(value, oldValue) {
        const $cache = app.config.globalProperties.$cache
        const $$router = app.config.globalProperties.$$router

        const { loginPageRoute } = $$router

        // 当访问令牌更新，缓存当前访问令牌
        const originalAccessToken = oldValue.accessToken
        const accessToken = value.accessToken
        if (accessToken != originalAccessToken) {
          $cache.set(config.accessTokenCacheName, accessToken)

          // 当访问令牌无效时，跳转到登录页面
          if (!accessToken) {
            uni.reLaunch({
              url: `/${loginPageRoute}`,
            })
          }
        }
      },
    },

    // 全局请求配置
    request: {
      baseURL: import.meta.env.APP_BASE_URL,
      interceptors: {
        request(options) {
          const $store = app.config.globalProperties.$store
          const { accessToken, tenantId } = $store

          if (accessToken) {
            options.header['Authorization'] ??= `Bearer ${accessToken}`
          }

          if (tenantId) {
            options.header['Tenant-Id'] ??= tenantId
          }

          return options
        },
        response(response) {
          // 统一处理响应数据，将返回数据进行解包
          const responseData = response.data as AnyObject
          response.data = responseData.data

          // 当 response.errMsg 不等于 'request:ok' 时，会视为请求错误
          // 可以根据 response 的状态码，响应数据等信息，设置 response.errMsg 阻止响应完成
          // response.errMsg = '自定义错误信息'

          return response
        },
      },
    },

    // 路由配置
    router: {
      // uniapp 页面配置信息
      // 推荐通过 `import appPagesConfig from "@/pages.json"` 获取
      appPagesConfig： appPagesConfig,

      // 路由前置守卫，路由导航前执行
      beforeEach(to) {
        // 通过修改 to.fullPath 来改变导航页面
        // 例如通过检查 token 是否有效，判断是否应该跳转登录页
        const $$router = app.config.globalProperties.$$router
        const $store = app.config.globalProperties.$store
        const accessToken = $store.accessToken
        const { loginPageRoute } = $$router

        if (to.needLogin && !accessToken) {
          const redirect = encodeURIComponent(to.fullPath)
          to.fullPath = `/${loginPageRoute}?redirect=${redirect}`
        }
        if (to.isLoginPage && accessToken) {
          to.fullPath = `/pages/demo/home`
        }
        if (to.isHomePage) {
          to.fullPath = `/pages/demo/home`
        }
      },

      // 路由后置守卫，路由导航后执行
      afterEach(to, from) {
        //
      }
    },
  }
});
```
