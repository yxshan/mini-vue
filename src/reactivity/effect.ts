/**
 * 定义副作用函数类型
 * 副作用函数是一个可调用对象，包含依赖集合和可选的选项
 */
export type EffectFn = {
  // 调用签名，表示该函数可以被调用并返回任意类型的值
  (): any
  // 存储该副作用函数所依赖的所有依赖集合
  deps: Array<Set<EffectFn>>
  // 副作用函数的可选配置项
  options?: Option
}

/**
 * 定义副作用函数的配置选项接口
 */
interface Option {
  // 是否延迟执行副作用函数，默认为 false
  lazy?: boolean
  // 调度函数，用于自定义副作用函数的执行时机
  scheduler?: (fn: EffectFn) => any
}

// 记录当前正在执行的副作用函数
let activeEffect: EffectFn

/**
 * 存储副作用函数的桶结构
 * 用于建立对象属性与副作用函数之间的对应关系
 * 外层使用 WeakMap 存储目标对象，内层使用 Map 存储对象的属性，最内层使用 Set 存储依赖该属性的副作用函数
 */
const targetMap: WeakMap<object, Map<any, Set<EffectFn>>> = new WeakMap()

// 解决 effect 嵌套问题的栈结构，用于存储当前执行的副作用函数链
const effectStack: Array<EffectFn> = []

/**
 * 创建一个副作用函数
 * @param fn - 要执行的副作用函数
 * @param options - 可选的配置项
 * @returns 返回一个包装后的副作用函数
 */
export function effect(fn: () => any, options?: Option) {
  const effectFn = () => {
    // 清理副作用函数的依赖
    clean(effectFn)

    // 将当前副作用函数标记为正在执行的副作用函数
    activeEffect = effectFn
    // 将当前副作用函数压入栈中
    effectStack.push(effectFn)
    // 执行原始的副作用函数
    const res = fn()
    // 从栈中弹出当前副作用函数
    effectStack.pop()
    // 更新当前正在执行的副作用函数为栈顶元素
    activeEffect = effectStack[effectStack.length - 1]
    return res
  }
  // 初始化副作用函数的依赖集合
  effectFn.deps = [] as Array<Set<EffectFn>>
  // 设置副作用函数的配置选项
  effectFn.options = options
  // 如果不是延迟执行，则立即执行副作用函数
  if (!effectFn.options?.lazy) {
    effectFn()
  }
  // 设置副作用函数的调度函数
  effectFn.scheduler = effectFn.options?.scheduler
  return effectFn
}

/**
 * 清理副作用函数的依赖
 * @param effectFn - 要清理依赖的副作用函数
 */
function clean(effectFn: EffectFn) {
  // 遍历副作用函数的所有依赖集合，从每个集合中删除该副作用函数
  effectFn.deps?.forEach((deps) => deps.delete(effectFn))
}

/**
 * 追踪对象属性的访问，建立属性与副作用函数之间的依赖关系
 * @param target - 目标对象
 * @param key - 要追踪的属性名
 */
export function track(target: Record<string, any>, key: any) {
  // 如果当前没有正在执行的副作用函数，则直接返回
  if (!activeEffect) return
  // 获取目标对象对应的依赖映射
  let depsMap = targetMap.get(target)
  // 如果依赖映射不存在，则创建一个新的 Map 并存储到 targetMap 中
  if (!depsMap) targetMap.set(target, (depsMap = new Map()))
  // 获取属性对应的依赖集合
  let deps = depsMap.get(key)
  // 如果依赖集合不存在，则创建一个新的 Set 并存储到 depsMap 中
  if (!deps) depsMap.set(key, (deps = new Set()))
  // 将当前正在执行的副作用函数添加到依赖集合中
  deps.add(activeEffect)
}

/**
 * 触发对象属性的更新，执行依赖该属性的所有副作用函数
 * @param target - 目标对象
 * @param key - 触发更新的属性名
 */
export function trigger(target: Record<string, any>, key: any) {
  // 获取目标对象对应的依赖映射
  const depsMap = targetMap.get(target)
  // 如果依赖映射不存在，则直接返回
  if (!depsMap) return
  // 获取属性对应的依赖集合
  const deps = depsMap.get(key)
  // 如果依赖集合不存在，则直接返回
  if (!deps) return
  // 遍历依赖集合，执行每个副作用函数
  deps.forEach((effectFn) => {
    // 如果副作用函数有调度函数，则优先执行调度函数
    if (effectFn.options?.scheduler) {
      effectFn.options.scheduler(effectFn)
    } else {
      // 否则直接执行副作用函数
      effectFn()
    }
  })
}
