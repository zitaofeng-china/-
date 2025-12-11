/**
 * WebAssembly模块类型声明
 * 为WebAssembly文件提供TypeScript类型支持
 */
declare module '*.wasm' {
  const url: string
  export default url
}

