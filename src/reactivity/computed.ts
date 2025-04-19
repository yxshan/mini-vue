// 从 @/utils 模块导入 isFunction 函数，用于判断一个值是否为函数
import { isFunction } from '@/utils'
// 从 ./effect 模块导入 effect、track 函数，EffectFn 类型和 trigger 函数
import { effect, track, type EffectFn, trigger } from './effect'

/**
 * 计算属性选项类型，支持两种形式：
 * 1. 对象形式，包含 getter 和 setter 方法
 * 2. 函数形式，作为只读计算属性的 getter 方法
 */
type computedOptions =
  | { getter: () => any; setter: (newValue?: any) => void }
  | (() => any)

/**
 * 创建一个计算属性
 * @param computedOptions - 计算属性的配置选项，可以是一个函数或者一个包含 getter 和 setter 的对象
 * @returns 一个 ComputedImpl 实例
 */
export function computed(computedOptions: computedOptions) {
  // 定义 getter 函数
  let getter: () => any
  // 定义 setter 函数
  let setter: (newVal: any) => any

  // 判断 computedOptions 是否为函数
  if (isFunction(computedOptions)) {
    // 如果是函数，则将其作为 getter 函数
    getter = computedOptions as () => any
    // 定义一个警告提示的 setter 函数，用于只读计算属性
    setter = () => {
      console.warn('Write operation failed: computed value is readonly')
    }
  } else {
    // 如果是对象，则从对象中获取 getter 函数
    getter = computedOptions.getter
    // 如果是对象，则从对象中获取 setter 函数
    setter = computedOptions.setter
  }
  // 返回一个 ComputedImpl 实例
  return new ComputedImpl(getter, setter)
}

/**
 * 计算属性的实现类
 */
class ComputedImpl {
  // 存储计算属性的值
  __value: any
  // 标记计算属性是否需要重新计算
  dirty: boolean
  // 副作用函数实例
  effect: EffectFn
  // 存储 setter 函数
  _setter: (newVal?: any) => any

  /**
   * 构造函数
   * @param getter - 计算属性的 getter 函数
   * @param setter - 计算属性的 setter 函数
   */
  constructor(getter: () => any, setter: (newVal?: any) => any) {
    // 初始化计算属性的值为 undefined
    this.__value = undefined
    // 初始化标记为需要重新计算
    this.dirty = true
    // 存储 setter 函数
    this._setter = setter
    // 创建一个副作用函数实例
    this.effect = effect(getter, {
      // 延迟执行副作用函数
      lazy: true,
      // 调度器函数，当依赖变化时触发
      scheduler: () => {
        // 如果当前不需要重新计算
        if (!this.dirty) {
          // 标记为需要重新计算
          this.dirty = true
          // 触发依赖更新
          trigger(this, 'value')
        }
      }
    }) as EffectFn
  }

  /**
   * 获取计算属性的值
   * @returns 计算属性的值
   */
  get value() {
    // 如果需要重新计算
    if (this.dirty) {
      // 执行副作用函数，更新计算属性的值
      this.__value = this.effect() as EffectFn
      // 标记为不需要重新计算
      this.dirty = false
      // 收集依赖
      track(this, 'value')
    }
    // 返回计算属性的值
    return this.__value
  }

  /**
   * 设置计算属性的值
   * @param newVal - 新的值
   */
  set value(newVal) {
    // 调用存储的 setter 函数
    this._setter(newVal)
  }
}
