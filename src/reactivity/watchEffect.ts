// 从 './effect' 模块导入 effect 函数
import { effect } from './effect'

/**
 * 创建一个响应式的副作用函数，当它所依赖的响应式数据发生变化时会自动重新执行。
 * 
 * @param cb - 副作用函数，接收一个 `onInvalidate` 函数作为参数，用于注册清理函数。
 *             清理函数会在副作用函数重新执行之前或组件卸载时被调用。
 */
export function watchEffect(
  // 副作用回调函数，接收一个可选的 onInvalidate 函数作为参数
  cb: (onInvalidate?: (fn: () => void) => void) => void
) {
  // 定义清理函数，用于存储在副作用函数重新执行前需要执行的清理逻辑
  let cleanUp: () => void

  /**
   * 注册一个清理函数，该函数会在副作用函数重新执行之前或组件卸载时被调用。
   * 
   * @param fn - 要注册的清理函数。
   */
  function onInvalidate(fn: () => void) {
    // 将传入的清理函数赋值给 cleanUp 变量
    cleanUp = fn
  }

  // 创建一个副作用函数，传入回调函数和配置选项
  const effectFn = effect(() => cb(onInvalidate), {
    // 懒执行，即不会在创建时立即执行
    lazy: true,
    // 调度器函数，当依赖的数据发生变化时会调用该函数
    scheduler: () => {
      // 调用 job 函数
      job()
    }
  })

  /**
   * 执行副作用函数的更新逻辑，包括清理旧的副作用和执行新的副作用。
   */
  const job = () => {
    // 如果存在清理函数，则执行它
    if (cleanUp) cleanUp()
    // 重新执行副作用回调函数
    cb(onInvalidate)
  }

  // 手动执行一次副作用函数
  effectFn()
}
