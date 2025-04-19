/**
 * 从工具模块导入 hasChanged 和 isObject 函数
 * hasChanged 用于判断两个值是否发生变化
 * isObject 用于判断一个值是否为对象
 */
import { hasChanged, isObject } from '../utils'
/**
 * 从 reactive 模块导入 reactive 函数
 * reactive 用于创建响应式对象
 */
import { reactive } from './reactive'
/**
 * 从 effect 模块导入 track 和 trigger 函数
 * track 用于收集依赖
 * trigger 用于触发依赖
 */
import { track, trigger } from './effect'

/**
 * 创建一个响应式的引用对象
 * @param value - 要包装的值
 * @returns 如果传入的值已经是一个引用对象，则直接返回该对象；否则创建一个新的引用对象
 */
export function ref(value: any) {
  // 如果传入的值已经是一个引用对象，则直接返回该对象
  if (isRef(value)) return value
  // 否则创建一个新的引用对象
  return new RefImpl(value)
}

/**
 * 判断一个值是否为引用对象
 * @param value - 要判断的值
 * @returns 如果是引用对象则返回 true，否则返回 false
 */
export function isRef(value: any) {
  // 通过检查对象是否存在且具有 __isRef 属性来判断是否为引用对象
  return !!(value && value.__isRef)
}

/**
 * ref 实现类，用于创建响应式的引用对象
 */
// ref实现
class RefImpl {
  // 存储引用对象的值
  __value: any
  // 标记该对象是否为引用对象
  __isRef: boolean

  /**
   * 构造函数，初始化引用对象的值和标记
   * @param value - 要包装的值
   */
  constructor(value: any) {
    // 将传入的值转换为响应式对象（如果是对象的话）
    this.__value = conver(value)
    // 标记该对象为引用对象
    this.__isRef = true
  }

  /**
   * 获取引用对象的值，并收集依赖
   */
  get value() {
    // 收集依赖
    track(this, 'value')
    return this.__value
  }

  /**
   * 设置引用对象的值，如果值发生变化则触发依赖
   * @param newVal - 新的值
   */
  set value(newVal: any) {
    // 判断新值与旧值是否发生变化
    if (hasChanged(this.__value, newVal)) {
      // 将新值转换为响应式对象（如果是对象的话）
      this.__value = conver(newVal)
      // 触发依赖
      trigger(this, 'value')
    }
  }
}

/**
 * 将值转换为响应式对象（如果是对象的话）
 * @param value - 要转换的值
 * @returns 如果是对象则返回响应式对象，否则返回原值
 */
export function conver(value: any) {
  return isObject(value) ? reactive(value) : value
}
