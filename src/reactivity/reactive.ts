import { hasChanged, isArray, isObject } from '../utils'
import { trigger, track } from './effect'

const reactiveMap = new Map()

export function reactive(target: any) {
  // target要是'对象'
  if (!isObject(target)) return target
  // 已经被代理过 时
  if (isReactive(target)) return target
  // 处理a = reactive(obj),b = reactive(obj)问题
  if (reactiveMap.has(target)) return reactiveMap.get(target)

  const proxy: Record<string | number | symbol, any> = new Proxy(target, {
    get(target, key) {
      if (key === '__isReactive') return true

      track(target, key)
      const res = Reflect.get(target, key)
      // 解决深层对象obj{obj{}}代理问题
      return isObject(res) ? reactive(res) : res
    },
    set(target, key, newVal) {
      const oldLength = target.length
      const oldVal = Reflect.get(target, key)
      const res = Reflect.set(target, key, newVal)
      // 确保值发生改变再触发响应
      if (hasChanged(oldVal, newVal)) {
        trigger(target, key)
        // 解决数组问题
        if (isArray(target) && oldLength !== target.length) {
          trigger(target, 'length')
        }
      }

      return res
    }
  })
  reactiveMap.set(target, proxy)
  return proxy
}

// 处理reactive(reactive(obj))问题
export function isReactive(target: any) {
  return !!(target && target.__isReactive)
}
