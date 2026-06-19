import { defineBuildConfig } from "unbuild";

export default defineBuildConfig({
  entries: ["src/index"],
  declaration: true,
  clean: true,
  rollup: {
    emitCJS: true,
    esbuild: {
      target: "es2020",
    },
  },
  externals: ["@dcloudio/uni-app", "@dcloudio/uni-shared", "@vue/shared"],
});
