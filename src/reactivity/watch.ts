// 从 @/utils 模块导入 isFunction 函数，用于判断一个值是否为函数
import { isFunction } from '@/utils'
// 从 './effect' 模块导入 effect 函数和 EffectFn 类型
import { effect, type EffectFn } from './effect'

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
 * 监听一个数据源的变化，并在变化时执行回调函数
 * @param souce - 要监听的数据源，可以是一个对象或一个函数
 * @param cb - 数据源变化时执行的回调函数，接收旧值、新值和一个用于注册清理函数的函数
 * @param options - 可选配置项，包含 immediate 和 flush 选项
 */
export function watch(
  souce: Record<string, any> | (() => any),
  cb: (
    // 旧值，可选参数
    oldVal?: any,
    // 新值，可选参数
    newVal?: any,
    // 用于注册清理函数的函数，可选参数
    onInvalidate?: (fn: () => void) => void
  ) => void,
  // 可选的配置选项
  options?: watchOptions
) {
  // 定义一个 getter 函数，用于获取数据源的值
  let getter: () => any
  // 存储旧值
  let oldVal: any
  // 存储新值
  let newVal: any
  // 存储清理函数
  let cleanUp: () => void

  // 如果数据源是一个函数，则直接将其作为 getter 函数
  if (isFunction(souce)) {
    getter = souce as () => any
  } else {
    // 否则，使用 traverse 函数遍历数据源作为 getter 函数
    getter = () => traverse(souce)
  }

  // 创建一个副作用函数
  const effectFn: EffectFn = effect(() => getter, {
    // 懒执行，不会立即执行副作用函数
    lazy: true,
    // 调度器函数，用于控制副作用函数的执行时机
    scheduler: () => {
      // 如果配置选项中的 flush 为 'post'，则在微任务队列中执行 job 函数
      if (options?.flush === 'post') {
        Promise.resolve().then(job)
      } else {
        // 否则，直接执行 job 函数
        job()
      }
    }
  })

  /**
   * 注册清理函数
   * @param fn - 清理函数
   */
  function onInvalidate(fn: () => any) {
    // 将传入的清理函数赋值给 cleanUp 变量
    cleanUp = fn
  }

  /**
   * 执行回调函数的工作函数
   */
  const job = () => {
    // 执行副作用函数，获取新值
    newVal = effectFn()
    // 如果存在清理函数，则执行清理函数
    if (cleanUp) cleanUp()
    // 执行回调函数，传入旧值、新值和 onInvalidate 函数
    cb(oldVal, newVal, onInvalidate)
    // 将新值赋值给旧值，为下一次变化做准备
    oldVal = newVal
  }

  // 如果配置选项中的 immediate 为 true，则立即执行 job 函数
  if (options?.immediate) {
    job()
  } else {
    // 否则，先执行副作用函数，获取初始值并赋值给旧值
    oldVal = effectFn()
  }
}

/**
 * 递归遍历一个对象，用于收集对象的所有属性
 * @param value - 要遍历的值
 * @param seen - 用于记录已经遍历过的对象，避免循环引用，默认为一个新的 Set 实例
 * @returns 遍历后的原始值
 */
export function traverse(value: any, seen: Set<any> = new Set()) {
  // 如果值不是对象、为 null 或者已经在 seen 集合中，则直接返回
  if (typeof value !== 'object' || value == null || seen.has(value)) return
  // 将当前值添加到 seen 集合中
  seen.add(value)

  // 遍历对象的所有属性，并递归调用 traverse 函数
  for (const k in value) {
    traverse(value[k], seen)
  }
  // 返回原始值
  return value
}
