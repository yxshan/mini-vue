/**
 * 从 '@/reactivity/effect' 模块导入 EffectFn 类型
 */
import { EffectFn } from '@/reactivity/effect'

/**
 * 任务队列，使用 Set 存储 EffectFn 类型的任务，确保任务的唯一性
 */
const jobQueue = new Set<EffectFn>()
/**
 * 预解析的 Promise 实例，用于异步操作
 */
const resolvePromise = Promise.resolve()
/**
 * 标记是否正在刷新任务队列，防止重复刷新
 */
let isFlushing = false
/**
 * 当前刷新操作的 Promise 实例，初始值为 null
 * @eslint-disable-next-line @typescript-eslint/no-unused-vars
 */
let currentFlushPromise = null

/**
 * 在下次 DOM 更新循环结束之后执行延迟回调。
 * 如果没有提供回调函数，则返回一个 Promise 对象。
 * @param fn - 可选的回调函数，将在下次 DOM 更新循环结束后执行
 * @returns 如果提供了 fn，则返回一个 Promise，在 fn 执行后解析；否则返回当前的 Promise
 */
export function nextTick(fn: any) {
  // 获取当前的刷新 Promise 或者预解析的 Promise
  const p = currentFlushPromise || resolvePromise
  // 如果提供了 fn，则在 Promise 解析后执行 fn，否则直接返回 Promise
  return fn ? p.then(fn) : p
}

/**
 * 将任务函数添加到任务队列中，并触发任务队列的刷新操作
 * @param fn - 要添加到任务队列的 EffectFn 类型的任务函数
 */
export function queueJob(fn: EffectFn) {
  // 将任务函数添加到任务队列中
  jobQueue.add(fn)
  // 触发任务队列的刷新操作
  flushJob()
}

/**
 * 刷新任务队列，依次执行队列中的所有任务函数
 */
export function flushJob() {
  // 如果正在刷新任务队列，则直接返回，避免重复刷新
  if (isFlushing) return
  // 标记为正在刷新任务队列
  isFlushing = true
  // 设置当前刷新操作的 Promise
  currentFlushPromise = resolvePromise
    .then(() => {
      // 遍历任务队列，依次执行每个任务函数
      jobQueue.forEach((fn) => fn())
    })
    .finally(() => {
      // 刷新完成后，标记为未刷新状态
      isFlushing = false
      // 清空任务队列
      jobQueue.clear()
      // 将当前刷新操作的 Promise 重置为 null
      currentFlushPromise = null
    })
}
