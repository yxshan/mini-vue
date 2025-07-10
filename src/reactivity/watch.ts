import { isFunction, isObject } from '../utils'
import { effect, type EffectFn } from './effect'
import { isRef } from './ref'

/**
 * 定义 watch 函数的选项类型
 */
export type watchOptions = {
  // 是否立即执行回调函数，默认为 false
  immediate?: boolean
  // 刷新时机，可选值，用于指定回调函数的执行时机
  flush?: string
}

/**
 * 修复 watch 函数实现
 */
export function watch(
  source: any, 
  cb: (
    oldVal?: any,
    newVal?: any,
    onInvalidate?: (fn: () => void) => void
  ) => void,
  options?: watchOptions
) {
  let getter: () => any
  let oldVal: any
  let newVal: any
  let cleanUp: () => void

  // 1. 修复源处理逻辑
  if (isRef(source)) {
    // 处理 ref 类型
    getter = () => source.value
  } else if (isFunction(source)) {
    // 处理函数类型
    getter = source as () => any
  } else if (isObject(source)) {
    // 处理响应式对象
    getter = () => traverse(source)
  } else {
    // 其他类型直接返回
    getter = () => source
  }

  // 2. 添加类型安全处理
  const effectFn: EffectFn = effect(() => getter(), {
    lazy: true,
    scheduler: () => {
      // 3. 修复调度器逻辑
      if (options?.flush === 'post') {
        Promise.resolve().then(job)
      } else {
        job()
      }
    }
  })

  /**
   * 注册清理函数
   */
  function onInvalidate(fn: () => any) {
    cleanUp = fn
  }

  /**
   * 执行回调的工作函数
   */
  const job = () => {
    // 4. 确保正确获取新旧值
    newVal = effectFn()
    if (cleanUp) cleanUp()
    cb(oldVal, newVal, onInvalidate)
    oldVal = newVal
  }

  // 5. 确保初始值正确设置
  oldVal = effectFn()

  // 立即执行选项
  if (options?.immediate) {
    job()
  }
}

/**
 * 递归遍历响应式对象
 */
export function traverse(value: any, seen: Set<any> = new Set()): any {
  // 6. 添加对 ref 的处理
  if (isRef(value)) {
    return traverse(value.value, seen)
  }

  if (!isObject(value) || value == null || seen.has(value)) {
    return value
  }

  seen.add(value)

  for (const key in value) {
    traverse(value[key], seen)
  }

  return value
}
